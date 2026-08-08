import type { MovieReturnMechanics } from "@neonretrorewind/core";

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

const rentedFieldName = "Example Active Items";
const readyFieldName = "Example Ready Items";
const firstProbabilityName = "Example Initial Weight";
const additionalProbabilityName = "Example Additional Weight";
const newDayFunction = "Example Period Event";
const readinessFunction = "Prepare Example Items";
const dispatcherFunction = "ExecuteExampleGraph_ExampleQueueSystem";
const selectionFunction = "Select Example Items";
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
    `ExecuteExampleGraph_ExampleQueueSystem(${newDayEntryPoint})`,
  ]);
  assertBlueprintFunction(bodyClass, readinessFunction, [
    `ExecuteExampleGraph_ExampleQueueSystem(${readinessEntryPoint})`,
  ]);
  assertBlueprintFunction(bodyClass, dispatcherFunction, [
    "Label_1792:\n        Simulated New Day Event when SaveGame is Load = true;",
    "Prepare Example Items();\n    \n        Prepare Example Devices();",
    "Label_2592:\n        goto Label_1832;",
    "Label_1832:\n        Array_Append(Example Ready Items, Example Active Items);",
    "Example Active Items.Clear();",
  ]);
  assertBlueprintFunction(bodyClass, selectionFunction, [
    "Example Selected Items.Length",
    ">= 4",
    "Find a product = true",
    "Item founded = Example Selected Items",
    "Example Active Items.Length",
    ">= 3",
    "Example Initial Weight",
    "? 0.95 : ExampleSymbol_203da61871cf",
    "Example Selected Items.Length",
    "<= 0",
    "Example Additional Weight",
    "UKismetMathLibrary::RandomBoolWithWeight",
    "Array_Random(Example Ready Items",
    "ExampleSymbol_0ab7d40dbb1d !== -1",
    "ExampleSymbol_6777d42deb5f = Example Selected Items.Add(ExampleSymbol_0e79e7bf84f2)",
    "ExampleSymbol_b752835dd3cc = (ExampleSymbol_5b49cd8b7a54 > 0)",
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
