import type {
  MovieReturnCallerArtifactIdentity,
  MovieReturnMechanics,
} from "@neonrewind/core";

import type {
  BlueprintCallerBodiesArtifact,
  BlueprintCallSitesArtifact,
} from "./blueprint-caller-inputs.ts";
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
const callerPackagePath =
  "RetroRewind/Content/VideoStore/core/ai/pawn/AI_Client_Character.uasset";
const callerClassName = "AI_Client_Character_C";
const callerClassPath =
  "RetroRewind/Content/VideoStore/core/ai/pawn/AI_Client_Character.AI_Client_Character_C";
const callerFunction = "Initial creation - Get if I have Product to return";
const callerFunctionPath = `${callerClassPath}:${callerFunction}`;
const callerStatementIndexes = [465, 519] as const;
const newDayEntryPoint = 1792;
const readinessEntryPoint = 2592;

export interface MovieReturnSources extends RentalMechanicSources {
  readonly blueprintCallSites: MovieReturnCallerArtifactIdentity<"blueprint-call-sites">;
  readonly blueprintCallerBodies: MovieReturnCallerArtifactIdentity<"blueprint-caller-bodies">;
}

export function compileMovieReturnMechanics(
  rentalEvidence: RentalEvidenceArtifact,
  blueprintBodies: RentalBlueprintBodiesArtifact,
  callSites: BlueprintCallSitesArtifact,
  callerBodies: BlueprintCallerBodiesArtifact,
  sources: MovieReturnSources,
): MovieReturnMechanics {
  assertRentalInputIdentity(rentalEvidence, blueprintBodies, sources);
  assertCallerInputIdentity(rentalEvidence, callSites, callerBodies, sources);
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
  assertSelectionDefinitionIsOnlyOccurrence(blueprintBodies);
  const callerFunctionBody = assertCustomerSelectionFlow(callSites, callerBodies);

  return {
    artifactType: "movie-return-mechanics",
    schemaVersion: 2,
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
        coverage: "all-parsed-blueprint-function-packages",
        candidatePackageCount: callSites.totals.candidatePackageCount,
        scannedPackageCount: callSites.totals.scannedPackageCount,
        failedPackageCount: 0,
        callerFound: true,
        callSiteCount: 2,
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
      customerFlow: {
        callerClass: callerClassName,
        callerFunction,
        productPriority: "ready-console-before-movies",
        movieSelectionWhen: "no-ready-console-found",
        selectorCallCount: 2,
        selectorNotFound: "return-without-product",
        selectedMovies: {
          iteration: "all-returned-movies",
          destination: "customer-inventory",
          removesFromCandidateQueue: true,
        },
        evidence: {
          artifactType: "blueprint-caller-bodies",
          classPath: callerFunctionBody.classPath,
          functionName: callerFunctionBody.functionName,
          statementIndexes: callerFunctionBody.calls.map((call) => call.statementIndex),
        },
      },
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

function assertSelectionDefinitionIsOnlyOccurrence(input: RentalBlueprintBodiesArtifact): void {
  const needle = `${selectionFunction}(`;
  const occurrences = input.classes.reduce(
    (total, class_) => total + class_.pseudoCode.split(needle).length - 1,
    0,
  );
  if (occurrences !== 1) {
    throw new Error("Movie selection caller coverage changed in the rental Blueprint artifact.");
  }
}

function assertCallerInputIdentity(
  rentalEvidence: RentalEvidenceArtifact,
  callSites: BlueprintCallSitesArtifact,
  callerBodies: BlueprintCallerBodiesArtifact,
  sources: MovieReturnSources,
): void {
  if (
    callSites.artifactType !== "blueprint-call-sites" ||
    callSites.schemaVersion !== 1 ||
    callerBodies.artifactType !== "blueprint-caller-bodies" ||
    callerBodies.schemaVersion !== 1
  ) {
    throw new Error("Expected version 1 Blueprint caller acquisition artifacts.");
  }

  assertSameBuild(rentalEvidence.build, callSites.build, "Blueprint call sites");
  assertSameBuild(rentalEvidence.build, callerBodies.build, "Blueprint caller bodies");
  assertSameMappings(rentalEvidence.mappings, callSites.mappings, "Blueprint call sites");
  assertSameMappings(rentalEvidence.mappings, callerBodies.mappings, "Blueprint caller bodies");

  if (
    callerBodies.callSites.fileName !== sources.blueprintCallSites.fileName ||
    callerBodies.callSites.sizeBytes !== sources.blueprintCallSites.sizeBytes ||
    callerBodies.callSites.sha256 !== sources.blueprintCallSites.sha256 ||
    callerBodies.callSites.schemaVersion !== sources.blueprintCallSites.schemaVersion ||
    sources.blueprintCallSites.artifactType !== "blueprint-call-sites" ||
    sources.blueprintCallerBodies.artifactType !== "blueprint-caller-bodies"
  ) {
    throw new Error("Blueprint caller bodies do not reference the supplied call-site artifact.");
  }
}

function assertSameBuild(
  expected: RentalEvidenceArtifact["build"],
  actual: BlueprintCallSitesArtifact["build"],
  label: string,
): void {
  if (
    actual.manifestSha256 !== expected.manifestSha256 ||
    actual.manifestSchemaVersion !== expected.manifestSchemaVersion ||
    actual.steamAppId !== expected.steamAppId ||
    actual.steamBuildId !== expected.steamBuildId
  ) {
    throw new Error(`${label} does not belong to the rental-evidence build.`);
  }
}

function assertSameMappings(
  expected: RentalEvidenceArtifact["mappings"],
  actual: BlueprintCallSitesArtifact["mappings"],
  label: string,
): void {
  if (
    actual.fileName !== expected.fileName ||
    actual.sizeBytes !== expected.sizeBytes ||
    actual.sha256 !== expected.sha256 ||
    actual.formatVersion !== expected.formatVersion
  ) {
    throw new Error(`${label} does not use the rental-evidence mappings.`);
  }
}

function assertCustomerSelectionFlow(
  callSites: BlueprintCallSitesArtifact,
  callerBodies: BlueprintCallerBodiesArtifact,
) {
  if (
    callSites.target.functionName !== selectionFunction ||
    callerBodies.target.functionName !== selectionFunction ||
    callSites.candidateRule !== "parsed-packages-with-function-exports" ||
    callSites.coverage !== "complete" ||
    callSites.failures.length !== 0 ||
    callSites.totals.failedPackageCount !== 0 ||
    callSites.totals.candidatePackageCount !== callSites.totals.scannedPackageCount ||
    callSites.totals.callSiteCount !== callSites.callSites.length ||
    callSites.totals.callSiteCount !== 2
  ) {
    throw new Error("Movie selector call-site coverage changed.");
  }

  const expectedSites = callerStatementIndexes.map((statementIndex) => ({
    packagePath: callerPackagePath,
    className: callerClassName,
    classPath: callerClassPath,
    functionName: callerFunction,
    functionPath: callerFunctionPath,
    callKind: "local-virtual" as const,
    statementIndex,
  }));
  if (JSON.stringify(callSites.callSites) !== JSON.stringify(expectedSites)) {
    throw new Error("Movie selector call sites changed.");
  }

  if (
    callerBodies.totals.packageCount !== 1 ||
    callerBodies.totals.classCount !== 1 ||
    callerBodies.totals.functionCount !== 1 ||
    callerBodies.totals.callSiteCount !== 2 ||
    callerBodies.functions.length !== 1
  ) {
    throw new Error("Movie selector caller-body totals changed.");
  }

  const functionBody = callerBodies.functions[0]!;
  if (
    functionBody.packagePath !== callerPackagePath ||
    functionBody.className !== callerClassName ||
    functionBody.classPath !== callerClassPath ||
    functionBody.functionName !== callerFunction ||
    functionBody.functionPath !== callerFunctionPath ||
    functionBody.calls.length !== 2 ||
    JSON.stringify(functionBody.calls) !==
      JSON.stringify(
        callerStatementIndexes.map((statementIndex) => ({
          callKind: "local-virtual",
          statementIndex,
        })),
      ) ||
    callerBodies.totals.pseudoCodeCharacterCount !== functionBody.pseudoCode.length
  ) {
    throw new Error("Movie selector caller function changed.");
  }

  const selectorNeedle = `${selectionFunction}(`;
  if (functionBody.pseudoCode.split(selectorNeedle).length - 1 !== 2) {
    throw new Error("Movie selector invocation count changed in the caller body.");
  }

  assertOrderedEvidence(functionBody.pseudoCode, [
    "Get Random Console From Rent Console List(",
    "if (!CallFunc_Get_Random_Console_From_Rent_Console_List_Find_a_product)",
    "Label_399:",
    `K2Node_DynamicCast_AsCore_Gamemode->Actor Gatherer->RentSystem->${selectorNeedle}`,
    `ref to Rent system->${selectorNeedle}`,
    "if (!CallFunc_Get_Random_List_Of_Cartridges_From_Rent_List_Find_a_product)",
    "CallFunc_Array_Length_ReturnValue = CallFunc_Get_Random_List_Of_Cartridges_From_Rent_List_Item_founded.Length",
    "Add Object To Inventory(current Cartridge in loop, false);",
    "Remove Product From Rent Out Ready List(current Cartridge in loop",
  ]);

  return functionBody;
}

function assertOrderedEvidence(pseudoCode: string, fragments: readonly string[]): void {
  let cursor = 0;
  for (const fragment of fragments) {
    const index = pseudoCode.indexOf(fragment, cursor);
    if (index < 0) {
      throw new Error(`Movie caller is missing required static evidence: ${fragment}`);
    }
    cursor = index + fragment.length;
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
