import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import {
  assertArtifactContract,
  BlueprintSelectedFunctionTraceSchema,
  CheckoutIncomeResearchSchema,
  type CheckoutIncomeResearch,
  type CheckoutIncomeSourceIdentity,
} from "@neonretrorewind/core";

import { compileCheckoutIncome } from "./checkout-income.ts";
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

type EvidenceIdentity = Extract<
  CheckoutIncomeSourceIdentity,
  { readonly artifactType: "blueprint-selected-function-trace" }
>;
type EvidenceSources = CheckoutIncomeResearch["evidence"];

export async function runCheckoutIncome(
  arguments_: readonly string[],
): Promise<void> {
  const options = parseOptions(arguments_);
  if (typeof options === "string") {
    console.error(options);
    writeCheckoutIncomeUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const researchFile = await readInput(options.researchPath);
    const research = assertArtifactContract(
      CheckoutIncomeResearchSchema,
      researchFile.value,
      "Checkout-income research input",
    );
    const evidenceFiles = await Promise.all(options.sourcePaths.map(readInput));
    for (const evidenceFile of evidenceFiles) {
      assertArtifactContract(
        BlueprintSelectedFunctionTraceSchema,
        evidenceFile.value,
        `Checkout-income evidence ${basename(evidenceFile.path)}`,
      );
    }
    assertCheckoutIncomeEvidenceFiles(
      research.build,
      research.evidence,
      evidenceFiles,
    );

    const researchSource = {
      fileName: basename(researchFile.path),
      sha256: researchFile.sha256,
      sizeBytes: researchFile.bytes.length,
      artifactType: "checkout-income-research",
    } as const;
    const income = compileCheckoutIncome(research, researchSource);
    const output = `${JSON.stringify(income, undefined, 2)}\n`;

    await Promise.all([researchFile, ...evidenceFiles].map(assertFileUnchanged));
    const status = await writeImmutableArtifact(options.outputPath, output);
    if (status === "conflict") {
      console.error(`Checkout income conflicts with existing output: ${options.outputPath}`);
      process.exitCode = outputConflictExitCode;
      return;
    }
    const verb = status === "created" ? "wrote" : "is unchanged";
    console.log(`Checkout income ${verb}: ${options.outputPath}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown failure.";
    console.error(`Checkout-income compilation failed: ${message}`);
    process.exitCode = inputFailureExitCode;
  }
}

export function writeCheckoutIncomeUsage(stream: NodeJS.WritableStream): void {
  stream.write(
    "  neonretrorewind-data-compiler checkout-income --research <path> --source <path> --source <path> --output <path>\n",
  );
}

export function assertCheckoutIncomeEvidenceFiles(
  expectedBuild: Readonly<{ steamAppId: string; steamBuildId: string }>,
  expected: EvidenceSources,
  actual: readonly InputFile[],
): void {
  const expectedIdentities: readonly EvidenceIdentity[] = Object.values(expected);
  if (actual.length !== expectedIdentities.length) {
    throw new Error(
      `Expected ${expectedIdentities.length} evidence files, received ${actual.length}.`,
    );
  }
  const byName = new Map(actual.map((file) => [basename(file.path), file]));
  if (byName.size !== actual.length) {
    throw new Error("Checkout-income evidence paths contain duplicate filenames.");
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
      build?.steamBuildId !== expectedBuild.steamBuildId
    ) {
      throw new Error(`Checkout-income evidence identity changed: ${identity.fileName}`);
    }
  }
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
      return `Unknown checkout-income option ${name ?? "<missing>"}.`;
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
    sourcePaths.length !== 2 ||
    outputPath === undefined
  ) {
    return "Expected --research, exactly two --source options, and --output.";
  }
  return { researchPath, sourcePaths, outputPath };
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
  if (
    typeof build.steamAppId !== "string" ||
    typeof build.steamBuildId !== "string"
  ) {
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
