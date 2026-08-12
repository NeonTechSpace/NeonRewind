import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import {
  assertArtifactContract,
  BlueprintCallerBodiesSchema,
  BlueprintCallSitesSchema,
  BlueprintFunctionTraceSchema,
  RentalBlueprintBodiesSchema,
  RentalEvidenceSchema,
  RentalFunctionTraceSchema,
  type MovieReturnArtifactIdentity,
  type RentalArtifactIdentity,
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

const invalidArgumentsExitCode = 2;
const inputFailureExitCode = 6;
const outputConflictExitCode = 7;

interface MovieReturnOptions {
  readonly rentalEvidencePath: string;
  readonly blueprintBodiesPath: string;
  readonly callSitesPath: string;
  readonly callerBodiesPath: string;
  readonly functionTracePath: string;
  readonly rentalFunctionTracePath: string;
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
    const sources = createSources(inputs);
    const mechanics = compileMovieReturnMechanics(
      assertArtifactContract(
        RentalEvidenceSchema,
        inputs.rental.value,
        "Rental-evidence input",
      ),
      assertArtifactContract(
        RentalBlueprintBodiesSchema,
        inputs.bodies.value,
        "Rental Blueprint-body input",
      ),
      assertArtifactContract(
        BlueprintCallSitesSchema,
        inputs.callSites.value,
        "Blueprint call-site input",
      ),
      assertArtifactContract(
        BlueprintCallerBodiesSchema,
        inputs.callerBodies.value,
        "Blueprint caller-body input",
      ),
      assertArtifactContract(
        BlueprintFunctionTraceSchema,
        inputs.functionTrace.value,
        "Blueprint function trace input",
      ),
      assertArtifactContract(
        RentalFunctionTraceSchema,
        inputs.rentalFunctionTrace.value,
        "Rental function trace input",
      ),
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
    "  neonretrorewind-data-compiler movie-return-mechanics --rental-evidence <path> --blueprint-bodies <path> --call-sites <path> --caller-bodies <path> --function-trace <path> --rental-function-trace <path> --output <path>\n",
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

function createSources(
  inputs: Awaited<ReturnType<typeof readInputs>>,
): MovieReturnSources {
  return {
    rentalEvidence: createRentalIdentity(inputs.rental, "rental-evidence"),
    rentalBlueprintBodies: createRentalIdentity(inputs.bodies, "rental-blueprint-bodies"),
    blueprintCallSites: createMovieIdentity(inputs.callSites, "blueprint-call-sites"),
    blueprintCallerBodies: createMovieIdentity(inputs.callerBodies, "blueprint-caller-bodies"),
    blueprintFunctionTrace: createMovieIdentity(
      inputs.functionTrace,
      "blueprint-function-trace",
    ),
    rentalFunctionTrace: createMovieIdentity(
      inputs.rentalFunctionTrace,
      "rental-function-trace",
    ),
  };
}

function createRentalIdentity<
  ArtifactType extends RentalArtifactIdentity["artifactType"],
>(
  input: InputFile,
  artifactType: ArtifactType,
): RentalArtifactIdentity<ArtifactType> {
  return {
    fileName: basename(input.path),
    sha256: input.sha256,
    sizeBytes: input.bytes.length,
    artifactType,
  } as RentalArtifactIdentity<ArtifactType>;
}

function createMovieIdentity<
  ArtifactType extends MovieReturnArtifactIdentity["artifactType"],
>(
  input: InputFile,
  artifactType: ArtifactType,
): MovieReturnArtifactIdentity<ArtifactType> {
  return {
    fileName: basename(input.path),
    sha256: input.sha256,
    sizeBytes: input.bytes.length,
    artifactType,
  } as MovieReturnArtifactIdentity<ArtifactType>;
}

function parseOptions(arguments_: readonly string[]): MovieReturnOptions | string {
  const names = [
    "--rental-evidence",
    "--blueprint-bodies",
    "--call-sites",
    "--caller-bodies",
    "--function-trace",
    "--rental-function-trace",
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
    return `Expected all movie-return inputs, missing ${missing.join(", ")}.`;
  }
  return {
    rentalEvidencePath: values.get("--rental-evidence")!,
    blueprintBodiesPath: values.get("--blueprint-bodies")!,
    callSitesPath: values.get("--call-sites")!,
    callerBodiesPath: values.get("--caller-bodies")!,
    functionTracePath: values.get("--function-trace")!,
    rentalFunctionTracePath: values.get("--rental-function-trace")!,
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

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

interface InputFile {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly sha256: string;
  readonly value: unknown;
}
