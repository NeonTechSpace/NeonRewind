import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import {
  assertArtifactContract,
  BlueprintCallTargetTraceSchema,
  BlueprintFunctionTraceSchema,
  BlueprintPropertyReferenceTraceSchema,
  UnlockableManagerTraceSchema,
  type NewReleaseArtifactIdentity,
} from "@neonretrorewind/core";

import { writeImmutableArtifact } from "./immutable-artifact.ts";
import {
  compileNewReleaseMechanics,
  type NewReleaseSources,
} from "./new-release-mechanics.ts";

const invalidArgumentsExitCode = 2;
const inputFailureExitCode = 6;
const outputConflictExitCode = 7;

interface Options {
  readonly managerTracePath: string;
  readonly wrapperTracePath: string;
  readonly propertyReaderTracePath: string;
  readonly requestGeneratorTracePath: string;
  readonly marketEntryTracePath: string;
  readonly sourceMapTracePath: string;
  readonly candidateMapTracePath: string;
  readonly callTargetTracePath: string;
  readonly outputPath: string;
}

export async function runNewReleaseMechanics(
  arguments_: readonly string[],
): Promise<void> {
  const options = parseOptions(arguments_);
  if (typeof options === "string") {
    console.error(options);
    writeNewReleaseUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const [
      manager,
      wrapper,
      propertyReader,
      requestGenerator,
      marketEntry,
      sourceMap,
      candidateMap,
      callTarget,
    ] = await Promise.all([
      readInput(options.managerTracePath, "Unlock manager trace"),
      readInput(options.wrapperTracePath, "Unlock wrapper trace"),
      readInput(options.propertyReaderTracePath, "Property-reader trace"),
      readInput(options.requestGeneratorTracePath, "Request-generator trace"),
      readInput(options.marketEntryTracePath, "Market entry trace"),
      readInput(options.sourceMapTracePath, "Source-map trace"),
      readInput(options.candidateMapTracePath, "Candidate-map trace"),
      readInput(options.callTargetTracePath, "Call-target trace"),
    ]);
    const sources: NewReleaseSources = {
      managerTrace: createIdentity(manager, "unlockable-manager-trace"),
      wrapperTrace: createIdentity(wrapper, "blueprint-function-trace"),
      propertyReaderTrace: createIdentity(
        propertyReader,
        "blueprint-property-reference-trace",
      ),
      requestGeneratorTrace: createIdentity(
        requestGenerator,
        "blueprint-function-trace",
      ),
      marketEntryTrace: createIdentity(marketEntry, "blueprint-function-trace"),
      sourceMapTrace: createIdentity(
        sourceMap,
        "blueprint-property-reference-trace",
      ),
      candidateMapTrace: createIdentity(
        candidateMap,
        "blueprint-property-reference-trace",
      ),
      callTargetTrace: createIdentity(callTarget, "blueprint-call-target-trace"),
    };
    const mechanics = compileNewReleaseMechanics(
      assertArtifactContract(
        UnlockableManagerTraceSchema,
        manager.value,
        "Unlock manager trace input",
      ),
      assertArtifactContract(
        BlueprintFunctionTraceSchema,
        wrapper.value,
        "Unlock wrapper trace input",
      ),
      assertArtifactContract(
        BlueprintPropertyReferenceTraceSchema,
        propertyReader.value,
        "Property-reader trace input",
      ),
      assertArtifactContract(
        BlueprintFunctionTraceSchema,
        requestGenerator.value,
        "Request-generator trace input",
      ),
      assertArtifactContract(
        BlueprintFunctionTraceSchema,
        marketEntry.value,
        "Market entry trace input",
      ),
      assertArtifactContract(
        BlueprintPropertyReferenceTraceSchema,
        sourceMap.value,
        "Source-map trace input",
      ),
      assertArtifactContract(
        BlueprintPropertyReferenceTraceSchema,
        candidateMap.value,
        "Candidate-map trace input",
      ),
      assertArtifactContract(
        BlueprintCallTargetTraceSchema,
        callTarget.value,
        "Call-target trace input",
      ),
      sources,
    );
    const output = `${JSON.stringify(mechanics, undefined, 2)}\n`;

    await Promise.all(
      [
        manager,
        wrapper,
        propertyReader,
        requestGenerator,
        marketEntry,
        sourceMap,
        candidateMap,
        callTarget,
      ].map((input) => assertFileUnchanged(input)),
    );
    const status = await writeImmutableArtifact(options.outputPath, output);
    if (status === "conflict") {
      console.error(
        `New-release mechanics conflict with existing output: ${options.outputPath}`,
      );
      process.exitCode = outputConflictExitCode;
      return;
    }

    const verb = status === "created" ? "wrote" : "is unchanged";
    console.log(`New-release mechanics ${verb}: ${options.outputPath}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown failure.";
    console.error(`New-release-mechanics compilation failed: ${message}`);
    process.exitCode = inputFailureExitCode;
  }
}

export function writeNewReleaseUsage(stream: NodeJS.WritableStream): void {
  stream.write(
    "  neonretrorewind-data-compiler new-release-mechanics --manager-trace <path> --wrapper-trace <path> --property-reader-trace <path> --request-generator-trace <path> --market-entry-trace <path> --source-map-trace <path> --candidate-map-trace <path> --call-target-trace <path> --output <path>\n",
  );
}

async function readInput(path: string, label: string): Promise<InputFile> {
  const bytes = await readFile(path);
  return { path, bytes, sha256: sha256(bytes), value: parseJson(bytes, `${label} input`) };
}

function createIdentity<
  ArtifactType extends NewReleaseArtifactIdentity["artifactType"],
>(input: InputFile, artifactType: ArtifactType): NewReleaseArtifactIdentity<ArtifactType> {
  return {
    fileName: basename(input.path),
    sha256: input.sha256,
    sizeBytes: input.bytes.length,
    artifactType,
  } as NewReleaseArtifactIdentity<ArtifactType>;
}

function parseOptions(arguments_: readonly string[]): Options | string {
  const names = [
    "--manager-trace",
    "--wrapper-trace",
    "--property-reader-trace",
    "--request-generator-trace",
    "--market-entry-trace",
    "--source-map-trace",
    "--candidate-map-trace",
    "--call-target-trace",
    "--output",
  ] as const;
  const allowed = new Set<string>(names);
  const values = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !allowed.has(name)) {
      return `Unknown new-release-mechanics option ${name ?? "<missing>"}.`;
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
    return `Expected manager, wrapper, property-reader, request-generator, Market entry, source-map, candidate-map, and call-target traces and --output, missing ${missing.join(", ")}.`;
  }
  return {
    managerTracePath: values.get("--manager-trace")!,
    wrapperTracePath: values.get("--wrapper-trace")!,
    propertyReaderTracePath: values.get("--property-reader-trace")!,
    requestGeneratorTracePath: values.get("--request-generator-trace")!,
    marketEntryTracePath: values.get("--market-entry-trace")!,
    sourceMapTracePath: values.get("--source-map-trace")!,
    candidateMapTracePath: values.get("--candidate-map-trace")!,
    callTargetTracePath: values.get("--call-target-trace")!,
    outputPath: values.get("--output")!,
  };
}

async function assertFileUnchanged(input: InputFile): Promise<void> {
  const finalBytes = await readFile(input.path);
  if (finalBytes.length !== input.bytes.length || sha256(finalBytes) !== input.sha256) {
    throw new Error(`Input changed during compilation: ${input.path}`);
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
