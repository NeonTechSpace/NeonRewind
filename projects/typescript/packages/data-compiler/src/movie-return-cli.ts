import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import type {
  MovieReturnArtifactIdentity,
  RentalArtifactIdentity,
} from "@neonretrorewind/core";

import type {
  BlueprintCallerBodiesArtifact,
  BlueprintCallSitesArtifact,
} from "./blueprint-caller-inputs.ts";
import type {
  BlueprintFunctionTraceArtifact,
  RentalFunctionTraceArtifact,
} from "./blueprint-trace-inputs.ts";
import { writeImmutableArtifact } from "./immutable-artifact.ts";
import {
  compileMovieReturnMechanics,
  type MovieReturnSources,
} from "./movie-return-mechanics.ts";
import type {
  RentalBlueprintBodiesArtifact,
  RentalEvidenceArtifact,
} from "./rental-inputs.ts";
import { validateJsonSchema } from "./schema-validation.ts";

const invalidArgumentsExitCode = 2;
const inputFailureExitCode = 6;
const outputConflictExitCode = 7;

interface MovieReturnOptions {
  readonly rentalEvidencePath: string;
  readonly rentalEvidenceSchemaPath: string;
  readonly blueprintBodiesPath: string;
  readonly blueprintBodiesSchemaPath: string;
  readonly callSitesPath: string;
  readonly callSitesSchemaPath: string;
  readonly callerBodiesPath: string;
  readonly callerBodiesSchemaPath: string;
  readonly functionTracePath: string;
  readonly functionTraceSchemaPath: string;
  readonly rentalFunctionTracePath: string;
  readonly rentalFunctionTraceSchemaPath: string;
  readonly outputPath: string;
}

export async function runMovieReturnMechanic(
  arguments_: readonly string[],
): Promise<void> {
  const options = parseOptions(arguments_);
  if (typeof options === "string") {
    console.error(options);
    writeMovieReturnUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const inputs = await readInputs(options);
    await validateInputs(inputs, options);
    const sources = createSources(inputs);
    const mechanics = compileMovieReturnMechanics(
      inputs.rental.value as RentalEvidenceArtifact,
      inputs.bodies.value as RentalBlueprintBodiesArtifact,
      inputs.callSites.value as BlueprintCallSitesArtifact,
      inputs.callerBodies.value as BlueprintCallerBodiesArtifact,
      inputs.functionTrace.value as BlueprintFunctionTraceArtifact,
      inputs.rentalFunctionTrace.value as RentalFunctionTraceArtifact,
      sources,
    );
    const output = `${JSON.stringify(mechanics, undefined, 2)}\n`;

    await Promise.all(Object.values(inputs).map((input) =>
      assertFileUnchanged(input.path, input.bytes.length, input.sha256)));

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

export function writeMovieReturnUsage(stream: NodeJS.WritableStream): void {
  stream.write(
    "  neonretrorewind-data-compiler movie-return-mechanics --rental-evidence <path> --rental-evidence-schema <schema> --blueprint-bodies <path> --blueprint-bodies-schema <schema> --call-sites <path> --call-sites-schema <schema> --caller-bodies <path> --caller-bodies-schema <schema> --function-trace <path> --function-trace-schema <schema> --rental-function-trace <path> --rental-function-trace-schema <schema> --output <path>\n",
  );
}

async function readInputs(options: MovieReturnOptions) {
  const readInput = async (path: string, name: string): Promise<InputFile> => {
    const bytes = await readFile(path);
    return {
      path,
      bytes,
      sha256: sha256(bytes),
      value: parseJson(bytes, `${name} input`),
    };
  };
  const [rental, bodies, callSites, callerBodies, functionTrace, rentalFunctionTrace] = await Promise.all([
    readInput(options.rentalEvidencePath, "Rental-evidence"),
    readInput(options.blueprintBodiesPath, "Rental Blueprint-body"),
    readInput(options.callSitesPath, "Blueprint call-site"),
    readInput(options.callerBodiesPath, "Blueprint caller-body"),
    readInput(options.functionTracePath, "Blueprint function trace"),
    readInput(options.rentalFunctionTracePath, "Rental function trace"),
  ]);
  return { rental, bodies, callSites, callerBodies, functionTrace, rentalFunctionTrace };
}

async function validateInputs(
  inputs: Awaited<ReturnType<typeof readInputs>>,
  options: MovieReturnOptions,
): Promise<void> {
  const schemas = [
    [inputs.rental, options.rentalEvidenceSchemaPath, "Rental-evidence"],
    [inputs.bodies, options.blueprintBodiesSchemaPath, "Rental Blueprint-body"],
    [inputs.callSites, options.callSitesSchemaPath, "Blueprint call-site"],
    [inputs.callerBodies, options.callerBodiesSchemaPath, "Blueprint caller-body"],
    [inputs.functionTrace, options.functionTraceSchemaPath, "Blueprint function trace"],
    [
      inputs.rentalFunctionTrace,
      options.rentalFunctionTraceSchemaPath,
      "Rental function trace",
    ],
  ] as const;
  for (const [input, schemaPath, label] of schemas) {
    const schema = parseJson(await readFile(schemaPath), `${label} schema`);
    assertObject(schema, `${label} schema`);
    validateJsonSchema(input.value, schema, `${label} input`);
  }
}

function createSources(
  inputs: Awaited<ReturnType<typeof readInputs>>,
): MovieReturnSources {
  return {
    rentalEvidence: createRentalIdentity(inputs.rental, "rental-evidence"),
    rentalBlueprintBodies: createRentalIdentity(inputs.bodies, "rental-blueprint-bodies"),
    blueprintCallSites: createMovieIdentity(inputs.callSites, "blueprint-call-sites", 1),
    blueprintCallerBodies: createMovieIdentity(inputs.callerBodies, "blueprint-caller-bodies", 1),
    blueprintFunctionTrace: createMovieIdentity(
      inputs.functionTrace,
      "blueprint-function-trace",
      2,
    ),
    rentalFunctionTrace: createMovieIdentity(
      inputs.rentalFunctionTrace,
      "rental-function-trace",
      1,
    ),
  };
}

function createRentalIdentity(
  input: InputFile,
  artifactType: RentalArtifactIdentity["artifactType"],
): RentalArtifactIdentity {
  return {
    fileName: basename(input.path),
    sha256: input.sha256,
    sizeBytes: input.bytes.length,
    artifactType,
    schemaVersion: 1,
  };
}

function createMovieIdentity<
  ArtifactType extends MovieReturnArtifactIdentity["artifactType"],
>(
  input: InputFile,
  artifactType: ArtifactType,
  schemaVersion: MovieReturnArtifactIdentity<ArtifactType>["schemaVersion"],
): MovieReturnArtifactIdentity<ArtifactType> {
  return {
    fileName: basename(input.path),
    sha256: input.sha256,
    sizeBytes: input.bytes.length,
    artifactType,
    schemaVersion,
  };
}

function parseOptions(arguments_: readonly string[]): MovieReturnOptions | string {
  const names = [
    "--rental-evidence",
    "--rental-evidence-schema",
    "--blueprint-bodies",
    "--blueprint-bodies-schema",
    "--call-sites",
    "--call-sites-schema",
    "--caller-bodies",
    "--caller-bodies-schema",
    "--function-trace",
    "--function-trace-schema",
    "--rental-function-trace",
    "--rental-function-trace-schema",
    "--output",
  ] as const;
  const allowed = new Set<string>(names);
  const values = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !allowed.has(name)) {
      return `Unknown movie-return-mechanics option ${name ?? "<missing>"}.`;
    }
    if (value === undefined || value.startsWith("--")) {
      return `Expected a value for ${name}.`;
    }
    if (values.has(name)) {
      return `Option ${name} was provided more than once.`;
    }
    values.set(name, value);
  }
  const missing = names.filter((name) => !values.has(name));
  if (missing.length > 0) {
    return `Expected all movie-return inputs and schemas, missing ${missing.join(", ")}.`;
  }
  return {
    rentalEvidencePath: values.get("--rental-evidence")!,
    rentalEvidenceSchemaPath: values.get("--rental-evidence-schema")!,
    blueprintBodiesPath: values.get("--blueprint-bodies")!,
    blueprintBodiesSchemaPath: values.get("--blueprint-bodies-schema")!,
    callSitesPath: values.get("--call-sites")!,
    callSitesSchemaPath: values.get("--call-sites-schema")!,
    callerBodiesPath: values.get("--caller-bodies")!,
    callerBodiesSchemaPath: values.get("--caller-bodies-schema")!,
    functionTracePath: values.get("--function-trace")!,
    functionTraceSchemaPath: values.get("--function-trace-schema")!,
    rentalFunctionTracePath: values.get("--rental-function-trace")!,
    rentalFunctionTraceSchemaPath: values.get("--rental-function-trace-schema")!,
    outputPath: values.get("--output")!,
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

interface InputFile {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly sha256: string;
  readonly value: unknown;
}
