import assert from "node:assert/strict";
import test from "node:test";

import { NewReleaseMechanicsSchema } from "@neonretrorewind/core";

import { compileNewReleaseMechanics } from "../src/new-release-mechanics.ts";
import {
  createManagerTrace,
  createCandidateMapTrace,
  createCallTargetTrace,
  createMarketEntryTrace,
  createPropertyReaderTrace,
  createRequestGeneratorTrace,
  createSourceMapTrace,
  createWrapperTrace,
  newReleaseSources,
} from "./new-release-fixtures.ts";

test("compiles the complete normalized new-release mechanics", async () => {
  const mechanics = compileCurrent();

  assert.equal(mechanics.artifactType, "new-release-mechanics");
  assert.equal(mechanics.scope, "new-release");
  assert.deepEqual(mechanics.sources, newReleaseSources);

  assert.deepEqual(mechanics.unlock, {
    trigger: "reset-to-new-day-event",
    threshold: {
      origin: "first-save-game-day",
      elapsedDays: 2,
      operator: "greater-than-or-equal",
      currentDate: "weather-current-date",
    },
    mutation: {
      field: "ExampleReleaseKind",
      value: true,
      when: "threshold-reached",
    },
    evidence: {
      kind: "kismet-analysis",
      confidence: "direct",
      classPath: "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C",
      wrapperFunctions: {
        resetToNewDay: "Reset to new Day Event_Event",
        newReleaseCheck: "ExampleReleaseEnabled",
      },
      entryPoints: { resetToNewDay: 3364, newReleaseCheck: 3379 },
      eventGraphFunction: "ExecuteExampleGraph_ExampleUnlockSystem",
      statementIndexes: {
        resetCallsCheck: 3364,
        firstSaveDay: 3401,
        makeTwoDayTimespan: 3442,
        addThreshold: 3495,
        compareCurrentDate: 3533,
        condition: 3583,
        successJump: 3593,
        setUnlocked: 3352,
      },
    },
  });

  assert.equal(NewReleaseMechanicsSchema.allows(mechanics), true);
  assert.deepEqual(mechanics.requestSelection, {
    trigger: "return-movie-request",
    condition: {
      unlockField: "ExampleReleaseKind",
      requiredValue: true,
      operator: "and",
      randomGate: {
        function: "RandomBoolWithWeight",
        trueWeight: 0.5,
      },
    },
    effect: {
      guaranteedRequestStep: 1,
      runOptionalPass: false,
      newReleaseRequested: true,
      primaryRequestCode: 5,
      primaryRequestValue: true,
      outputs: {
        onlyNewRelease: true,
        mandatoryRequest: "primary-request-map",
      },
    },
    evidence: {
      kind: "kismet-analysis",
      confidence: "direct",
      classPath:
        "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C",
      functionName: "Return Example Request",
      statementIndexes: {
        randomCall: 2253,
        combineConditions: 2278,
        unlockRead: 2309,
        conditionBranch: 2328,
        setGuaranteedStep: 2342,
        disableOptionalPass: 2365,
        loopToDispatch: 2376,
        stepOneComparison: 2108,
        stepOneRoute: 2132,
        setNewReleaseRequested: 4028,
        setRequestValue: 4039,
        setRequestCode: 4050,
        addPrimaryRequest: 4092,
        setOnlyNewReleaseOutput: 3358,
        setMandatoryRequestOutput: 3396,
      },
    },
  });
  assert.deepEqual(mechanics.requestGeneration, {
    trigger: "generate-movie-request",
    selector: {
      function: "Return Example Request",
      successRequired: true,
      copiedOutputs: {
        onlyNewRelease: "only-new-release-output",
        primaryRequest: "mandatory-request-output",
        optionalRequest: "optional-request-output",
      },
      requestGenerated: true,
    },
    newReleaseCandidateSelection: {
      condition: {
        onlyNewRelease: true,
        gameModeType: "ExampleMode",
        randomGate: { function: "RandomBoolWithWeight", trueWeight: 0.66 },
        candidateCollection: "Example Candidate Map",
        candidateCount: "greater-than-zero",
        operator: "and",
      },
      enumeration: {
        keys: "map-keys",
        values: "map-values",
        pairing: "shared-array-index",
      },
      index: {
        function: "RandomInteger",
        input: "candidate-count-minus-one",
        engineSemantics: {
          engineVersion: "5.4",
          wrapper: "UKismetMathLibrary::RandomInteger",
          implementation: "FMath::RandHelper",
          positiveInputRange: "zero-inclusive-to-input-exclusive",
          nonPositiveInputResult: 0,
        },
        result: {
          oneCandidate: "index-zero",
          multipleCandidates: "zero-through-candidate-count-minus-two",
          finalEnumeratedPairSelectable: false,
        },
      },
    },
    effect: {
      requestMovieSku: "selected-key",
      reservedMovieProduct: "selected-value-product",
      generateSuccess: true,
      candidateSelectionRequiredForSuccess: false,
    },
    evidence: {
      kind: "kismet-and-engine-source-analysis",
      confidence: "direct",
      classPath:
        "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C",
      functionName: "Generate Example Request",
      statementIndexes: {
        selectorCall: 448,
        selectorSuccessBranch: 570,
        copyOnlyNewRelease: 735,
        copyMandatoryRequest: 1272,
        copyOptionalRequest: 1299,
        newReleaseBranch: 1331,
        randomGate: 1447,
        candidateCount: 1502,
        combinedCondition: 1631,
        enumerateKeys: 1702,
        enumerateValues: 1829,
        subtractOne: 2066,
        randomIndex: 2108,
        selectKey: 2176,
        assignMovieSku: 2213,
        selectValue: 2262,
        assignReservedProduct: 2299,
        setGenerateSuccess: 2336,
      },
      engineSource: {
        repository: "EpicGames/UnrealEngine",
        commit: "847de5e2553adeb4d3498953604d0b0abe669780",
        wrapperFile:
          "Engine/Source/Runtime/Engine/Classes/Kismet/KismetMathLibrary.inl",
        implementationFile:
          "Engine/Source/Runtime/Core/Public/Math/UnrealMathUtility.h",
      },
    },
  });
  assert.deepEqual(mechanics.sourceMapLifecycle, {
    collection: "Example Source Map",
    posterCollection: "Example Poster Map",
    restore: {
      trigger: "load",
      source: "Example Save Source Map",
      effect: "replace-source-map",
    },
    generation: {
      trigger: "generate-new-released-movie",
      dataTableObjectPath:
        "ExampleGame/Content/ExampleProject/core/blueprint/data/ExampleScheduleTable.ExampleScheduleTable",
      rowDiscovery: "data-table-row-names",
      rowLookup: "data-table-row-by-name",
      unlockPool: "rows-with-genre-present-in-movie-genres-unlock",
      selection: "random-unlock-pool-item",
      duplicateHandling: "remove-selected-item-and-retry",
      additions: {
        sourceMap: "selected-film-product-sku-to-new-release-film",
        posterMap: "selected-film-product-sku-to-new-release-film",
      },
    },
    cleanup: {
      iteration: "source-map-values",
      condition: "second-hand-available",
      removalKey: "iterated-value-product-sku",
    },
    evidence: {
      kind: "kismet-analysis",
      confidence: "direct",
      classPath:
        "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C",
      loadFunction: "ExampleLoad",
      eventGraphFunction: "ExecuteExampleGraph_ExampleManager",
      generationFunction: "ExampleGenerateRecord",
      statementIndexes: {
        loadWrapperCall: 18,
        restoreAssignment: 2886,
        dataTableAssignment: 5,
        rowNames: 535,
        rowLookup: 843,
        genreLookup: 930,
        addUnlockPool: 3559,
        randomPoolItem: 1241,
        findExisting: 1337,
        duplicateBranch: 1383,
        removeDuplicateFromPool: 1429,
        addSourceMap: 2129,
        addPosterMap: 2842,
        enumerateSourceValues: 2978,
        secondHandBranch: 3254,
        removeSecondHand: 3364,
        cleanupLoopBack: 3498,
      },
    },
  });
  assert.deepEqual(mechanics.candidateEligibility, {
    rebuild: {
      trigger: "filter-all-new-release-movie-data",
      requiresWeatherReference: true,
      sourceCollection: "Example Source Map",
      candidateCollection: "Example Candidate Map",
      candidateCollectionClearedBeforeScan: true,
      iteration: "source-map-values",
    },
    preconditions: {
      released: true,
      secondHandAvailable: false,
      operator: "and",
    },
    predicate: {
      function: "Evaluate Example Record",
      ownerClass: "ExampleRecord_C",
      durationDays: 7,
      elapsedDays: "days-passed-minus-available-in-game-day",
      comparison: "elapsed-days-less-than-or-equal-to-duration",
      lowerBoundEnforced: false,
      remainingDays: "available-in-game-day-plus-duration-minus-days-passed",
      gameModeCastFailure: { isNew: false, remainingDays: 0 },
    },
    outcomes: {
      eligible: {
        collection: "Example Candidate Map",
        key: "product-sku",
        secondHandAvailable: false,
        basePrice: 0,
      },
      preconditionFailure: {
        collection: "Example Source Map",
        effect: "no-mutation",
      },
      predicateFailure: {
        collection: "Example Source Map",
        key: "product-sku",
        secondHandAvailable: true,
        basePrice: 0,
      },
      remainingDaysConsumedByCaller: false,
    },
    evidence: {
      kind: "kismet-analysis",
      confidence: "direct",
      marketClassPath:
        "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C",
      rebuildFunction: "ExampleRebuildCandidates",
      filterFunction: "Filter Example Schedule",
      predicateClassPath:
        "ExampleGame/Content/ExampleProject/core/blueprint/data/ExampleRecord.ExampleRecord_C",
      predicateFunction: "Evaluate Example Record",
      bindingRule: "exact-context-object-class-and-declaration",
      relationship: "verified",
      statementIndexes: {
        clearCandidateCollection: 66,
        enumerateSourceValues: 118,
        callPerFilmFilter: 390,
        checkSecondHand: 10,
        checkReleased: 49,
        combinePreconditions: 88,
        preconditionBranch: 116,
        predicateCall: 152,
        predicateBranch: 203,
        addEligible: 418,
        addIneligible: 697,
        durationAssignment: 0,
        gameModeCastBranch: 117,
        elapsedSubtract: 1512,
        compareDuration: 1634,
        remainingAdd: 1680,
        remainingSubtract: 1744,
        setEligible: 1838,
        setRemainingDays: 1857,
        castFailureSetEligible: 1889,
        castFailureSetRemainingDays: 1900,
      },
    },
  });
});

test("rejects a changed reset wrapper entrypoint", () => {
  const wrapper = createWrapperTrace();
  const reset = wrapper.functions.find((function_) => function_.functionName === "Reset to new Day Event_Event");
  assert.ok(reset?.nodes[2]?.call);
  reset.nodes[2].call = {
    ...reset.nodes[2].call,
    integerArguments: [{ position: 0, value: "3365" }],
  };
  assert.throws(() => compileCurrent({ wrapper }), /integer arguments changed/u);
});

test("rejects a changed two-day threshold", () => {
  const manager = createManagerTrace();
  const timespan = manager.functions[0]!.nodes.find((node) => node.statementIndex === 3442);
  assert.ok(timespan?.call);
  timespan.call = {
    ...timespan.call,
    integerArguments: [
      { position: 0, value: "3" },
      ...timespan.call.integerArguments.slice(1),
    ],
  };
  assert.throws(() => compileCurrent({ manager }), /integer arguments changed/u);
});

test("rejects a changed threshold origin", () => {
  const manager = createManagerTrace();
  const origin = manager.functions[0]!.nodes.find((node) => node.statementIndex === 3504);
  assert.ok(origin);
  origin.symbol = "Another Date";
  assert.throws(() => compileCurrent({ manager }), /trace symbol changed/u);
});

test("rejects a reversed date comparison", () => {
  const manager = createManagerTrace();
  const compare = manager.functions[0]!.nodes.find((node) => node.statementIndex === 3533);
  assert.ok(compare?.call);
  compare.call = { ...compare.call, functionName: "Less_DateTimeDateTime" };
  assert.throws(() => compileCurrent({ manager }), /trace call changed/u);
});

test("rejects a changed success route", () => {
  const manager = createManagerTrace();
  const jump = manager.functions[0]!.nodes.find((node) => node.statementIndex === 3593);
  assert.ok(jump?.jump);
  jump.jump = {
    ...jump.jump,
    targets: [{ edge: "codeOffset", offset: 3600 }],
  };
  assert.throws(() => compileCurrent({ manager }), /trace branch changed/u);
});

test("rejects a changed mutation", () => {
  const manager = createManagerTrace();
  const field = manager.functions[0]!.nodes.find((node) => node.statementIndex === 3353);
  assert.ok(field);
  field.symbol = "Another Unlock";
  assert.throws(() => compileCurrent({ manager }), /trace symbol changed/u);
});

test("rejects traces from different builds", () => {
  const wrapper = createWrapperTrace();
  wrapper.build.steamBuildId = "1";
  assert.throws(() => compileCurrent({ wrapper }), /different game builds/u);
});

test("accepts matching input identities with different property order", () => {
  const wrapper = createWrapperTrace();
  wrapper.build = {
    steamBuildId: wrapper.build.steamBuildId,
    manifestSha256: wrapper.build.manifestSha256,
    steamAppId: wrapper.build.steamAppId,
  };
  wrapper.mappings = {
    formatVersion: wrapper.mappings.formatVersion,
    sha256: wrapper.mappings.sha256,
    fileName: wrapper.mappings.fileName,
    sizeBytes: wrapper.mappings.sizeBytes,
  };
  wrapper.engine = {
    confidence: wrapper.engine.confidence,
    source: wrapper.engine.source,
    cue4ParseProfile: wrapper.engine.cue4ParseProfile,
    version: wrapper.engine.version,
  };

  assert.doesNotThrow(() => compileCurrent({ wrapper }));
});

test("rejects a changed new-release request weight", () => {
  const propertyReader = createPropertyReaderTrace();
  const weight = propertyReader.functions[0]!.nodes.find(
    (node) => node.statementIndex === 2262,
  );
  assert.ok(weight?.literal);
  weight.literal = { ...weight.literal, value: "0.4" };
  assert.throws(() => compileCurrent({ propertyReader }), /trace literal changed/u);
});

test("rejects a changed new-release flag read", () => {
  const propertyReader = createPropertyReaderTrace();
  const unlockRead = propertyReader.functions[0]!.nodes.find(
    (node) => node.statementIndex === 2309,
  );
  assert.ok(unlockRead);
  unlockRead.symbol = "Another Unlock";
  assert.throws(() => compileCurrent({ propertyReader }), /trace symbol changed/u);
});

test("rejects a changed guaranteed-request route", () => {
  const propertyReader = createPropertyReaderTrace();
  const route = propertyReader.functions[0]!.nodes.find(
    (node) => node.statementIndex === 2132,
  );
  assert.ok(route?.jump);
  route.jump = {
    ...route.jump,
    targets: [{ edge: "codeOffset", offset: 4130 }],
  };
  assert.throws(() => compileCurrent({ propertyReader }), /trace branch changed/u);
});

test("rejects a changed primary request code", () => {
  const propertyReader = createPropertyReaderTrace();
  const requestCode = propertyReader.functions[0]!.nodes.find(
    (node) => node.statementIndex === 4068,
  );
  assert.ok(requestCode?.literal);
  requestCode.literal = { ...requestCode.literal, value: "6" };
  assert.throws(() => compileCurrent({ propertyReader }), /trace literal changed/u);
});

test("rejects a changed new-release output", () => {
  const propertyReader = createPropertyReaderTrace();
  const output = propertyReader.functions[0]!.nodes.find(
    (node) => node.statementIndex === 3368,
  );
  assert.ok(output);
  output.symbol = "lOld Movie Requested";
  assert.throws(() => compileCurrent({ propertyReader }), /trace symbol changed/u);
});

test("rejects a property-reader trace from another build", () => {
  const propertyReader = createPropertyReaderTrace();
  propertyReader.build.steamBuildId = "1";
  assert.throws(() => compileCurrent({ propertyReader }), /different game builds/u);
});

test("rejects a request generator whose selector failure route changed", () => {
  const requestGenerator = createRequestGeneratorTrace();
  const branch = requestGenerator.functions[0]!.nodes.find(
    (node) => node.statementIndex === 570,
  );
  assert.ok(branch?.jump);
  branch.jump = {
    ...branch.jump,
    targets: [{ edge: "codeOffset", offset: 786 }],
  };
  assert.throws(
    () => compileCurrent({ requestGenerator }),
    /trace branch changed/u,
  );
});

test("rejects a changed new-release candidate collection", () => {
  const requestGenerator = createRequestGeneratorTrace();
  const collection = requestGenerator.functions[0]!.nodes.find(
    (node) => node.statementIndex === 1577,
  );
  assert.ok(collection);
  collection.symbol = "Another Candidate Map";
  assert.throws(
    () => compileCurrent({ requestGenerator }),
    /candidate collection field changed/u,
  );
});

test("rejects a corrected random-index upper bound not present in the game", () => {
  const requestGenerator = createRequestGeneratorTrace();
  const subtract = requestGenerator.functions[0]!.nodes.find(
    (node) => node.statementIndex === 2066,
  );
  assert.ok(subtract?.call);
  subtract.call = {
    ...subtract.call,
    functionName: "Add_IntInt",
  };
  assert.throws(
    () => compileCurrent({ requestGenerator }),
    /trace call changed/u,
  );
});

test("rejects a request-generator trace from another build", () => {
  const requestGenerator = createRequestGeneratorTrace();
  requestGenerator.build.steamBuildId = "1";
  assert.throws(
    () => compileCurrent({ requestGenerator }),
    /different game builds/u,
  );
});

test("rejects a changed released-film gate", () => {
  const candidateMap = createCandidateMapTrace();
  const released = candidateMap.functions
    .find((function_) => function_.functionName === "Filter Example Schedule")!
    .nodes.find((node) => node.statementIndex === 76);
  assert.ok(released?.literal);
  released.literal = { ...released.literal, value: "false" };
  assert.throws(() => compileCurrent({ candidateMap }), /trace literal changed/u);
});

test("rejects candidate iteration over a different array index", () => {
  const candidateMap = createCandidateMapTrace();
  const index = candidateMap.functions
    .find((function_) => function_.functionName === "ExampleRebuildCandidates")!
    .nodes.find((node) => node.statementIndex === 371);
  assert.ok(index);
  index.symbol = "Unrelated_Array_Index";
  assert.throws(() => compileCurrent({ candidateMap }), /trace symbol changed/u);
});

test("rejects measuring a different candidate source array", () => {
  const candidateMap = createCandidateMapTrace();
  const measuredValues = candidateMap.functions
    .find((function_) => function_.functionName === "ExampleRebuildCandidates")!
    .nodes.find((node) => node.statementIndex === 241);
  assert.ok(measuredValues);
  measuredValues.symbol = "Unrelated_Map_Values";
  assert.throws(() => compileCurrent({ candidateMap }), /trace symbol changed/u);
});

test("rejects a changed candidate iteration back edge", () => {
  const candidateMap = createCandidateMapTrace();
  const loopBack = candidateMap.functions
    .find((function_) => function_.functionName === "ExampleRebuildCandidates")!
    .nodes.find((node) => node.statementIndex === 514);
  assert.ok(loopBack?.jump);
  loopBack.jump = {
    ...loopBack.jump,
    targets: [{ edge: "codeOffset", offset: 251 }],
  };
  assert.throws(() => compileCurrent({ candidateMap }), /trace branch changed/u);
});

test("rejects adding a different eligible record", () => {
  const candidateMap = createCandidateMapTrace();
  const insertedRecord = candidateMap.functions
    .find((function_) => function_.functionName === "Filter Example Schedule")!
    .nodes.find((node) => node.statementIndex === 481);
  assert.ok(insertedRecord);
  insertedRecord.symbol = "Unrelated_Film_Record";
  assert.throws(() => compileCurrent({ candidateMap }), /trace variable changed/u);
});

test("rejects adding a different predicate-failure record", () => {
  const candidateMap = createCandidateMapTrace();
  const insertedRecord = candidateMap.functions
    .find((function_) => function_.functionName === "Filter Example Schedule")!
    .nodes.find((node) => node.statementIndex === 760);
  assert.ok(insertedRecord);
  insertedRecord.symbol = "Unrelated_Film_Record";
  assert.throws(() => compileCurrent({ candidateMap }), /trace variable changed/u);
});

test("rejects a candidate key from a different film record", () => {
  const candidateMap = createCandidateMapTrace();
  const keySource = candidateMap.functions
    .find((function_) => function_.functionName === "Filter Example Schedule")!
    .nodes.find((node) => node.statementIndex === 472);
  assert.ok(keySource);
  keySource.symbol = "Unrelated_Film_Record";
  assert.throws(() => compileCurrent({ candidateMap }), /trace variable changed/u);
});

test("rejects a different SKU field as the candidate key", () => {
  const candidateMap = createCandidateMapTrace();
  const key = candidateMap.functions
    .find((function_) => function_.functionName === "Filter Example Schedule")!
    .nodes.find((node) => node.statementIndex === 436);
  assert.ok(key);
  key.symbol = "ExampleField15_0_00000000000000000000000000000000";
  assert.throws(() => compileCurrent({ candidateMap }), /trace context changed/u);
});

test("rejects a changed still-new duration", () => {
  const callTarget = createCallTargetTrace();
  const duration = callTarget.binding.function.nodes.find(
    (node) => node.statementIndex === 18,
  );
  assert.ok(duration?.literal);
  duration.literal = { ...duration.literal, value: "8" };
  assert.throws(() => compileCurrent({ callTarget }), /trace literal changed/u);
});

test("rejects a changed candidate-predicate receiver", () => {
  const callTarget = createCallTargetTrace();
  callTarget.binding.receiver.classPath =
    "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C";
  assert.throws(() => compileCurrent({ callTarget }), /target identity changed/u);
});

test("rejects a call target linked to another candidate-map trace", () => {
  const callTarget = createCallTargetTrace();
  callTarget.sourceTrace.sha256 = "f".repeat(64);
  assert.throws(
    () => compileCurrent({ callTarget }),
    /not bound to the candidate-map trace/u,
  );
});

test("rejects a changed new-release source DataTable", () => {
  const sourceMap = createSourceMapTrace();
  const generation = sourceMap.functions.find(
    (function_) => function_.functionName === "ExampleGenerateRecord",
  )!;
  const dataTable = generation.nodes.find(
    (node) => node.statementIndex === 15,
  )!.literal!;
  (dataTable as { value: string }).value = "ExampleGame/Content/Other.Other";

  assert.throws(
    () => compileCurrent({ sourceMap }),
    /object identity changed/u,
  );
});

test("rejects a changed genre-pool route", () => {
  const sourceMap = createSourceMapTrace();
  const generation = sourceMap.functions.find(
    (function_) => function_.functionName === "ExampleGenerateRecord",
  )!;
  const genreRoute = generation.nodes.find(
    (node) => node.statementIndex === 1023,
  )!.jump!.targets[0]!;
  (genreRoute as { offset: number }).offset = 3518;

  assert.throws(
    () => compileCurrent({ sourceMap }),
    /branch changed/u,
  );
});

test("rejects a changed Market load entrypoint", () => {
  const marketEntry = createMarketEntryTrace();
  const load = marketEntry.functions.find(
    (function_) => function_.functionName === "ExampleLoad",
  )!;
  const entryPoint = load.nodes.find(
    (node) => node.call?.functionName === "ExecuteExampleGraph_ExampleManager",
  )!.call!.integerArguments[0]!;
  (entryPoint as { value: string }).value = "2623";

  assert.throws(
    () => compileCurrent({ marketEntry }),
    /entrypoint changed/u,
  );
});

test("rejects cleanup of a different map", () => {
  const sourceMap = createSourceMapTrace();
  const generation = sourceMap.functions.find(
    (function_) => function_.functionName === "ExampleGenerateRecord",
  )!;
  generation.nodes.find((node) => node.statementIndex === 3373)!.symbol =
    "Example Poster Map";

  assert.throws(
    () => compileCurrent({ sourceMap }),
    /node changed/u,
  );
});

function compileCurrent(overrides: {
  manager?: ReturnType<typeof createManagerTrace>;
  propertyReader?: ReturnType<typeof createPropertyReaderTrace>;
  requestGenerator?: ReturnType<typeof createRequestGeneratorTrace>;
  marketEntry?: ReturnType<typeof createMarketEntryTrace>;
  sourceMap?: ReturnType<typeof createSourceMapTrace>;
  wrapper?: ReturnType<typeof createWrapperTrace>;
  candidateMap?: ReturnType<typeof createCandidateMapTrace>;
  callTarget?: ReturnType<typeof createCallTargetTrace>;
} = {}) {
  return compileNewReleaseMechanics(
    overrides.manager ?? createManagerTrace(),
    overrides.wrapper ?? createWrapperTrace(),
    overrides.propertyReader ?? createPropertyReaderTrace(),
    overrides.requestGenerator ?? createRequestGeneratorTrace(),
    overrides.marketEntry ?? createMarketEntryTrace(),
    overrides.sourceMap ?? createSourceMapTrace(),
    overrides.candidateMap ?? createCandidateMapTrace(),
    overrides.callTarget ?? createCallTargetTrace(),
    newReleaseSources,
  );
}
