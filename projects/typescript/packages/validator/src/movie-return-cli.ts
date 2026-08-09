import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import type { MovieReturnMechanics } from "@neonretrorewind/core";

import { writeImmutableArtifact, type ArtifactWriteStatus } from "./immutable-artifact.ts";
import {
  validateMovieReturnObservation,
  type MovieReturnObservation,
} from "./movie-return-observation.ts";
import type {
  MovieReturnValidationArtifact,
  ValidationSourceIdentity,
} from "./movie-return-validation-report.ts";
import { validateJsonSchema } from "./schema-validation.ts";

const schemaIds = {
  observation: "urn:neonretrorewind:schema:runtime:movie-return-observation",
  mechanics: "urn:neonretrorewind:schema:domain:movie-return-mechanics",
  report: "urn:neonretrorewind:schema:validation:movie-return-validation",
} as const;

export interface MovieReturnValidationOptions {
  readonly observationPath: string;
  readonly observationSchemaPath: string;
  readonly mechanicsPath: string;
  readonly mechanicsSchemaPath: string;
  readonly reportSchemaPath: string;
  readonly outputPath: string;
}

export interface MovieReturnValidationRun {
  readonly artifact: MovieReturnValidationArtifact;
  readonly writeStatus: ArtifactWriteStatus;
}

export async function validateMovieReturnFiles(
  options: MovieReturnValidationOptions,
): Promise<MovieReturnValidationRun> {
  const files = await readFiles(options);
  const observationSchema = requireSchema(
    files.observationSchema.value,
    schemaIds.observation,
    "Movie-return observation schema",
  );
  const mechanicsSchema = requireSchema(
    files.mechanicsSchema.value,
    schemaIds.mechanics,
    "Movie-return mechanics schema",
  );
  const reportSchema = requireSchema(
    files.reportSchema.value,
    schemaIds.report,
    "Movie-return validation schema",
  );

  validateJsonSchema(
    files.observation.value,
    observationSchema,
    "Movie-return observation",
  );
  validateJsonSchema(files.mechanics.value, mechanicsSchema, "Movie-return mechanics");

  const observation = files.observation.value as MovieReturnObservation;
  const mechanics = files.mechanics.value as MovieReturnMechanics;
  assertLinkedInputs(observation, mechanics, files.mechanics);

  const artifact: MovieReturnValidationArtifact = {
    artifactType: "movie-return-runtime-validation",
    build: {
      steamAppId: observation.build.steamAppId,
      steamBuildId: observation.build.steamBuildId,
    },
    validator: {
      name: "@neonretrorewind/validator",
      version: "0.0.0",
    },
    sources: {
      observation: createSourceIdentity(
        files.observation,
        "movie-return-runtime-observation",
      ),
      mechanics: createSourceIdentity(
        files.mechanics,
        "movie-return-mechanics",
      ),
    },
    validation: validateMovieReturnObservation(observation, mechanics),
  };
  validateJsonSchema(artifact, reportSchema, "Movie-return validation report");

  await Promise.all(Object.values(files).map(assertFileUnchanged));
  const content = `${JSON.stringify(artifact, undefined, 2)}\n`;
  const writeStatus = await writeImmutableArtifact(options.outputPath, content);
  return { artifact, writeStatus };
}

async function readFiles(options: MovieReturnValidationOptions) {
  const [observation, observationSchema, mechanics, mechanicsSchema, reportSchema] =
    await Promise.all([
      readInput(options.observationPath, "Movie-return observation"),
      readInput(options.observationSchemaPath, "Movie-return observation schema"),
      readInput(options.mechanicsPath, "Movie-return mechanics"),
      readInput(options.mechanicsSchemaPath, "Movie-return mechanics schema"),
      readInput(options.reportSchemaPath, "Movie-return validation schema"),
    ]);
  return { observation, observationSchema, mechanics, mechanicsSchema, reportSchema };
}

async function readInput(path: string, label: string): Promise<InputFile> {
  const bytes = await readFile(path);
  return {
    path,
    bytes,
    sha256: sha256(bytes),
    value: parseJson(bytes, label),
  };
}

function requireSchema(value: unknown, expectedId: string, label: string): object {
  assertObject(value, label);
  if (!("$id" in value) || value.$id !== expectedId) {
    throw new Error(`${label} does not have the expected $id ${expectedId}.`);
  }
  return value;
}

function assertLinkedInputs(
  observation: MovieReturnObservation,
  mechanics: MovieReturnMechanics,
  mechanicsFile: InputFile,
): void {
  const target = observation.targetMechanics;
  if (
    target.fileName !== basename(mechanicsFile.path) ||
    target.sizeBytes !== mechanicsFile.bytes.length ||
    target.sha256 !== mechanicsFile.sha256 ||
    target.artifactType !== mechanics.artifactType
  ) {
    throw new Error(
      "Movie-return observation does not reference the supplied mechanics artifact.",
    );
  }
  if (
    observation.build.steamAppId !== mechanics.build.steamAppId ||
    observation.build.steamBuildId !== mechanics.build.steamBuildId
  ) {
    throw new Error("Movie-return observation and mechanics use different game builds.");
  }
}

function createSourceIdentity<
  ArtifactType extends
    | "movie-return-runtime-observation"
    | "movie-return-mechanics",
>(
  file: InputFile,
  artifactType: ArtifactType,
): ValidationSourceIdentity<ArtifactType> {
  return {
    fileName: basename(file.path),
    sizeBytes: file.bytes.length,
    sha256: file.sha256,
    artifactType,
  };
}

async function assertFileUnchanged(file: InputFile): Promise<void> {
  const current = await readFile(file.path);
  if (current.length !== file.bytes.length || sha256(current) !== file.sha256) {
    throw new Error(`Input changed during validation: ${file.path}`);
  }
}

function parseJson(bytes: Uint8Array, label: string): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

function assertObject(value: unknown, label: string): asserts value is object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
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
