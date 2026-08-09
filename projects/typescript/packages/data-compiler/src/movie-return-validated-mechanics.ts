import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import type {
  MovieReturnArtifactIdentity,
  MovieReturnMechanics,
} from "@neonretrorewind/core";

import {
  type ArtifactWriteStatus,
  writeImmutableArtifact,
} from "./immutable-artifact.ts";
import { validateJsonSchema } from "./schema-validation.ts";

const mechanicsSchemaId = "urn:neonretrorewind:schema:domain:movie-return-mechanics";
const validationSchemaId = "urn:neonretrorewind:schema:validation:movie-return-validation";

export interface MovieReturnValidatedMechanicsOptions {
  readonly mechanicsPath: string;
  readonly mechanicsSchemaPath: string;
  readonly validationPath: string;
  readonly validationSchemaPath: string;
  readonly outputPath: string;
}

interface ValidationArtifact {
  readonly artifactType: "movie-return-runtime-validation";
  readonly build: MovieReturnMechanics["build"];
  readonly sources: {
    readonly observation: MovieReturnArtifactIdentity<"movie-return-runtime-observation">;
    readonly mechanics: MovieReturnArtifactIdentity<"movie-return-mechanics">;
  };
  readonly validation: {
    readonly outcome: "passed" | "incomplete" | "mismatch";
    readonly checkedEventCount: number;
    readonly issues: readonly unknown[];
  };
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

  const [mechanicsFile, mechanicsSchemaFile, validationFile, validationSchemaFile] =
    await Promise.all([
      readInput(options.mechanicsPath),
      readInput(options.mechanicsSchemaPath),
      readInput(options.validationPath),
      readInput(options.validationSchemaPath),
    ]);

  const mechanics = parseObject(mechanicsFile.bytes, "Mechanics input");
  const mechanicsSchema = parseObject(mechanicsSchemaFile.bytes, "Mechanics schema");
  const validation = parseObject(validationFile.bytes, "Validation report");
  const validationSchema = parseObject(validationSchemaFile.bytes, "Validation schema");

  assertSchemaId(mechanicsSchema, mechanicsSchemaId, "Mechanics schema");
  assertSchemaId(validationSchema, validationSchemaId, "Validation schema");
  validateJsonSchema(mechanics, mechanicsSchema, "Mechanics input");
  validateJsonSchema(validation, validationSchema, "Validation report");

  const baseMechanics = mechanics as unknown as MovieReturnMechanics;
  const report = validation as unknown as ValidationArtifact;
  assertPassingReport(baseMechanics, report, mechanicsFile);

  const linkedMechanics: MovieReturnMechanics = {
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
  };
  validateJsonSchema(linkedMechanics, mechanicsSchema, "Linked mechanics output");
  const output = `${JSON.stringify(linkedMechanics, undefined, 2)}\n`;

  await Promise.all([
    assertInputUnchanged(mechanicsFile),
    assertInputUnchanged(mechanicsSchemaFile),
    assertInputUnchanged(validationFile),
    assertInputUnchanged(validationSchemaFile),
  ]);

  return writeImmutableArtifact(options.outputPath, output);
}

function assertPassingReport(
  mechanics: MovieReturnMechanics,
  report: ValidationArtifact,
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
  };
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

function assertSchemaId(
  schema: Record<string, unknown>,
  expected: string,
  label: string,
): void {
  if (schema.$id !== expected) {
    throw new Error(`${label} has an unexpected $id.`);
  }
}

function assertFileName(path: string, expected: string, label: string): void {
  if (basename(path) !== expected) {
    throw new Error(`${label} must be named ${expected}.`);
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
