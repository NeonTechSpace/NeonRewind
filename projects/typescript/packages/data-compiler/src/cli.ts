import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import {
  assertArtifactContract,
  RentalBlueprintBodiesSchema,
  RentalEvidenceSchema,
  StructuredValuesSchema,
  type AcquisitionArtifactIdentity,
  type RentalArtifactIdentity,
} from "@neonretrorewind/core";

import { compileConsoleReturnMechanics } from "./console-return-mechanics.ts";
import {
  runCheckoutIncome,
  writeCheckoutIncomeUsage,
} from "./checkout-income-cli.ts";
import { compileFilmCatalog } from "./film-catalog.ts";
import { writeImmutableArtifact } from "./immutable-artifact.ts";
import {
  runLevelProgression,
  writeLevelProgressionUsage,
} from "./level-progression-cli.ts";
import { compileMembershipFeeMechanics } from "./membership-fee-mechanics.ts";
import {
  runMarketMechanics,
  writeMarketMechanicsUsage,
} from "./market-mechanics-cli.ts";
import {
  runMarketGuideFindings,
  writeMarketGuideFindingsUsage,
} from "./market-guide-findings-cli.ts";
import {
  runMarketValueAnalysis,
  writeMarketValueAnalysisUsage,
} from "./market-value-analysis-cli.ts";
import {
  runNewReleaseMechanics,
  writeNewReleaseUsage,
} from "./new-release-cli.ts";
import { runMovieReturnMechanic, writeMovieReturnUsage } from "./movie-return-cli.ts";
import {
  runMovieReturnValidatedMechanics,
  writeMovieReturnValidatedMechanicsUsage,
} from "./movie-return-validated-mechanics-cli.ts";
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
  readonly outputPath: string;
}

interface ConsoleReturnOptions {
  readonly rentalEvidencePath: string;
  readonly blueprintBodiesPath: string;
  readonly outputPath: string;
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

  if (arguments_[0] === "checkout-income") {
    await runCheckoutIncome(arguments_.slice(1));
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

  if (arguments_[0] === "movie-return-validated-mechanics") {
    await runMovieReturnValidatedMechanics(arguments_.slice(1));
    return;
  }

  if (arguments_[0] === "new-release-mechanics") {
    await runNewReleaseMechanics(arguments_.slice(1));
    return;
  }

  if (arguments_[0] === "level-progression") {
    await runLevelProgression(arguments_.slice(1));
    return;
  }

  if (arguments_[0] === "market-mechanics") {
    await runMarketMechanics(arguments_.slice(1));
    return;
  }

  if (arguments_[0] === "market-guide-findings") {
    await runMarketGuideFindings(arguments_.slice(1));
    return;
  }

  if (arguments_[0] === "market-value-analysis") {
    await runMarketValueAnalysis(arguments_.slice(1));
    return;
  }

  if (arguments_[0] !== "film-catalog") {
    console.error(
      "Expected the film-catalog, console-return-mechanics, checkout-income, membership-fee-mechanics, movie-return-mechanics, movie-return-validated-mechanics, new-release-mechanics, level-progression, market-mechanics, market-value-analysis, or market-guide-findings command.",
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
    const structuredValues: StructuredValuesArtifact = assertArtifactContract(
      StructuredValuesSchema,
      input,
      "Structured-values input",
    );
    const source: AcquisitionArtifactIdentity = {
      fileName: basename(options.inputPath),
      sha256: inputHash,
      sizeBytes: inputBytes.length,
      artifactType: "structured-values",
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
    const rentalArtifact: RentalEvidenceArtifact = assertArtifactContract(
      RentalEvidenceSchema,
      rentalInput,
      "Rental-evidence input",
    );
    const bodyArtifact: RentalBlueprintBodiesArtifact = assertArtifactContract(
      RentalBlueprintBodiesSchema,
      bodyInput,
      "Rental Blueprint-body input",
    );

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
      rentalArtifact,
      bodyArtifact,
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

function parseFilmCatalogOptions(
  arguments_: readonly string[],
): FilmCatalogOptions | string {
  const values = new Map<string, string>();
  const allowed = new Set(["--input", "--output"]);

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
  const outputPath = values.get("--output");
  if (inputPath === undefined || outputPath === undefined) {
    return "Expected --input and --output.";
  }

  return { inputPath, outputPath };
}

function parseRentalMechanicOptions(
  arguments_: readonly string[],
  commandName: string,
): ConsoleReturnOptions | string {
  const values = new Map<string, string>();
  const allowed = new Set([
    "--rental-evidence",
    "--blueprint-bodies",
    "--output",
  ]);

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
  const blueprintBodiesPath = values.get("--blueprint-bodies");
  const outputPath = values.get("--output");
  if (
    rentalEvidencePath === undefined ||
    blueprintBodiesPath === undefined ||
    outputPath === undefined
  ) {
    return "Expected both rental inputs and --output.";
  }

  const rentalOptions: ConsoleReturnOptions = {
    rentalEvidencePath,
    blueprintBodiesPath,
    outputPath,
  };
  return rentalOptions;
}

function createRentalIdentity<
  ArtifactType extends RentalArtifactIdentity["artifactType"],
>(
  path: string,
  bytes: Uint8Array,
  hash: string,
  artifactType: ArtifactType,
): RentalArtifactIdentity<ArtifactType> {
  return {
    fileName: basename(path),
    sha256: hash,
    sizeBytes: bytes.length,
    artifactType,
  } as RentalArtifactIdentity<ArtifactType>;
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

function writeUsage(stream: NodeJS.WritableStream): void {
  stream.write("Usage:\n");
  stream.write(
    "  neonretrorewind-data-compiler film-catalog --input <structured-values> --output <film-catalog>\n",
  );
  stream.write(
    "  neonretrorewind-data-compiler console-return-mechanics --rental-evidence <path> --blueprint-bodies <path> --output <path>\n",
  );
  stream.write(
    "  neonretrorewind-data-compiler membership-fee-mechanics --rental-evidence <path> --blueprint-bodies <path> --output <path>\n",
  );
  writeMovieReturnUsage(stream);
  writeMovieReturnValidatedMechanicsUsage(stream);
  writeNewReleaseUsage(stream);
  writeLevelProgressionUsage(stream);
  writeMarketMechanicsUsage(stream);
  writeMarketValueAnalysisUsage(stream);
  writeMarketGuideFindingsUsage(stream);
  writeCheckoutIncomeUsage(stream);
}
