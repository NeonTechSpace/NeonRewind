import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import {
  assertArtifactContract,
  BlueprintCallSitesSchema,
  BlueprintSelectedFunctionTraceSchema,
  CustomerShoppingMechanicsResearchSchema,
  LevelProgressionCategoryEnumsSchema,
  type CustomerShoppingMechanicsResearch,
  type CustomerShoppingEvidenceIdentity,
  type CustomerShoppingSourceIdentity,
} from "@neonretrorewind/core";

import { compileCustomerShoppingMechanics } from "./customer-shopping-mechanics.ts";
import { writeImmutableArtifact } from "./immutable-artifact.ts";

const invalidArgumentsExitCode = 2;
const inputFailureExitCode = 6;
const outputConflictExitCode = 7;

interface Options {
  readonly researchPath: string;
  readonly sourcePaths: readonly string[];
  readonly outputPath: string;
}

interface InputFile {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly sha256: string;
  readonly value: unknown;
}

type ResearchIdentity = Extract<
  CustomerShoppingSourceIdentity,
  { readonly artifactType: "customer-shopping-mechanics-research" }
>;

export async function runCustomerShoppingMechanics(
  arguments_: readonly string[],
): Promise<void> {
  const options = parseOptions(arguments_);
  if (typeof options === "string") {
    console.error(options);
    writeCustomerShoppingMechanicsUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const researchFile = await readInput(options.researchPath);
    const research = assertArtifactContract(
      CustomerShoppingMechanicsResearchSchema,
      researchFile.value,
      "Customer-shopping research input",
    );
    const evidenceFiles = await Promise.all(options.sourcePaths.map(readInput));
    for (const evidenceFile of evidenceFiles) {
      assertEvidenceContract(evidenceFile);
    }
    assertCustomerShoppingEvidenceFiles(
      research.build,
      research.evidence,
      evidenceFiles,
    );

    const researchSource: ResearchIdentity = {
      fileName: basename(researchFile.path),
      sha256: researchFile.sha256,
      sizeBytes: researchFile.bytes.length,
      artifactType: "customer-shopping-mechanics-research",
    };
    const mechanics = compileCustomerShoppingMechanics(research, researchSource);
    const output = `${JSON.stringify(mechanics, undefined, 2)}\n`;

    await Promise.all([researchFile, ...evidenceFiles].map(assertFileUnchanged));
    const status = await writeImmutableArtifact(options.outputPath, output);
    if (status === "conflict") {
      console.error(
        `Customer-shopping mechanics conflict with existing output: ${options.outputPath}`,
      );
      process.exitCode = outputConflictExitCode;
      return;
    }
    const verb = status === "created" ? "wrote" : "is unchanged";
    console.log(`Customer-shopping mechanics ${verb}: ${options.outputPath}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown failure.";
    console.error(`Customer-shopping compilation failed: ${message}`);
    process.exitCode = inputFailureExitCode;
  }
}

export function writeCustomerShoppingMechanicsUsage(
  stream: NodeJS.WritableStream,
): void {
  stream.write(
    "  neonretrorewind-data-compiler customer-shopping-mechanics --research <path> --source <path> [--source <path> ...] --output <path>\n",
  );
}

export function assertCustomerShoppingEvidenceFiles(
  expectedBuild: Readonly<{ steamAppId: string; steamBuildId: string }>,
  expected: CustomerShoppingMechanicsResearch["evidence"],
  actual: readonly InputFile[],
): void {
  const expectedIdentities: readonly CustomerShoppingEvidenceIdentity[] =
    Object.values(expected);
  if (actual.length !== expectedIdentities.length) {
    throw new Error(
      `Expected ${expectedIdentities.length} evidence files, received ${actual.length}.`,
    );
  }

  const byName = new Map(actual.map((file) => [basename(file.path), file]));
  if (byName.size !== actual.length) {
    throw new Error("Customer-shopping evidence paths contain duplicate filenames.");
  }

  for (const identity of expectedIdentities) {
    const file = byName.get(identity.fileName);
    const build = file === undefined ? undefined : readBuild(file.value);
    if (
      file === undefined ||
      file.bytes.length !== identity.sizeBytes ||
      file.sha256 !== identity.sha256 ||
      readArtifactType(file.value) !== identity.artifactType ||
      build?.steamAppId !== expectedBuild.steamAppId ||
      build.steamBuildId !== expectedBuild.steamBuildId
    ) {
      throw new Error(
        `Customer-shopping evidence identity changed: ${identity.fileName}`,
      );
    }
  }
}

function assertEvidenceContract(file: InputFile): void {
  const label = `Customer-shopping evidence ${basename(file.path)}`;
  const artifactType = readArtifactType(file.value);
  if (artifactType === "blueprint-selected-function-trace") {
    assertArtifactContract(BlueprintSelectedFunctionTraceSchema, file.value, label);
    return;
  }
  if (artifactType === "blueprint-call-sites") {
    assertArtifactContract(BlueprintCallSitesSchema, file.value, label);
    return;
  }
  if (artifactType === "level-progression-category-enums") {
    assertArtifactContract(LevelProgressionCategoryEnumsSchema, file.value, label);
    return;
  }
  if (artifactType === "private-blueprint-class-default-probe") {
    if (readBuild(file.value) === undefined) {
      throw new Error(`${label} has no valid build identity.`);
    }
    return;
  }
  throw new Error(`${label} has an unsupported artifact type.`);
}

function parseOptions(arguments_: readonly string[]): Options | string {
  let researchPath: string | undefined;
  let outputPath: string | undefined;
  const sourcePaths: string[] = [];

  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (
      name === undefined ||
      !["--research", "--source", "--output"].includes(name)
    ) {
      return `Unknown customer-shopping option ${name ?? "<missing>"}.`;
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

  if (
    researchPath === undefined ||
    sourcePaths.length === 0 ||
    outputPath === undefined
  ) {
    return "Expected --research, at least one --source option, and --output.";
  }
  return { researchPath, sourcePaths, outputPath };
}

function readArtifactType(value: unknown): string | undefined {
  if (!isRecord(value) || typeof value.artifactType !== "string") {
    return undefined;
  }
  return value.artifactType;
}

function readBuild(
  value: unknown,
): { readonly steamAppId: string; readonly steamBuildId: string } | undefined {
  if (!isRecord(value) || !isRecord(value.build)) {
    return undefined;
  }
  if (
    typeof value.build.steamAppId !== "string" ||
    typeof value.build.steamBuildId !== "string"
  ) {
    return undefined;
  }
  return {
    steamAppId: value.build.steamAppId,
    steamBuildId: value.build.steamBuildId,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
