import type { MovieReturnMechanics } from "@neonrewind/core";

import type {
  RentalBlueprintBodiesArtifact,
  RentalEvidenceArtifact,
} from "./rental-inputs.ts";
import {
  assertBlueprintFunction,
  assertRentalInputIdentity,
  findOne,
  findRentalBodyClass,
  findRentalEvidenceClass,
  type RentalMechanicSources,
} from "./rental-mechanic-evidence.ts";

const rentedFieldName = "Cartridge Base out for Rent";
const readyFieldName = "Cartridge Base out Ready to Return";
const firstProbabilityName = "Weight Chance of Returning at least one Cartridge";
const additionalProbabilityName = "Weight Chance of Returning more Cartridge";
const newDayFunction = "Weather - New Day Event";
const readinessFunction = "Get Movie ready for return";
const dispatcherFunction = "ExecuteUbergraph_RentSystem";
const selectionFunction = "Get Random List Of Cartridges From Rent List";
const newDayEntryPoint = 1792;
const readinessEntryPoint = 2592;

export type MovieReturnSources = RentalMechanicSources;

export function compileMovieReturnMechanics(
  rentalEvidence: RentalEvidenceArtifact,
  blueprintBodies: RentalBlueprintBodiesArtifact,
  sources: MovieReturnSources,
): MovieReturnMechanics {
  assertRentalInputIdentity(rentalEvidence, blueprintBodies, sources);
  const evidenceClass = findRentalEvidenceClass(rentalEvidence);
  const bodyClass = findRentalBodyClass(blueprintBodies);
  if (bodyClass.path !== evidenceClass.path) {
    throw new Error("Rental class paths differ between the two source artifacts.");
  }

  const rentedField = findQueueField(evidenceClass, rentedFieldName);
  const readyField = findQueueField(evidenceClass, readyFieldName);
  if (rentedField.type !== readyField.type) {
    throw new Error("Movie rental queues do not have one matching object-array type.");
  }
  const firstProbability = findProbabilityDefault(evidenceClass, firstProbabilityName);
  const additionalProbability = findProbabilityDefault(
    evidenceClass,
    additionalProbabilityName,
  );

  assertBlueprintFunction(bodyClass, newDayFunction, [
    `ExecuteUbergraph_RentSystem(${newDayEntryPoint})`,
  ]);
  assertBlueprintFunction(bodyClass, readinessFunction, [
    `ExecuteUbergraph_RentSystem(${readinessEntryPoint})`,
  ]);
  assertBlueprintFunction(bodyClass, dispatcherFunction, [
    "Label_1792:\n        Simulated New Day Event when SaveGame is Load = true;",
    "Get Movie ready for return();\n    \n        Get Console Rent ready for return();",
    "Label_2592:\n        goto Label_1832;",
    "Label_1832:\n        Array_Append(Cartridge Base out Ready to Return, Cartridge Base out for Rent);",
    "Cartridge Base out for Rent.Clear();",
  ]);
  assertBlueprintFunction(bodyClass, selectionFunction, [
    "List of Cartridge to return.Length",
    ">= 4",
    "Find a product = true",
    "Item founded = List of Cartridge to return",
    "Cartridge Base out for Rent.Length",
    ">= 3",
    "Weight Chance of Returning at least one Cartridge",
    "? 0.95 : CallFunc_SelectFloat_B_ImplicitCast_1",
    "List of Cartridge to return.Length",
    "<= 0",
    "Weight Chance of Returning more Cartridge",
    "UKismetMathLibrary::RandomBoolWithWeight",
    "Array_Random(Cartridge Base out Ready to Return",
    "CallFunc_Array_Random_OutIndex !== -1",
    "CallFunc_Array_AddUnique_ReturnValue = List of Cartridge to return.Add(CallFunc_Array_Random_OutItem)",
    "CallFunc_Greater_IntInt_ReturnValue = (CallFunc_Array_Length_ReturnValue_2 > 0)",
    "Item founded = TArray<Item founded>()",
  ]);
  assertNoSelectionCallerWithinArtifact(blueprintBodies);

  return {
    artifactType: "movie-return-mechanics",
    schemaVersion: 1,
    build: {
      steamAppId: rentalEvidence.build.steamAppId,
      steamBuildId: rentalEvidence.build.steamBuildId,
    },
    sources,
    scope: "movie-return-readiness-and-selection",
    evidenceLevel: "decompiled-blueprint",
    runtimeValidation: "not-run",
    readiness: {
      trigger: "new-day-event",
      source: {
        queue: "rented",
        evidence: createFieldEvidence(evidenceClass.path, rentedField.name),
      },
      destination: {
        queue: "ready-to-return",
        evidence: createFieldEvidence(evidenceClass.path, readyField.name),
      },
      transfer: "append-all",
      clearsSource: true,
      evidence: {
        newDayHandler: createEntrypointEvidence(
          bodyClass.path,
          newDayFunction,
          newDayEntryPoint,
        ),
        readinessHandler: createEntrypointEvidence(
          bodyClass.path,
          readinessFunction,
          readinessEntryPoint,
        ),
        dispatcher: createFunctionEvidence(bodyClass.path, dispatcherFunction),
      },
    },
    selection: {
      callerSearch: {
        coverage: "rental-blueprint-bodies",
        callerFound: false,
      },
      candidateQueue: "ready-to-return",
      maximumUniqueMovies: 4,
      firstAttempt: {
        defaultProbability: {
          value: firstProbability.value,
          evidence: createDefaultEvidence(evidenceClass.path, firstProbability.name),
        },
        override: {
          whenQueue: "rented",
          minimumLength: 3,
          probability: 0.95,
        },
      },
      additionalAttemptProbability: {
        value: additionalProbability.value,
        evidence: createDefaultEvidence(evidenceClass.path, additionalProbability.name),
      },
      randomDecision: "weighted-boolean-per-attempt",
      candidateChoice: "uniform-random",
      deduplication: "add-unique",
      outcomes: {
        weightedFailureWithNoSelection: "not-found-empty",
        weightedFailureWithSelection: "found-selected",
        missingCandidate: "not-found-empty",
      },
      evidence: createFunctionEvidence(bodyClass.path, selectionFunction),
    },
  };
}

function findQueueField(
  input: ReturnType<typeof findRentalEvidenceClass>,
  name: string,
) {
  const field = findOne(input.fields, (candidate) => candidate.name === name, `field ${name}`);
  if (field.arrayDimension !== 1 || !field.type.startsWith("Array<Object<")) {
    throw new Error(`Movie queue ${name} is not a one-dimensional object array.`);
  }
  return field;
}

function findProbabilityDefault(
  input: ReturnType<typeof findRentalEvidenceClass>,
  name: string,
) {
  const property = findOne(
    input.classDefault.properties,
    (candidate) => candidate.name === name,
    `default property ${name}`,
  );
  if (
    property.type !== "FloatProperty" ||
    property.arrayIndex !== 0 ||
    typeof property.value !== "number" ||
    !Number.isFinite(property.value) ||
    property.value < 0 ||
    property.value > 1
  ) {
    throw new Error(`Movie return probability ${name} is not a number from zero to one.`);
  }
  return { name: property.name, value: property.value };
}

function assertNoSelectionCallerWithinArtifact(input: RentalBlueprintBodiesArtifact): void {
  const needle = `${selectionFunction}(`;
  const occurrences = input.classes.reduce(
    (total, class_) => total + class_.pseudoCode.split(needle).length - 1,
    0,
  );
  if (occurrences !== 1) {
    throw new Error("Movie selection caller coverage changed in the rental Blueprint artifact.");
  }
}

function createFieldEvidence(classPath: string, fieldName: string) {
  return { artifactType: "rental-evidence" as const, classPath, fieldName };
}

function createDefaultEvidence(classPath: string, propertyName: string) {
  return { artifactType: "rental-evidence" as const, classPath, propertyName };
}

function createFunctionEvidence(classPath: string, functionName: string) {
  return { artifactType: "rental-blueprint-bodies" as const, classPath, functionName };
}

function createEntrypointEvidence(
  classPath: string,
  functionName: string,
  entryPoint: number,
) {
  return {
    ...createFunctionEvidence(classPath, functionName),
    entryPoint,
  };
}
