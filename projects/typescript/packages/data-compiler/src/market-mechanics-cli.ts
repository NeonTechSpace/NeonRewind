import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import {
  assertArtifactContract,
  MarketMechanicsResearchSchema,
  type MarketMechanicsSourceIdentity,
} from "@neonretrorewind/core";

import { writeImmutableArtifact } from "./immutable-artifact.ts";
import { compileMarketMechanics } from "./market-mechanics.ts";

const invalidArgumentsExitCode = 2;
const inputFailureExitCode = 6;
const outputConflictExitCode = 7;

interface Options {
  readonly researchPath: string;
  readonly sourcePaths: readonly string[];
  readonly outputPath: string;
}

export async function runMarketMechanics(
  arguments_: readonly string[],
): Promise<void> {
  const options = parseOptions(arguments_);
  if (typeof options === "string") {
    console.error(options);
    writeMarketMechanicsUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const researchFile = await readInput(options.researchPath);
    const research = assertArtifactContract(
      MarketMechanicsResearchSchema,
      researchFile.value,
      "Market-mechanics research input",
    );
    const evidenceFiles = await Promise.all(options.sourcePaths.map(readInput));
    assertMarketEvidenceFiles(research.build, research.evidence, evidenceFiles);

    const researchSource: MarketMechanicsSourceIdentity = {
      fileName: basename(researchFile.path),
      sha256: researchFile.sha256,
      sizeBytes: researchFile.bytes.length,
      artifactType: "market-mechanics-research",
    };
    const mechanics = compileMarketMechanics(research, researchSource);
    const output = `${JSON.stringify(mechanics, undefined, 2)}\n`;

    await Promise.all([researchFile, ...evidenceFiles].map(assertFileUnchanged));
    const status = await writeImmutableArtifact(options.outputPath, output);
    if (status === "conflict") {
      console.error(`Market mechanics conflict with existing output: ${options.outputPath}`);
      process.exitCode = outputConflictExitCode;
      return;
    }
    const verb = status === "created" ? "wrote" : "is unchanged";
    console.log(`Market mechanics ${verb}: ${options.outputPath}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown failure.";
    console.error(`Market-mechanics compilation failed: ${message}`);
    process.exitCode = inputFailureExitCode;
  }
}

export function writeMarketMechanicsUsage(stream: NodeJS.WritableStream): void {
  stream.write(
    "  neonretrorewind-data-compiler market-mechanics --research <path> --source <path> [--source <path> ...] --output <path>\n",
  );
}

function parseOptions(arguments_: readonly string[]): Options | string {
  let researchPath: string | undefined;
  let outputPath: string | undefined;
  const sourcePaths: string[] = [];
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !["--research", "--source", "--output"].includes(name)) {
      return `Unknown market-mechanics option ${name ?? "<missing>"}.`;
    }
    if (value === undefined || value.startsWith("--")) {
      return `Expected a value for ${name}.`;
    }
    if (name === "--source") {
      sourcePaths.push(value);
    } else if (name === "--research") {
      if (researchPath !== undefined) {
        return "Option --research was provided more than once.";
      }
      researchPath = value;
    } else {
      if (outputPath !== undefined) {
        return "Option --output was provided more than once.";
      }
      outputPath = value;
    }
  }
  if (researchPath === undefined || sourcePaths.length === 0 || outputPath === undefined) {
    return "Expected --research, at least one --source, and --output.";
  }
  return { researchPath, sourcePaths, outputPath };
}

export function assertMarketEvidenceFiles(
  expectedBuild: Readonly<{ steamAppId: string; steamBuildId: string }>,
  expected: readonly MarketMechanicsSourceIdentity[],
  actual: readonly InputFile[],
): void {
  if (actual.length !== expected.length) {
    throw new Error(`Expected ${expected.length} evidence files, received ${actual.length}.`);
  }
  const byName = new Map(actual.map((file) => [basename(file.path), file]));
  if (byName.size !== actual.length) {
    throw new Error("Evidence paths contain duplicate filenames.");
  }
  for (const identity of expected) {
    const file = byName.get(identity.fileName);
    const build = file === undefined ? undefined : readBuild(file.value);
    if (
      file === undefined ||
      file.bytes.length !== identity.sizeBytes ||
      file.sha256 !== identity.sha256 ||
      readArtifactType(file.value) !== identity.artifactType ||
      build?.steamAppId !== expectedBuild.steamAppId ||
      build?.steamBuildId !== expectedBuild.steamBuildId
    ) {
      throw new Error(`Evidence identity changed: ${identity.fileName}`);
    }
  }
}

function readArtifactType(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("artifactType" in value)) {
    return undefined;
  }
  return typeof value.artifactType === "string" ? value.artifactType : undefined;
}

function readBuild(
  value: unknown,
): { readonly steamAppId: string; readonly steamBuildId: string } | undefined {
  if (typeof value !== "object" || value === null || !("build" in value)) {
    return undefined;
  }
  const build = value.build;
  if (typeof build !== "object" || build === null) {
    return undefined;
  }
  if (!("steamAppId" in build) || !("steamBuildId" in build)) {
    return undefined;
  }
  if (typeof build.steamAppId !== "string" || typeof build.steamBuildId !== "string") {
    return undefined;
  }
  return { steamAppId: build.steamAppId, steamBuildId: build.steamBuildId };
}

async function readInput(path: string): Promise<InputFile> {
  const bytes = await readFile(path);
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`Input is not valid JSON: ${path}`);
  }
  return { path, bytes, sha256: sha256(bytes), value };
}

async function assertFileUnchanged(input: InputFile): Promise<void> {
  const bytes = await readFile(input.path);
  if (bytes.length !== input.bytes.length || sha256(bytes) !== input.sha256) {
    throw new Error(`Input changed during compilation: ${input.path}`);
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
