import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import {
  assertArtifactContract,
  BlueprintCallSitesSchema,
  BlueprintPropertyReferencesSchema,
  BlueprintSelectedFunctionTraceSchema,
  CheckoutIncomeSchema,
  LevelProgressionCategoryEnumsSchema,
  MarketGuideFindingsSchema,
  MarketRentalEconomicsResearchSchema,
  MarketValueAnalysisSchema,
  type MarketRentalEconomicsEvidenceIdentity,
  type MarketRentalEconomicsResearch,
} from "@neonretrorewind/core";

import { writeImmutableArtifact } from "./immutable-artifact.ts";
import {
  compileMarketRentalEconomics,
  type MarketRentalEconomicsInputSources,
} from "./market-rental-economics.ts";

const invalidArgumentsExitCode = 2;
const inputFailureExitCode = 6;
const outputConflictExitCode = 7;

interface Options {
  readonly researchPath: string;
  readonly valuesPath: string;
  readonly findingsPath: string;
  readonly incomePath: string;
  readonly sourcePaths: readonly string[];
  readonly outputPath: string;
}

interface InputFile {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly sha256: string;
  readonly value: unknown;
}

type EvidenceSources = MarketRentalEconomicsResearch["evidence"];

export async function runMarketRentalEconomics(
  arguments_: readonly string[],
): Promise<void> {
  const options = parseOptions(arguments_);
  if (typeof options === "string") {
    console.error(options);
    writeMarketRentalEconomicsUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const [researchFile, valuesFile, findingsFile, incomeFile, ...evidenceFiles] =
      await Promise.all([
        readInput(options.researchPath),
        readInput(options.valuesPath),
        readInput(options.findingsPath),
        readInput(options.incomePath),
        ...options.sourcePaths.map(readInput),
      ]);
    const research = assertArtifactContract(
      MarketRentalEconomicsResearchSchema,
      researchFile.value,
      "Market-rental-economics research input",
    );
    const values = assertArtifactContract(
      MarketValueAnalysisSchema,
      valuesFile.value,
      "Market-value-analysis input",
    );
    const findings = assertArtifactContract(
      MarketGuideFindingsSchema,
      findingsFile.value,
      "Market-guide-findings input",
    );
    const income = assertArtifactContract(
      CheckoutIncomeSchema,
      incomeFile.value,
      "Checkout-income input",
    );
    for (const evidenceFile of evidenceFiles) {
      assertEvidenceContract(evidenceFile);
    }
    assertMarketRentalEconomicsEvidenceFiles(
      research.build,
      research.evidence,
      evidenceFiles,
    );

    const sources: MarketRentalEconomicsInputSources = {
      research: sourceIdentity(
        researchFile,
        "market-rental-economics-research",
      ),
      marketValueAnalysis: sourceIdentity(
        valuesFile,
        "market-value-analysis",
      ),
      marketGuideFindings: sourceIdentity(
        findingsFile,
        "market-guide-findings",
      ),
      checkoutIncome: sourceIdentity(incomeFile, "checkout-income"),
    };
    const economics = compileMarketRentalEconomics(
      research,
      values,
      findings,
      income,
      sources,
    );
    const output = `${JSON.stringify(economics, undefined, 2)}\n`;

    await Promise.all(
      [
        researchFile,
        valuesFile,
        findingsFile,
        incomeFile,
        ...evidenceFiles,
      ].map(assertFileUnchanged),
    );
    const status = await writeImmutableArtifact(options.outputPath, output);
    if (status === "conflict") {
      console.error(
        `Market rental economics conflict with existing output: ${options.outputPath}`,
      );
      process.exitCode = outputConflictExitCode;
      return;
    }
    const verb = status === "created" ? "wrote" : "are unchanged";
    console.log(`Market rental economics ${verb}: ${options.outputPath}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown failure.";
    console.error(`Market-rental-economics compilation failed: ${message}`);
    process.exitCode = inputFailureExitCode;
  }
}

export function writeMarketRentalEconomicsUsage(
  stream: NodeJS.WritableStream,
): void {
  stream.write(
    "  neonretrorewind-data-compiler market-rental-economics --research <path> --values <path> --findings <path> --income <path> --source <path> ... --output <path>\n",
  );
}

export function assertMarketRentalEconomicsEvidenceFiles(
  expectedBuild: Readonly<{ steamAppId: string; steamBuildId: string }>,
  expected: EvidenceSources,
  actual: readonly InputFile[],
): void {
  const expectedIdentities: readonly MarketRentalEconomicsEvidenceIdentity[] =
    Object.values(expected);
  if (actual.length !== expectedIdentities.length) {
    throw new Error(
      `Expected ${expectedIdentities.length} classification evidence files, received ${actual.length}.`,
    );
  }
  const byName = new Map(actual.map((file) => [basename(file.path), file]));
  if (byName.size !== actual.length) {
    throw new Error(
      "Market-rental-economics evidence paths contain duplicate filenames.",
    );
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
      throw new Error(
        `Market-rental-economics evidence identity changed: ${identity.fileName}`,
      );
    }
  }
}

function assertEvidenceContract(file: InputFile): void {
  const artifactType = readArtifactType(file.value);
  const label = `Market-rental-economics evidence ${basename(file.path)}`;
  if (artifactType === "blueprint-call-sites") {
    assertArtifactContract(BlueprintCallSitesSchema, file.value, label);
    return;
  }
  if (artifactType === "blueprint-property-references") {
    assertArtifactContract(BlueprintPropertyReferencesSchema, file.value, label);
    return;
  }
  if (artifactType === "blueprint-selected-function-trace") {
    assertArtifactContract(BlueprintSelectedFunctionTraceSchema, file.value, label);
    return;
  }
  if (artifactType === "level-progression-category-enums") {
    assertArtifactContract(LevelProgressionCategoryEnumsSchema, file.value, label);
    return;
  }
  throw new Error(`Unsupported classification evidence type: ${artifactType ?? "missing"}.`);
}

function parseOptions(arguments_: readonly string[]): Options | string {
  const singleValues = new Map<string, string>();
  const sourcePaths: string[] = [];
  const recognized = new Set([
    "--research",
    "--values",
    "--findings",
    "--income",
    "--source",
    "--output",
  ]);
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !recognized.has(name)) {
      return `Unknown market-rental-economics option ${name ?? "<missing>"}.`;
    }
    if (value === undefined || value.startsWith("--")) {
      return `Expected a value for ${name}.`;
    }
    if (name === "--source") {
      sourcePaths.push(value);
      continue;
    }
    if (singleValues.has(name)) {
      return `Option ${name} was provided more than once.`;
    }
    singleValues.set(name, value);
  }
  const researchPath = singleValues.get("--research");
  const valuesPath = singleValues.get("--values");
  const findingsPath = singleValues.get("--findings");
  const incomePath = singleValues.get("--income");
  const outputPath = singleValues.get("--output");
  if (
    researchPath === undefined ||
    valuesPath === undefined ||
    findingsPath === undefined ||
    incomePath === undefined ||
    sourcePaths.length !== 8 ||
    outputPath === undefined
  ) {
    return "Expected --research, --values, --findings, --income, exactly eight --source options, and --output.";
  }
  return {
    researchPath,
    valuesPath,
    findingsPath,
    incomePath,
    sourcePaths,
    outputPath,
  };
}

function sourceIdentity<
  ArtifactType extends MarketRentalEconomicsInputSources[
    keyof MarketRentalEconomicsInputSources
  ]["artifactType"],
>(file: InputFile, artifactType: ArtifactType) {
  return {
    fileName: basename(file.path),
    sha256: file.sha256,
    sizeBytes: file.bytes.length,
    artifactType,
  };
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
  const buildValue = value.build;
  if (typeof buildValue !== "object" || buildValue === null) {
    return undefined;
  }
  if (!("steamAppId" in buildValue) || !("steamBuildId" in buildValue)) {
    return undefined;
  }
  if (
    typeof buildValue.steamAppId !== "string" ||
    typeof buildValue.steamBuildId !== "string"
  ) {
    return undefined;
  }
  return {
    steamAppId: buildValue.steamAppId,
    steamBuildId: buildValue.steamBuildId,
  };
}

async function readInput(path: string): Promise<InputFile> {
  const bytes = await readFile(path);
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`Input is not valid UTF-8 JSON: ${path}`);
  }
  return { path, bytes, sha256: hash(bytes), value };
}

async function assertFileUnchanged(file: InputFile): Promise<void> {
  const current = await readFile(file.path);
  if (current.length !== file.bytes.length || hash(current) !== file.sha256) {
    throw new Error(`Input changed during compilation: ${file.path}`);
  }
}

function hash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
