import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import type {
  AcquisitionArtifactIdentity,
  MovieReturnCallerArtifactIdentity,
  RentalArtifactIdentity,
} from "@neonretrorewind/core";

import type {
  BlueprintCallerBodiesArtifact,
  BlueprintCallSitesArtifact,
} from "./blueprint-caller-inputs.ts";
import { compileConsoleReturnMechanics } from "./console-return-mechanics.ts";
import { compileFilmCatalog } from "./film-catalog.ts";
import { writeImmutableArtifact } from "./immutable-artifact.ts";
import { compileMembershipFeeMechanics } from "./membership-fee-mechanics.ts";
import {
  compileMovieReturnMechanics,
  type MovieReturnSources,
} from "./movie-return-mechanics.ts";
import { validateJsonSchema } from "./schema-validation.ts";
import type {
  RentalBlueprintBodiesArtifact,
  RentalEvidenceArtifact,
} from "./rental-inputs.ts";
import type { RentalMechanicSources } from "./rental-mechanic-evidence.ts";
import type { StructuredValuesArtifact } from "./structured-values.ts";

const invalidArgumentsExitCode = 2;
const inputFailureExitCode = 6;
const outputConflictExitCode = 7;

interface FilmCatalogOptions {
  readonly inputPath: string;
  readonly inputSchemaPath: string;
  readonly outputPath: string;
}

interface ConsoleReturnOptions {
  readonly rentalEvidencePath: string;
  readonly rentalEvidenceSchemaPath: string;
  readonly blueprintBodiesPath: string;
  readonly blueprintBodiesSchemaPath: string;
  readonly outputPath: string;
}

interface MovieReturnOptions extends ConsoleReturnOptions {
  readonly callSitesPath: string;
  readonly callSitesSchemaPath: string;
  readonly callerBodiesPath: string;
  readonly callerBodiesSchemaPath: string;
}

interface RentalMechanicCommand {
  readonly name: string;
  readonly outputLabel: string;
  readonly failureLabel: string;
  readonly compile: (
    rentalEvidence: RentalEvidenceArtifact,
    blueprintBodies: RentalBlueprintBodiesArtifact,
    sources: RentalMechanicSources,
  ) => object;
}

await main(process.argv.slice(2));

async function main(arguments_: readonly string[]): Promise<void> {
  if (arguments_.length === 1 && ["--help", "-h"].includes(arguments_[0] ?? "")) {
    writeUsage(process.stdout);
    return;
  }

  if (arguments_[0] === "console-return-mechanics") {
    await runRentalMechanic(arguments_.slice(1), {
      name: "console-return-mechanics",
      outputLabel: "Console return mechanics",
      failureLabel: "Console-return-mechanics compilation",
      compile: compileConsoleReturnMechanics,
    });
    return;
  }

  if (arguments_[0] === "membership-fee-mechanics") {
    await runRentalMechanic(arguments_.slice(1), {
      name: "membership-fee-mechanics",
      outputLabel: "Membership fee mechanics",
      failureLabel: "Membership-fee-mechanics compilation",
      compile: compileMembershipFeeMechanics,
    });
    return;
  }

  if (arguments_[0] === "movie-return-mechanics") {
    await runMovieReturnMechanic(arguments_.slice(1));
    return;
  }

  if (arguments_[0] !== "film-catalog") {
    console.error(
      "Expected the film-catalog, console-return-mechanics, membership-fee-mechanics, or movie-return-mechanics command.",
    );
    writeUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  const options = parseFilmCatalogOptions(arguments_.slice(1));
  if (typeof options === "string") {
    console.error(options);
    writeUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const inputBytes = await readFile(options.inputPath);
    const inputHash = sha256(inputBytes);
    const input = parseJson(inputBytes, "Structured-values input");
    const inputSchema = parseJson(
      await readFile(options.inputSchemaPath),
      "Structured-values schema",
    );
    assertObject(inputSchema, "Structured-values schema");
    validateJsonSchema(input, inputSchema, "Structured-values input");

    const structuredValues = input as StructuredValuesArtifact;
    const source: AcquisitionArtifactIdentity = {
      fileName: basename(options.inputPath),
      sha256: inputHash,
      sizeBytes: inputBytes.length,
      artifactType: "structured-values",
      schemaVersion: 1,
    };
    const catalog = compileFilmCatalog(structuredValues, source);
    const output = `${JSON.stringify(catalog, undefined, 2)}\n`;

    const finalInputBytes = await readFile(options.inputPath);
    if (finalInputBytes.length !== inputBytes.length || sha256(finalInputBytes) !== inputHash) {
      throw new Error("Structured-values input changed during compilation.");
    }

    const status = await writeImmutableArtifact(options.outputPath, output);
    if (status === "conflict") {
      console.error(`Film catalog conflicts with existing output: ${options.outputPath}`);
      process.exitCode = outputConflictExitCode;
      return;
    }

    const verb = status === "created" ? "wrote" : "is unchanged";
    console.log(`Film catalog ${verb}: ${options.outputPath}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown failure.";
    console.error(`Film-catalog compilation failed: ${message}`);
    process.exitCode = inputFailureExitCode;
  }
}

async function runRentalMechanic(
  arguments_: readonly string[],
  command: RentalMechanicCommand,
): Promise<void> {
  const options = parseRentalMechanicOptions(arguments_, command.name);
  if (typeof options === "string") {
    console.error(options);
    writeUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const rentalBytes = await readFile(options.rentalEvidencePath);
    const bodyBytes = await readFile(options.blueprintBodiesPath);
    const rentalHash = sha256(rentalBytes);
    const bodyHash = sha256(bodyBytes);
    const rentalInput = parseJson(rentalBytes, "Rental-evidence input");
    const bodyInput = parseJson(bodyBytes, "Rental Blueprint-body input");
    const rentalSchema = parseJson(
      await readFile(options.rentalEvidenceSchemaPath),
      "Rental-evidence schema",
    );
    const bodySchema = parseJson(
      await readFile(options.blueprintBodiesSchemaPath),
      "Rental Blueprint-body schema",
    );
    assertObject(rentalSchema, "Rental-evidence schema");
    assertObject(bodySchema, "Rental Blueprint-body schema");
    validateJsonSchema(rentalInput, rentalSchema, "Rental-evidence input");
    validateJsonSchema(bodyInput, bodySchema, "Rental Blueprint-body input");

    const sources = {
      rentalEvidence: createRentalIdentity(
        options.rentalEvidencePath,
        rentalBytes,
        rentalHash,
        "rental-evidence",
      ),
      rentalBlueprintBodies: createRentalIdentity(
        options.blueprintBodiesPath,
        bodyBytes,
        bodyHash,
        "rental-blueprint-bodies",
      ),
    } as const;
    const mechanics = command.compile(
      rentalInput as RentalEvidenceArtifact,
      bodyInput as RentalBlueprintBodiesArtifact,
      sources,
    );
    const output = `${JSON.stringify(mechanics, undefined, 2)}\n`;

    await assertFileUnchanged(options.rentalEvidencePath, rentalBytes.length, rentalHash);
    await assertFileUnchanged(options.blueprintBodiesPath, bodyBytes.length, bodyHash);

    const status = await writeImmutableArtifact(options.outputPath, output);
    if (status === "conflict") {
      console.error(`${command.outputLabel} conflict with existing output: ${options.outputPath}`);
      process.exitCode = outputConflictExitCode;
      return;
    }

    const verb = status === "created" ? "wrote" : "is unchanged";
    console.log(`${command.outputLabel} ${verb}: ${options.outputPath}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown failure.";
    console.error(`${command.failureLabel} failed: ${message}`);
    process.exitCode = inputFailureExitCode;
  }
}

async function runMovieReturnMechanic(arguments_: readonly string[]): Promise<void> {
  const options = parseRentalMechanicOptions(
    arguments_,
    "movie-return-mechanics",
    true,
  );
  if (typeof options === "string") {
    console.error(options);
    writeUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const rentalBytes = await readFile(options.rentalEvidencePath);
    const bodyBytes = await readFile(options.blueprintBodiesPath);
    const callSiteBytes = await readFile(options.callSitesPath);
    const callerBodyBytes = await readFile(options.callerBodiesPath);
    const rentalHash = sha256(rentalBytes);
    const bodyHash = sha256(bodyBytes);
    const callSiteHash = sha256(callSiteBytes);
    const callerBodyHash = sha256(callerBodyBytes);
    const rentalInput = parseJson(rentalBytes, "Rental-evidence input");
    const bodyInput = parseJson(bodyBytes, "Rental Blueprint-body input");
    const callSiteInput = parseJson(callSiteBytes, "Blueprint call-site input");
    const callerBodyInput = parseJson(callerBodyBytes, "Blueprint caller-body input");
    const inputs = [
      [rentalInput, options.rentalEvidenceSchemaPath, "Rental-evidence"],
      [bodyInput, options.blueprintBodiesSchemaPath, "Rental Blueprint-body"],
      [callSiteInput, options.callSitesSchemaPath, "Blueprint call-site"],
      [callerBodyInput, options.callerBodiesSchemaPath, "Blueprint caller-body"],
    ] as const;
    for (const [input, schemaPath, label] of inputs) {
      const schema = parseJson(await readFile(schemaPath), `${label} schema`);
      assertObject(schema, `${label} schema`);
      validateJsonSchema(input, schema, `${label} input`);
    }

    const sources: MovieReturnSources = {
      rentalEvidence: createRentalIdentity(
        options.rentalEvidencePath,
        rentalBytes,
        rentalHash,
        "rental-evidence",
      ),
      rentalBlueprintBodies: createRentalIdentity(
        options.blueprintBodiesPath,
        bodyBytes,
        bodyHash,
        "rental-blueprint-bodies",
      ),
      blueprintCallSites: createCallerIdentity(
        options.callSitesPath,
        callSiteBytes,
        callSiteHash,
        "blueprint-call-sites",
      ),
      blueprintCallerBodies: createCallerIdentity(
        options.callerBodiesPath,
        callerBodyBytes,
        callerBodyHash,
        "blueprint-caller-bodies",
      ),
    };
    const mechanics = compileMovieReturnMechanics(
      rentalInput as RentalEvidenceArtifact,
      bodyInput as RentalBlueprintBodiesArtifact,
      callSiteInput as BlueprintCallSitesArtifact,
      callerBodyInput as BlueprintCallerBodiesArtifact,
      sources,
    );
    const output = `${JSON.stringify(mechanics, undefined, 2)}\n`;

    await Promise.all([
      assertFileUnchanged(options.rentalEvidencePath, rentalBytes.length, rentalHash),
      assertFileUnchanged(options.blueprintBodiesPath, bodyBytes.length, bodyHash),
      assertFileUnchanged(options.callSitesPath, callSiteBytes.length, callSiteHash),
      assertFileUnchanged(options.callerBodiesPath, callerBodyBytes.length, callerBodyHash),
    ]);

    const status = await writeImmutableArtifact(options.outputPath, output);
    if (status === "conflict") {
      console.error(`Movie return mechanics conflict with existing output: ${options.outputPath}`);
      process.exitCode = outputConflictExitCode;
      return;
    }

    const verb = status === "created" ? "wrote" : "is unchanged";
    console.log(`Movie return mechanics ${verb}: ${options.outputPath}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown failure.";
    console.error(`Movie-return-mechanics compilation failed: ${message}`);
    process.exitCode = inputFailureExitCode;
  }
}

function parseFilmCatalogOptions(
  arguments_: readonly string[],
): FilmCatalogOptions | string {
  const values = new Map<string, string>();
  const allowed = new Set(["--input", "--input-schema", "--output"]);

  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !allowed.has(name)) {
      return `Unknown film-catalog option ${name ?? "<missing>"}.`;
    }
    if (value === undefined || value.startsWith("--")) {
      return `Expected a value for ${name}.`;
    }
    if (values.has(name)) {
      return `Option ${name} was provided more than once.`;
    }

    values.set(name, value);
  }

  const inputPath = values.get("--input");
  const inputSchemaPath = values.get("--input-schema");
  const outputPath = values.get("--output");
  if (inputPath === undefined || inputSchemaPath === undefined || outputPath === undefined) {
    return "Expected --input, --input-schema, and --output.";
  }

  return { inputPath, inputSchemaPath, outputPath };
}

function parseRentalMechanicOptions(
  arguments_: readonly string[],
  commandName: string,
  callerInputs: true,
): MovieReturnOptions | string;
function parseRentalMechanicOptions(
  arguments_: readonly string[],
  commandName: string,
  callerInputs?: false,
): ConsoleReturnOptions | string;
function parseRentalMechanicOptions(
  arguments_: readonly string[],
  commandName: string,
  callerInputs = false,
): ConsoleReturnOptions | MovieReturnOptions | string {
  const values = new Map<string, string>();
  const allowed = new Set([
    "--rental-evidence",
    "--rental-evidence-schema",
    "--blueprint-bodies",
    "--blueprint-bodies-schema",
    "--output",
  ]);
  if (callerInputs) {
    allowed.add("--call-sites");
    allowed.add("--call-sites-schema");
    allowed.add("--caller-bodies");
    allowed.add("--caller-bodies-schema");
  }

  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !allowed.has(name)) {
      return `Unknown ${commandName} option ${name ?? "<missing>"}.`;
    }
    if (value === undefined || value.startsWith("--")) {
      return `Expected a value for ${name}.`;
    }
    if (values.has(name)) {
      return `Option ${name} was provided more than once.`;
    }
    values.set(name, value);
  }

  const rentalEvidencePath = values.get("--rental-evidence");
  const rentalEvidenceSchemaPath = values.get("--rental-evidence-schema");
  const blueprintBodiesPath = values.get("--blueprint-bodies");
  const blueprintBodiesSchemaPath = values.get("--blueprint-bodies-schema");
  const callSitesPath = values.get("--call-sites");
  const callSitesSchemaPath = values.get("--call-sites-schema");
  const callerBodiesPath = values.get("--caller-bodies");
  const callerBodiesSchemaPath = values.get("--caller-bodies-schema");
  const outputPath = values.get("--output");
  if (
    rentalEvidencePath === undefined ||
    rentalEvidenceSchemaPath === undefined ||
    blueprintBodiesPath === undefined ||
    blueprintBodiesSchemaPath === undefined ||
    outputPath === undefined ||
    (callerInputs &&
      (callSitesPath === undefined ||
        callSitesSchemaPath === undefined ||
        callerBodiesPath === undefined ||
        callerBodiesSchemaPath === undefined))
  ) {
    return callerInputs
      ? "Expected both rental inputs, both caller inputs, their four schemas, and --output."
      : "Expected both rental inputs, both schemas, and --output.";
  }

  const rentalOptions: ConsoleReturnOptions = {
    rentalEvidencePath,
    rentalEvidenceSchemaPath,
    blueprintBodiesPath,
    blueprintBodiesSchemaPath,
    outputPath,
  };
  return callerInputs
    ? {
        ...rentalOptions,
        callSitesPath: callSitesPath!,
        callSitesSchemaPath: callSitesSchemaPath!,
        callerBodiesPath: callerBodiesPath!,
        callerBodiesSchemaPath: callerBodiesSchemaPath!,
      }
    : rentalOptions;
}

function createRentalIdentity(
  path: string,
  bytes: Uint8Array,
  hash: string,
  artifactType: RentalArtifactIdentity["artifactType"],
): RentalArtifactIdentity {
  return {
    fileName: basename(path),
    sha256: hash,
    sizeBytes: bytes.length,
    artifactType,
    schemaVersion: 1,
  };
}

function createCallerIdentity<
  ArtifactType extends MovieReturnCallerArtifactIdentity["artifactType"],
>(
  path: string,
  bytes: Uint8Array,
  hash: string,
  artifactType: ArtifactType,
): MovieReturnCallerArtifactIdentity<ArtifactType> {
  return {
    fileName: basename(path),
    sha256: hash,
    sizeBytes: bytes.length,
    artifactType,
    schemaVersion: 1,
  };
}

async function assertFileUnchanged(
  path: string,
  expectedSize: number,
  expectedHash: string,
): Promise<void> {
  const finalBytes = await readFile(path);
  if (finalBytes.length !== expectedSize || sha256(finalBytes) !== expectedHash) {
    throw new Error(`Input changed during compilation: ${path}`);
  }
}

function parseJson(bytes: Uint8Array, label: string): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

function assertObject(value: unknown, label: string): asserts value is object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function writeUsage(stream: NodeJS.WritableStream): void {
  stream.write("Usage:\n");
  stream.write(
    "  neonretrorewind-data-compiler film-catalog --input <structured-values> --input-schema <schema> --output <film-catalog>\n",
  );
  stream.write(
    "  neonretrorewind-data-compiler console-return-mechanics --rental-evidence <path> --rental-evidence-schema <schema> --blueprint-bodies <path> --blueprint-bodies-schema <schema> --output <path>\n",
  );
  stream.write(
    "  neonretrorewind-data-compiler membership-fee-mechanics --rental-evidence <path> --rental-evidence-schema <schema> --blueprint-bodies <path> --blueprint-bodies-schema <schema> --output <path>\n",
  );
  stream.write(
    "  neonretrorewind-data-compiler movie-return-mechanics --rental-evidence <path> --rental-evidence-schema <schema> --blueprint-bodies <path> --blueprint-bodies-schema <schema> --call-sites <path> --call-sites-schema <schema> --caller-bodies <path> --caller-bodies-schema <schema> --output <path>\n",
  );
}
