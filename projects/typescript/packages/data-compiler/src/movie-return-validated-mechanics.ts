import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import {
  assertArtifactContract,
  MovieReturnMechanicsSchema,
  MovieReturnValidationSchema,
  type MovieReturnValidationArtifact,
  type MovieReturnArtifactIdentity,
  type MovieReturnMechanics,
} from "@neonretrorewind/core";

import {
  type ArtifactWriteStatus,
  writeImmutableArtifact,
} from "./immutable-artifact.ts";
export interface MovieReturnValidatedMechanicsOptions {
  readonly mechanicsPath: string;
  readonly validationPath: string;
  readonly outputPath: string;
}

interface InputFile {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly sha256: string;
}

export async function linkMovieReturnValidatedMechanics(
  options: MovieReturnValidatedMechanicsOptions,
): Promise<ArtifactWriteStatus> {
  assertFileName(options.mechanicsPath, "movie-return-mechanics.json", "Mechanics input");
  assertFileName(
    options.validationPath,
    "movie-return-validation.json",
    "Validation report",
  );
  assertFileName(options.outputPath, "movie-return-mechanics.json", "Output");

  const [mechanicsFile, validationFile] = await Promise.all([
    readInput(options.mechanicsPath),
    readInput(options.validationPath),
  ]);

  const mechanics = parseObject(mechanicsFile.bytes, "Mechanics input");
  const validation = parseObject(validationFile.bytes, "Validation report");

  const baseMechanics = assertArtifactContract(
    MovieReturnMechanicsSchema,
    mechanics,
    "Mechanics input",
  );
  const report = assertArtifactContract(
    MovieReturnValidationSchema,
    validation,
    "Validation report",
  );
  assertPassingReport(baseMechanics, report, mechanicsFile);

  const linkedMechanics: MovieReturnMechanics = MovieReturnMechanicsSchema.assert({
    ...baseMechanics,
    runtimeValidation: {
      outcome: "passed",
      checkedEventCount: report.validation.checkedEventCount,
      sources: {
        baseMechanics: createIdentity(
          mechanicsFile,
          "movie-return-mechanics",
        ),
        observation: report.sources.observation,
        report: createIdentity(
          validationFile,
          "movie-return-runtime-validation",
        ),
      },
    },
  });
  const output = `${JSON.stringify(linkedMechanics, undefined, 2)}\n`;

  await Promise.all([
    assertInputUnchanged(mechanicsFile),
    assertInputUnchanged(validationFile),
  ]);

  return writeImmutableArtifact(options.outputPath, output);
}

function assertPassingReport(
  mechanics: MovieReturnMechanics,
  report: MovieReturnValidationArtifact,
  mechanicsFile: InputFile,
): void {
  if (mechanics.runtimeValidation !== "not-run") {
    throw new Error("Mechanics input already contains runtime-validation evidence.");
  }
  if (
    report.validation.outcome !== "passed" ||
    report.validation.checkedEventCount < 1 ||
    report.validation.issues.length !== 0
  ) {
    throw new Error("Validation report is not a clean passing result.");
  }
  if (
    report.build.steamAppId !== mechanics.build.steamAppId ||
    report.build.steamBuildId !== mechanics.build.steamBuildId
  ) {
    throw new Error("Validation report and mechanics input identify different game builds.");
  }

  const expectedMechanics = createIdentity(mechanicsFile, "movie-return-mechanics");
  if (!identitiesEqual(report.sources.mechanics, expectedMechanics)) {
    throw new Error("Validation report does not identify the supplied mechanics bytes.");
  }
}

function createIdentity<
  ArtifactType extends
    | "movie-return-mechanics"
    | "movie-return-runtime-validation",
>(
  file: InputFile,
  artifactType: ArtifactType,
): MovieReturnArtifactIdentity<ArtifactType> {
  return {
    fileName: basename(file.path),
    sizeBytes: file.bytes.length,
    sha256: file.sha256,
    artifactType,
  } as MovieReturnArtifactIdentity<ArtifactType>;
}

function identitiesEqual(
  left: MovieReturnArtifactIdentity<"movie-return-mechanics">,
  right: MovieReturnArtifactIdentity<"movie-return-mechanics">,
): boolean {
  return (
    left.fileName === right.fileName &&
    left.sizeBytes === right.sizeBytes &&
    left.sha256 === right.sha256 &&
    left.artifactType === right.artifactType
  );
}

async function readInput(path: string): Promise<InputFile> {
  const bytes = await readFile(path);
  return { path, bytes, sha256: sha256(bytes) };
}

async function assertInputUnchanged(input: InputFile): Promise<void> {
  const finalBytes = await readFile(input.path);
  if (finalBytes.length !== input.bytes.length || sha256(finalBytes) !== input.sha256) {
    throw new Error(`Input changed while validation evidence was linked: ${input.path}`);
  }
}

function parseObject(bytes: Uint8Array, label: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function assertFileName(path: string, expected: string, label: string): void {
  if (basename(path) !== expected) {
    throw new Error(`${label} must be named ${expected}.`);
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
