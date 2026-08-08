import type {
  ConsoleReturnMechanics,
  RentalArtifactIdentity,
} from "@neonrewind/core";

import type {
  RentalBlueprintBodiesArtifact,
  RentalBlueprintClassEvidence,
  RentalEvidenceArtifact,
} from "./rental-inputs.ts";

const rentalPackagePath =
  "RetroRewind/Content/VideoStore/core/blueprint/RentSystem/RentSystem.uasset";
const rentalClassName = "RentSystem_C";
const rentalDurationProperty = "Number of day a console is rented";
const eligibilityFunction = "Is this console ready to come back from rent";
const queueFunction = "Get Console Rent ready for return";
const rentedField = "Console Base out for Rent";
const readyField = "Console Base out Ready to Return";

export interface ConsoleReturnSources {
  readonly rentalEvidence: RentalArtifactIdentity;
  readonly rentalBlueprintBodies: RentalArtifactIdentity;
}

export function compileConsoleReturnMechanics(
  rentalEvidence: RentalEvidenceArtifact,
  blueprintBodies: RentalBlueprintBodiesArtifact,
  sources: ConsoleReturnSources,
): ConsoleReturnMechanics {
  assertInputIdentity(rentalEvidence, blueprintBodies, sources);
  const evidenceClass = findEvidenceClass(rentalEvidence);
  const bodyClass = findBodyClass(blueprintBodies);
  if (bodyClass.path !== evidenceClass.path) {
    throw new Error("Rental class paths differ between the two source artifacts.");
  }

  const duration = findOne(
    evidenceClass.classDefault.properties,
    (property) => property.name === rentalDurationProperty,
    `default property ${rentalDurationProperty}`,
  );
  if (
    duration.type !== "IntProperty" ||
    duration.arrayIndex !== 0 ||
    typeof duration.value !== "number" ||
    !Number.isSafeInteger(duration.value) ||
    duration.value < 1
  ) {
    throw new Error("Console rental duration is not a positive integer default.");
  }

  const rented = findField(evidenceClass, rentedField);
  const ready = findField(evidenceClass, readyField);
  if (
    rented.arrayDimension !== 1 ||
    ready.arrayDimension !== 1 ||
    rented.type !== ready.type ||
    !rented.type.startsWith("Array<Object<")
  ) {
    throw new Error("Console rental queues do not have one matching object-array type.");
  }

  assertFunction(bodyClass, eligibilityFunction, [
    "Weather Actor ref->Days Passed - Console to Test->The Game Day It Was Rent",
    ">= Number of day a console is rented",
    "ReturnValue = false",
  ]);
  assertFunction(bodyClass, queueFunction, [
    "Is this console ready to come back from rent(CallFunc_Array_Get_Item_1)",
    "if (!CallFunc_Is_this_console_ready_to_come_back_from_rent_ReturnValue)",
    "Console Base out Ready to Return.Add(CallFunc_Array_Get_Item_1)",
    "Console Base out for Rent.Remove(CallFunc_Array_Get_Item)",
  ]);

  return {
    artifactType: "console-return-mechanics",
    schemaVersion: 1,
    build: {
      steamAppId: rentalEvidence.build.steamAppId,
      steamBuildId: rentalEvidence.build.steamBuildId,
    },
    sources,
    scope: "console-return",
    evidenceLevel: "decompiled-blueprint",
    runtimeValidation: "not-run",
    configuration: {
      rentalDurationDays: {
        value: duration.value,
        evidence: {
          artifactType: "rental-evidence",
          classPath: evidenceClass.path,
          propertyName: duration.name,
        },
      },
    },
    eligibility: {
      missingWeatherActorResult: false,
      elapsedDays: {
        currentDay: "weather-days-passed",
        rentalStartDay: "console-rental-start-day",
        operator: "greater-than-or-equal",
        threshold: "rental-duration-days",
      },
      evidence: {
        artifactType: "rental-blueprint-bodies",
        classPath: bodyClass.path,
        functionName: eligibilityFunction,
      },
    },
    queueTransition: {
      when: "eligible",
      source: "rented",
      destination: "ready-to-return",
      removesFromSource: true,
      evidence: {
        artifactType: "rental-blueprint-bodies",
        classPath: bodyClass.path,
        functionName: queueFunction,
      },
    },
  };
}

function assertInputIdentity(
  rentalEvidence: RentalEvidenceArtifact,
  blueprintBodies: RentalBlueprintBodiesArtifact,
  sources: ConsoleReturnSources,
): void {
  if (rentalEvidence.artifactType !== "rental-evidence" || rentalEvidence.schemaVersion !== 1) {
    throw new Error("Expected rental-evidence schema version 1.");
  }
  if (
    blueprintBodies.artifactType !== "rental-blueprint-bodies" ||
    blueprintBodies.schemaVersion !== 1
  ) {
    throw new Error("Expected rental-blueprint-bodies schema version 1.");
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

function findEvidenceClass(input: RentalEvidenceArtifact): RentalBlueprintClassEvidence {
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

function findBodyClass(input: RentalBlueprintBodiesArtifact) {
  return findOne(
    input.classes,
    (candidate) =>
      candidate.packagePath === rentalPackagePath && candidate.name === rentalClassName,
    `Blueprint body class ${rentalClassName}`,
  );
}

function findField(input: RentalBlueprintClassEvidence, name: string) {
  return findOne(input.fields, (field) => field.name === name, `field ${name}`);
}

function assertFunction(
  input: ReturnType<typeof findBodyClass>,
  name: string,
  requiredExpressions: readonly string[],
): void {
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

function findOne<T>(
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
