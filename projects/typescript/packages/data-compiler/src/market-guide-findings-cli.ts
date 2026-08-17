import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import {
  assertArtifactContract,
  MarketMechanicsSchema,
  MarketValueAnalysisSchema,
} from "@neonretrorewind/core";

import { writeImmutableArtifact } from "./immutable-artifact.ts";
import {
  compileMarketGuideFindings,
  type MarketGuideFindingsInputSources,
} from "./market-guide-findings.ts";

const invalidArgumentsExitCode = 2;
const inputFailureExitCode = 6;
const outputConflictExitCode = 7;

interface Options {
  readonly mechanicsPath: string;
  readonly valuesPath: string;
  readonly outputPath: string;
}

interface InputFile {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly sha256: string;
  readonly value: unknown;
}

export async function runMarketGuideFindings(
  arguments_: readonly string[],
): Promise<void> {
  const options = parseOptions(arguments_);
  if (typeof options === "string") {
    console.error(options);
    writeMarketGuideFindingsUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const [mechanicsFile, valuesFile] = await Promise.all([
      readInput(options.mechanicsPath),
      readInput(options.valuesPath),
    ]);
    const mechanics = assertArtifactContract(
      MarketMechanicsSchema,
      mechanicsFile.value,
      "Market-mechanics input",
    );
    const values = assertArtifactContract(
      MarketValueAnalysisSchema,
      valuesFile.value,
      "Market-value-analysis input",
    );
    const sources: MarketGuideFindingsInputSources = {
      marketMechanics: sourceIdentity(mechanicsFile, "market-mechanics"),
      marketValueAnalysis: sourceIdentity(valuesFile, "market-value-analysis"),
    };
    const findings = compileMarketGuideFindings(mechanics, values, sources);
    const output = `${JSON.stringify(findings, undefined, 2)}\n`;

    await Promise.all([mechanicsFile, valuesFile].map(assertFileUnchanged));
    const status = await writeImmutableArtifact(options.outputPath, output);
    if (status === "conflict") {
      console.error(
        `Market guide findings conflict with existing output: ${options.outputPath}`,
      );
      process.exitCode = outputConflictExitCode;
      return;
    }
    const verb = status === "created" ? "wrote" : "are unchanged";
    console.log(`Market guide findings ${verb}: ${options.outputPath}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown failure.";
    console.error(`Market-guide-findings compilation failed: ${message}`);
    process.exitCode = inputFailureExitCode;
  }
}

export function writeMarketGuideFindingsUsage(stream: NodeJS.WritableStream): void {
  stream.write(
    "  neonretrorewind-data-compiler market-guide-findings --mechanics <path> --values <path> --output <path>\n",
  );
}

function parseOptions(arguments_: readonly string[]): Options | string {
  const values = new Map<string, string>();
  const recognized = new Set(["--mechanics", "--values", "--output"]);
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !recognized.has(name)) {
      return `Unknown market-guide-findings option ${name ?? "<missing>"}.`;
    }
    if (value === undefined || value.startsWith("--")) {
      return `Expected a value for ${name}.`;
    }
    if (values.has(name)) {
      return `Option ${name} was provided more than once.`;
    }
    values.set(name, value);
  }
  const mechanicsPath = values.get("--mechanics");
  const valuesPath = values.get("--values");
  const outputPath = values.get("--output");
  if (mechanicsPath === undefined || valuesPath === undefined || outputPath === undefined) {
    return "Expected --mechanics, --values, and --output.";
  }
  return { mechanicsPath, valuesPath, outputPath };
}

async function readInput(path: string): Promise<InputFile> {
  const bytes = await readFile(path);
  return {
    path,
    bytes,
    sha256: hash(bytes),
    value: parseJson(bytes, path),
  };
}

async function assertFileUnchanged(file: InputFile): Promise<void> {
  const current = await readFile(file.path);
  if (current.length !== file.bytes.length || hash(current) !== file.sha256) {
    throw new Error(`Input changed during compilation: ${file.path}`);
  }
}

function sourceIdentity<ArtifactType extends "market-mechanics" | "market-value-analysis">(
  file: InputFile,
  artifactType: ArtifactType,
) {
  return {
    fileName: basename(file.path),
    sha256: file.sha256,
    sizeBytes: file.bytes.length,
    artifactType,
  };
}

function parseJson(bytes: Uint8Array, path: string): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`Input is not valid UTF-8 JSON: ${path}`);
  }
}

function hash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
