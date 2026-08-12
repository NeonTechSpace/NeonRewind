import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import {
  assertArtifactContract,
  MovieReturnMechanicsSchema,
  MovieReturnObservationSchema,
  MovieReturnValidationSchema,
  type MovieReturnMechanics,
} from "@neonretrorewind/core";

import { writeImmutableArtifact, type ArtifactWriteStatus } from "./immutable-artifact.ts";
import {
  validateMovieReturnObservation,
  type MovieReturnObservation,
} from "./movie-return-observation.ts";
import type {
  MovieReturnValidationArtifact,
  ValidationSourceIdentity,
} from "./movie-return-validation-report.ts";
export interface MovieReturnValidationOptions {
  readonly observationPath: string;
  readonly mechanicsPath: string;
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
  const observation = assertArtifactContract(
    MovieReturnObservationSchema,
    files.observation.value,
    "Movie-return observation",
  );
  const mechanics = assertArtifactContract(
    MovieReturnMechanicsSchema,
    files.mechanics.value,
    "Movie-return mechanics",
  );
  assertLinkedInputs(observation, mechanics, files.mechanics);

  const artifact: MovieReturnValidationArtifact = MovieReturnValidationSchema.assert({
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
  });

  await Promise.all(Object.values(files).map(assertFileUnchanged));
  const content = `${JSON.stringify(artifact, undefined, 2)}\n`;
  const writeStatus = await writeImmutableArtifact(options.outputPath, content);
  return { artifact, writeStatus };
}

async function readFiles(options: MovieReturnValidationOptions) {
  const [observation, mechanics] = await Promise.all([
    readInput(options.observationPath, "Movie-return observation"),
    readInput(options.mechanicsPath, "Movie-return mechanics"),
  ]);
  return { observation, mechanics };
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
  } as ValidationSourceIdentity<ArtifactType>;
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

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

interface InputFile {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly sha256: string;
  readonly value: unknown;
}
