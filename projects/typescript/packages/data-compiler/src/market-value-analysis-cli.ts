import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import {
  assertArtifactContract,
  FilmCatalogSchema,
  MarketMechanicsSchema,
  StructuredValuesSchema,
} from "@neonretrorewind/core";

import { writeImmutableArtifact } from "./immutable-artifact.ts";
import {
  compileMarketValueAnalysis,
  type MarketValueInputSources,
} from "./market-value-analysis.ts";

const invalidArgumentsExitCode = 2;
const inputFailureExitCode = 6;
const outputConflictExitCode = 7;

interface Options {
  readonly catalogPath: string;
  readonly mechanicsPath: string;
  readonly catalogStructuredValuesPath: string;
  readonly mechanicsStructuredValuesPath: string;
  readonly outputPath: string;
}

interface InputFile {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly sha256: string;
  readonly value: unknown;
}

export async function runMarketValueAnalysis(
  arguments_: readonly string[],
): Promise<void> {
  const options = parseOptions(arguments_);
  if (typeof options === "string") {
    console.error(options);
    writeMarketValueAnalysisUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const [
      catalogFile,
      mechanicsFile,
      catalogStructuredValuesFile,
      mechanicsStructuredValuesFile,
    ] = await Promise.all([
      readInput(options.catalogPath),
      readInput(options.mechanicsPath),
      readInput(options.catalogStructuredValuesPath),
      readInput(options.mechanicsStructuredValuesPath),
    ]);
    const catalog = assertArtifactContract(
      FilmCatalogSchema,
      catalogFile.value,
      "Film-catalog input",
    );
    const mechanics = assertArtifactContract(
      MarketMechanicsSchema,
      mechanicsFile.value,
      "Market-mechanics input",
    );
    const catalogStructuredValues = assertArtifactContract(
      StructuredValuesSchema,
      catalogStructuredValuesFile.value,
      "Catalog structured-values input",
    );
    const mechanicsStructuredValues = assertArtifactContract(
      StructuredValuesSchema,
      mechanicsStructuredValuesFile.value,
      "Mechanics structured-values input",
    );
    const sources: MarketValueInputSources = {
      filmCatalog: sourceIdentity(catalogFile, "film-catalog"),
      marketMechanics: sourceIdentity(mechanicsFile, "market-mechanics"),
      catalogStructuredValues: sourceIdentity(
        catalogStructuredValuesFile,
        "structured-values",
      ),
      mechanicsStructuredValues: sourceIdentity(
        mechanicsStructuredValuesFile,
        "structured-values",
      ),
    };
    const analysis = compileMarketValueAnalysis(
      catalog,
      mechanics,
      catalogStructuredValues,
      mechanicsStructuredValues,
      sources,
    );
    const output = `${JSON.stringify(analysis, undefined, 2)}\n`;

    await Promise.all(
      [
        catalogFile,
        mechanicsFile,
        catalogStructuredValuesFile,
        mechanicsStructuredValuesFile,
      ].map(assertFileUnchanged),
    );
    const status = await writeImmutableArtifact(options.outputPath, output);
    if (status === "conflict") {
      console.error(
        `Market value analysis conflicts with existing output: ${options.outputPath}`,
      );
      process.exitCode = outputConflictExitCode;
      return;
    }
    const verb = status === "created" ? "wrote" : "is unchanged";
    console.log(`Market value analysis ${verb}: ${options.outputPath}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown failure.";
    console.error(`Market-value analysis failed: ${message}`);
    process.exitCode = inputFailureExitCode;
  }
}

export function writeMarketValueAnalysisUsage(stream: NodeJS.WritableStream): void {
  stream.write(
    "  neonretrorewind-data-compiler market-value-analysis --catalog <path> --mechanics <path> --catalog-structured-values <path> --mechanics-structured-values <path> --output <path>\n",
  );
}

function parseOptions(arguments_: readonly string[]): Options | string {
  const values = new Map<string, string>();
  const recognized = new Set([
    "--catalog",
    "--mechanics",
    "--catalog-structured-values",
    "--mechanics-structured-values",
    "--output",
  ]);
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !recognized.has(name)) {
      return `Unknown market-value-analysis option ${name ?? "<missing>"}.`;
    }
    if (value === undefined || value.startsWith("--")) {
      return `Expected a value for ${name}.`;
    }
    if (values.has(name)) {
      return `Option ${name} was provided more than once.`;
    }
    values.set(name, value);
  }
  const catalogPath = values.get("--catalog");
  const mechanicsPath = values.get("--mechanics");
  const catalogStructuredValuesPath = values.get("--catalog-structured-values");
  const mechanicsStructuredValuesPath = values.get("--mechanics-structured-values");
  const outputPath = values.get("--output");
  if (
    catalogPath === undefined ||
    mechanicsPath === undefined ||
    catalogStructuredValuesPath === undefined ||
    mechanicsStructuredValuesPath === undefined ||
    outputPath === undefined
  ) {
    return "Expected --catalog, --mechanics, --catalog-structured-values, --mechanics-structured-values, and --output.";
  }
  return {
    catalogPath,
    mechanicsPath,
    catalogStructuredValuesPath,
    mechanicsStructuredValuesPath,
    outputPath,
  };
}

function sourceIdentity<
  const ArtifactType extends MarketValueInputSources[keyof MarketValueInputSources]["artifactType"],
>(file: InputFile, artifactType: ArtifactType) {
  return {
    fileName: basename(file.path),
    sha256: file.sha256,
    sizeBytes: file.bytes.length,
    artifactType,
  };
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
