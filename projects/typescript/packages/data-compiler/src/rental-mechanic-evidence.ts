import type { RentalArtifactIdentity } from "@neonretrorewind/core";

import type {
  RentalBlueprintBodiesArtifact,
  RentalBlueprintClassEvidence,
  RentalBlueprintFunctionInput,
  RentalEvidenceArtifact,
} from "./rental-inputs.ts";

export const rentalPackagePath =
  "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.uasset";
export const rentalClassName = "ExampleQueueSystem_C";

export interface RentalMechanicSources {
  readonly rentalEvidence: RentalArtifactIdentity<"rental-evidence">;
  readonly rentalBlueprintBodies: RentalArtifactIdentity<"rental-blueprint-bodies">;
}

export function assertRentalInputIdentity(
  rentalEvidence: RentalEvidenceArtifact,
  blueprintBodies: RentalBlueprintBodiesArtifact,
  sources: RentalMechanicSources,
): void {
  if (rentalEvidence.artifactType !== "rental-evidence") {
    throw new Error("Expected a rental-evidence artifact.");
  }
  if (
    blueprintBodies.artifactType !== "rental-blueprint-bodies"
  ) {
    throw new Error("Expected a rental-blueprint-bodies artifact.");
  }
  if (
    sources.rentalEvidence.artifactType !== rentalEvidence.artifactType ||
    sources.rentalBlueprintBodies.artifactType !== blueprintBodies.artifactType
  ) {
    throw new Error("Source identities do not match their acquisition artifacts.");
  }
  if (
    rentalEvidence.build.manifestSha256 !== blueprintBodies.build.manifestSha256 ||
    rentalEvidence.build.steamAppId !== blueprintBodies.build.steamAppId ||
    rentalEvidence.build.steamBuildId !== blueprintBodies.build.steamBuildId ||
    rentalEvidence.mappings.sha256 !== blueprintBodies.mappings.sha256
  ) {
    throw new Error("Rental source artifacts do not belong to the same build and mappings.");
  }
}

export function findRentalEvidenceClass(
  input: RentalEvidenceArtifact,
): RentalBlueprintClassEvidence {
  const package_ = findOne(
    input.packages,
    (candidate) => candidate.path === rentalPackagePath,
    `package ${rentalPackagePath}`,
  );
  return findOne(
    package_.blueprintClasses,
    (candidate) => candidate.name === rentalClassName,
    `class ${rentalClassName}`,
  );
}

export function findRentalBodyClass(input: RentalBlueprintBodiesArtifact) {
  return findOne(
    input.classes,
    (candidate) =>
      candidate.packagePath === rentalPackagePath && candidate.name === rentalClassName,
    `Blueprint body class ${rentalClassName}`,
  );
}

export function assertBlueprintFunction(
  input: ReturnType<typeof findRentalBodyClass>,
  name: string,
  requiredExpressions: readonly string[],
): RentalBlueprintFunctionInput {
  const function_ = findOne(
    input.functions,
    (candidate) => candidate.name === name,
    `function ${name}`,
  );
  if (function_.bytecodeExpressionCount < 1) {
    throw new Error(`Function ${name} has no parsed bytecode expressions.`);
  }
  const pseudoCode = findFunctionPseudoCode(input.pseudoCode, name);
  for (const expression of requiredExpressions) {
    if (!pseudoCode.includes(expression)) {
      throw new Error(`Function ${name} no longer contains required static evidence.`);
    }
  }
  return function_;
}

export function findOne<T>(
  values: readonly T[],
  predicate: (value: T) => boolean,
  label: string,
): T {
  const matches = values.filter(predicate);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one ${label}.`);
  }
  return matches[0] as T;
}

function findFunctionPseudoCode(pseudoCode: string, name: string): string {
  const lines = pseudoCode.split(/\r?\n/u);
  const headerPattern = /^    (?:public|private|protected) /u;
  const matchingHeaders = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => headerPattern.test(line) && line.includes(` ${name}(`));
  if (matchingHeaders.length !== 1) {
    throw new Error(`Expected exactly one pseudocode body for function ${name}.`);
  }

  const start = matchingHeaders[0]!.index;
  const nextFunctionComment = lines.findIndex(
    (line, index) => index > start && /^    \/\/ \(/u.test(line),
  );
  const end = nextFunctionComment === -1 ? lines.length : nextFunctionComment;
  return lines.slice(start, end).join("\n");
}
