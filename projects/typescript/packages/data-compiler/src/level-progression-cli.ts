import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import {
  assertArtifactContract,
  BlueprintCallTargetTraceSchema,
  BlueprintFunctionTraceSchema,
  BlueprintPropertyReferenceTraceSchema,
  GameplayUnlockEnumSchema,
  LevelProgressionTargetProfileSchema,
  StructuredValuesSchema,
  type LevelProgressionArtifactIdentity,
} from "@neonretrorewind/core";

import { writeImmutableArtifact } from "./immutable-artifact.ts";
import {
  compileLevelProgression,
  type LevelProgressionSources,
} from "./level-progression.ts";

const invalidArgumentsExitCode = 2;
const inputFailureExitCode = 6;
const outputConflictExitCode = 7;

interface Options {
  readonly targetProfilePath: string;
  readonly structuredValuesPath: string;
  readonly gameplayUnlockEnumPath: string;
  readonly changeXpTracePath: string;
  readonly maximumCallerTracePath: string;
  readonly maximumTargetTracePath: string;
  readonly endOfDayTracePath: string;
  readonly outputPath: string;
}

export async function runLevelProgression(
  arguments_: readonly string[],
): Promise<void> {
  const options = parseOptions(arguments_);
  if (typeof options === "string") {
    console.error(options);
    writeLevelProgressionUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const [
      targetProfile,
      structuredValues,
      gameplayUnlockEnum,
      changeXp,
      maximumCaller,
      maximumTarget,
      endOfDay,
    ] =
      await Promise.all([
        readInput(options.targetProfilePath, "Level-progression target profile"),
        readInput(options.structuredValuesPath, "Structured-values"),
        readInput(options.gameplayUnlockEnumPath, "Gameplay-unlock enum"),
        readInput(options.changeXpTracePath, "Change-XP trace"),
        readInput(options.maximumCallerTracePath, "Maximum-XP caller trace"),
        readInput(options.maximumTargetTracePath, "Maximum-XP target trace"),
        readInput(options.endOfDayTracePath, "End-of-day Level trace"),
      ]);
    const sources: LevelProgressionSources = {
      targetProfile: {
        fileName: basename(targetProfile.path),
        sha256: targetProfile.sha256,
        sizeBytes: targetProfile.bytes.length,
        profileType: "level-progression-target-profile",
      },
      structuredValues: createIdentity(structuredValues, "structured-values"),
      gameplayUnlockEnum: createIdentity(
        gameplayUnlockEnum,
        "gameplay-unlock-enum",
      ),
      changeXpTrace: createIdentity(changeXp, "blueprint-function-trace"),
      maximumCallerTrace: createIdentity(
        maximumCaller,
        "blueprint-property-reference-trace",
      ),
      maximumTargetTrace: createIdentity(
        maximumTarget,
        "blueprint-call-target-trace",
      ),
      endOfDayTrace: createIdentity(
        endOfDay,
        "blueprint-property-reference-trace",
      ),
    };
    const progression = compileLevelProgression(
      assertArtifactContract(
        LevelProgressionTargetProfileSchema,
        targetProfile.value,
        "Level-progression target profile input",
      ),
      assertArtifactContract(
        StructuredValuesSchema,
        structuredValues.value,
        "Structured-values input",
      ),
      assertArtifactContract(
        GameplayUnlockEnumSchema,
        gameplayUnlockEnum.value,
        "Gameplay-unlock enum input",
      ),
      assertArtifactContract(
        BlueprintFunctionTraceSchema,
        changeXp.value,
        "Change-XP trace input",
      ),
      assertArtifactContract(
        BlueprintPropertyReferenceTraceSchema,
        maximumCaller.value,
        "Maximum-XP caller trace input",
      ),
      assertArtifactContract(
        BlueprintCallTargetTraceSchema,
        maximumTarget.value,
        "Maximum-XP target trace input",
      ),
      assertArtifactContract(
        BlueprintPropertyReferenceTraceSchema,
        endOfDay.value,
        "End-of-day Level trace input",
      ),
      sources,
    );
    const output = `${JSON.stringify(progression, undefined, 2)}\n`;

    await Promise.all(
      [
        targetProfile,
        structuredValues,
        gameplayUnlockEnum,
        changeXp,
        maximumCaller,
        maximumTarget,
        endOfDay,
      ].map(assertFileUnchanged),
    );
    const status = await writeImmutableArtifact(options.outputPath, output);
    if (status === "conflict") {
      console.error(
        `Level progression conflicts with existing output: ${options.outputPath}`,
      );
      process.exitCode = outputConflictExitCode;
      return;
    }

    const verb = status === "created" ? "wrote" : "is unchanged";
    console.log(`Level progression ${verb}: ${options.outputPath}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown failure.";
    console.error(`Level-progression compilation failed: ${message}`);
    process.exitCode = inputFailureExitCode;
  }
}

export function writeLevelProgressionUsage(
  stream: NodeJS.WritableStream,
): void {
  stream.write(
    "  neonretrorewind-data-compiler level-progression --target-profile <path> --structured-values <path> --gameplay-unlock-enum <path> --change-xp-trace <path> --maximum-caller-trace <path> --maximum-target-trace <path> --end-of-day-trace <path> --output <path>\n",
  );
}

function parseOptions(arguments_: readonly string[]): Options | string {
  const names = [
    "--target-profile",
    "--structured-values",
    "--gameplay-unlock-enum",
    "--change-xp-trace",
    "--maximum-caller-trace",
    "--maximum-target-trace",
    "--end-of-day-trace",
    "--output",
  ] as const;
  const allowed = new Set<string>(names);
  const values = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !allowed.has(name)) {
      return `Unknown level-progression option ${name ?? "<missing>"}.`;
    }
    if (value === undefined || value.startsWith("--")) {
      return `Expected a value for ${name}.`;
    }
    if (values.has(name)) {
      return `Option ${name} was provided more than once.`;
    }
    values.set(name, value);
  }
  const missing = names.filter((name) => !values.has(name));
  if (missing.length > 0) {
    return `Expected all level-progression inputs and --output, missing ${missing.join(", ")}.`;
  }
  return {
    targetProfilePath: values.get("--target-profile")!,
    structuredValuesPath: values.get("--structured-values")!,
    gameplayUnlockEnumPath: values.get("--gameplay-unlock-enum")!,
    changeXpTracePath: values.get("--change-xp-trace")!,
    maximumCallerTracePath: values.get("--maximum-caller-trace")!,
    maximumTargetTracePath: values.get("--maximum-target-trace")!,
    endOfDayTracePath: values.get("--end-of-day-trace")!,
    outputPath: values.get("--output")!,
  };
}

async function readInput(path: string, label: string): Promise<InputFile> {
  const bytes = await readFile(path);
  return {
    path,
    bytes,
    sha256: sha256(bytes),
    value: parseJson(bytes, `${label} input`),
  };
}

function createIdentity<
  ArtifactType extends LevelProgressionArtifactIdentity["artifactType"],
>(
  input: InputFile,
  artifactType: ArtifactType,
): Extract<
  LevelProgressionArtifactIdentity,
  { readonly artifactType: ArtifactType }
> {
  return {
    fileName: basename(input.path),
    sha256: input.sha256,
    sizeBytes: input.bytes.length,
    artifactType,
  } as Extract<
    LevelProgressionArtifactIdentity,
    { readonly artifactType: ArtifactType }
  >;
}

async function assertFileUnchanged(input: InputFile): Promise<void> {
  const finalBytes = await readFile(input.path);
  if (
    finalBytes.length !== input.bytes.length ||
    sha256(finalBytes) !== input.sha256
  ) {
    throw new Error(`Input changed during compilation: ${input.path}`);
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
