import type {
  NewReleaseArtifactIdentity,
  NewReleaseMechanics,
} from "@neonretrorewind/core";
import { NewReleaseMechanicsSchema } from "@neonretrorewind/core";

import {
  assertTraceCall,
  assertTraceJump,
  assertTraceLiteralChild,
  assertTraceNodeTree,
  assertTraceRootNode,
  assertTraceSymbolChild,
  findTraceCall,
  findTraceFunction,
  findTraceNode,
} from "./blueprint-trace-assertions.ts";
import type {
  BlueprintCallTargetTraceArtifact,
  BlueprintFunctionTraceArtifact,
  BlueprintPropertyReferenceTraceArtifact,
  UnlockableManagerTraceArtifact,
} from "./blueprint-trace-inputs.ts";
import { compileNewReleaseCandidateEligibility } from "./new-release-candidate-eligibility.ts";
import { compileNewReleaseSourceMapLifecycle } from "./new-release-source-map.ts";

const classPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C";
const eventGraphFunctionName = "ExecuteExampleGraph_ExampleUnlockSystem";
const eventGraphFunctionPath = `${classPath}:${eventGraphFunctionName}`;
const resetFunctionName = "Reset to new Day Event_Event";
const checkFunctionName = "ExampleReleaseEnabled";
const firstSaveDaySymbol = "ExampleSymbol_497dff3a47e2";
const timespanSymbol = "ExampleSymbol_7e5e1037058b";
const thresholdSymbol = "ExampleSymbol_2366b926ff88";
const comparisonSymbol = "ExampleSymbol_82f85d9f0f2f";
const requestClassPath =
  "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C";
const requestFunctionName = "Return Example Request";
const requestFunctionPath = `${requestClassPath}:${requestFunctionName}`;
const requestGeneratorFunctionName = "Generate Example Request";
const requestGeneratorFunctionPath = `${requestClassPath}:${requestGeneratorFunctionName}`;
const newReleaseCandidatesSymbol = "Example Candidate Map";
const randomResultSymbol = "ExampleSymbol_62b6867ee210";
const requestConditionSymbol = "ExampleSymbol_470ab9997728";
const guaranteedStepSymbol = "lGarantee Requested Step";
const optionalPassSymbol = "lRun Optional Pass";
const newReleaseRequestedSymbol = "lNew Released Requested";

export interface NewReleaseSources {
  readonly managerTrace: NewReleaseArtifactIdentity<"unlockable-manager-trace">;
  readonly wrapperTrace: NewReleaseArtifactIdentity<"blueprint-function-trace">;
  readonly propertyReaderTrace: NewReleaseArtifactIdentity<"blueprint-property-reference-trace">;
  readonly requestGeneratorTrace: NewReleaseArtifactIdentity<"blueprint-function-trace">;
  readonly marketEntryTrace: NewReleaseArtifactIdentity<"blueprint-function-trace">;
  readonly sourceMapTrace: NewReleaseArtifactIdentity<"blueprint-property-reference-trace">;
  readonly candidateMapTrace: NewReleaseArtifactIdentity<"blueprint-property-reference-trace">;
  readonly callTargetTrace: NewReleaseArtifactIdentity<"blueprint-call-target-trace">;
}

export function compileNewReleaseMechanics(
  managerTrace: UnlockableManagerTraceArtifact,
  wrapperTrace: BlueprintFunctionTraceArtifact,
  propertyReaderTrace: BlueprintPropertyReferenceTraceArtifact,
  requestGeneratorTrace: BlueprintFunctionTraceArtifact,
  marketEntryTrace: BlueprintFunctionTraceArtifact,
  sourceMapTrace: BlueprintPropertyReferenceTraceArtifact,
  candidateMapTrace: BlueprintPropertyReferenceTraceArtifact,
  callTargetTrace: BlueprintCallTargetTraceArtifact,
  sources: NewReleaseSources,
): NewReleaseMechanics {
  assertInputContracts(
    managerTrace,
    wrapperTrace,
    propertyReaderTrace,
    requestGeneratorTrace,
    marketEntryTrace,
    sourceMapTrace,
    candidateMapTrace,
    callTargetTrace,
  );
  assertWrapperEntry(wrapperTrace, resetFunctionName, 3364);
  assertWrapperEntry(wrapperTrace, checkFunctionName, 3379);

  const eventGraph = findTraceFunction(managerTrace.functions, eventGraphFunctionName);
  if (eventGraph.classPath !== classPath || eventGraph.functionPath !== eventGraphFunctionPath) {
    throw new Error("Unlock manager event-graph identity changed.");
  }
  assertTraceNodeTree(eventGraph);

  assertTraceCall(eventGraph, 3364, checkFunctionName, "local-virtual", 0);

  const firstSaveContext = findTraceNode(eventGraph, 3379);
  if (firstSaveContext.kind !== "context" || firstSaveContext.opcode !== "EX_Context") {
    throw new Error("New-release first-save-day context changed.");
  }
  assertTraceSymbolChild(firstSaveContext, eventGraph, "ObjectExpression", "Weather Actor");
  const firstSaveDay = findTraceCall(
    eventGraph,
    3401,
    "Start SaveGame Day",
    "local-virtual",
    1,
  );
  assertChildCall(firstSaveContext, firstSaveDay, "ContextExpression");
  assertTraceSymbolChild(firstSaveDay, eventGraph, "Parameters[0]", firstSaveDaySymbol);

  const makeTimespan = findTraceCall(eventGraph, 3442, "MakeTimespan", "final", 5);
  const timespanAssignment = assertNamedAssignment(eventGraph, 3424, timespanSymbol);
  assertChildCall(timespanAssignment, makeTimespan, "Assignment");
  assertIntegerArguments(makeTimespan, ["2", "0", "0", "0", "0"]);
  for (const [position, value] of ["2", "0", "0", "0", "0"].entries()) {
    assertTraceLiteralChild(makeTimespan, eventGraph, `Parameters[${position}]`, "integer", value);
  }

  const addThreshold = findTraceCall(
    eventGraph,
    3495,
    "Add_DateTimeTimespan",
    "final",
    2,
  );
  const thresholdAssignment = assertNamedAssignment(eventGraph, 3477, thresholdSymbol);
  assertChildCall(thresholdAssignment, addThreshold, "Assignment");
  assertTraceSymbolChild(addThreshold, eventGraph, "Parameters[0]", firstSaveDaySymbol);
  assertTraceSymbolChild(addThreshold, eventGraph, "Parameters[1]", timespanSymbol);

  const compare = findTraceCall(
    eventGraph,
    3533,
    "GreaterEqual_DateTimeDateTime",
    "final",
    2,
  );
  const comparisonAssignment = findTraceNode(eventGraph, 3523);
  assertTraceRootNode(eventGraph, 3523, "EX_LetBool");
  assertTraceSymbolChild(comparisonAssignment, eventGraph, "Variable", comparisonSymbol);
  assertChildCall(comparisonAssignment, compare, "Assignment");
  const currentDate = findTraceNode(eventGraph, 3542);
  assertChildCall(compare, currentDate, "Parameters[0]");
  if (currentDate.kind !== "context" || currentDate.symbol !== "ExampleCurrentPeriod") {
    throw new Error("New-release current-date input changed.");
  }
  assertTraceSymbolChild(currentDate, eventGraph, "ObjectExpression", "Weather Actor");
  assertTraceSymbolChild(currentDate, eventGraph, "ContextExpression", "ExampleCurrentPeriod");
  assertTraceSymbolChild(compare, eventGraph, "Parameters[1]", thresholdSymbol);

  const condition = assertTraceJump(eventGraph, 3583, "pop-flow-if-false");
  assertTraceSymbolChild(condition, eventGraph, "BooleanExpression", comparisonSymbol);
  assertTraceJump(eventGraph, 3593, "unconditional", "codeOffset", 3352);

  assertTraceRootNode(eventGraph, 3352, "EX_LetBool");
  const assignment = findTraceNode(eventGraph, 3352);
  if (assignment.kind !== "assignment") {
    throw new Error("New-release unlock assignment changed.");
  }
  assertTraceSymbolChild(assignment, eventGraph, "Variable", "ExampleReleaseKind");
  assertTraceLiteralChild(assignment, eventGraph, "Assignment", "boolean", "true");

  assertRequestSelection(propertyReaderTrace);
  assertRequestGeneration(requestGeneratorTrace);

  return NewReleaseMechanicsSchema.assert({
    artifactType: "new-release-mechanics",
    build: {
      steamAppId: managerTrace.build.steamAppId,
      steamBuildId: managerTrace.build.steamBuildId,
    },
    sources,
    scope: "new-release",
    evidenceLevel: "typed-blueprint",
    runtimeValidation: "not-run",
    unlock: {
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
        classPath,
        wrapperFunctions: {
          resetToNewDay: resetFunctionName,
          newReleaseCheck: checkFunctionName,
        },
        entryPoints: { resetToNewDay: 3364, newReleaseCheck: 3379 },
        eventGraphFunction: eventGraphFunctionName,
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
    },
    requestSelection: {
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
        classPath: requestClassPath,
        functionName: requestFunctionName,
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
    },
    requestGeneration: {
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
          randomGate: {
            function: "RandomBoolWithWeight",
            trueWeight: 0.66,
          },
          candidateCollection: newReleaseCandidatesSymbol,
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
        classPath: requestClassPath,
        functionName: requestGeneratorFunctionName,
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
    },
    sourceMapLifecycle: compileNewReleaseSourceMapLifecycle(
      marketEntryTrace,
      sourceMapTrace,
    ),
    candidateEligibility: compileNewReleaseCandidateEligibility(
      candidateMapTrace,
      callTargetTrace,
      sources.candidateMapTrace,
    ),
  });
}

function assertInputContracts(
  managerTrace: UnlockableManagerTraceArtifact,
  wrapperTrace: BlueprintFunctionTraceArtifact,
  propertyReaderTrace: BlueprintPropertyReferenceTraceArtifact,
  requestGeneratorTrace: BlueprintFunctionTraceArtifact,
  marketEntryTrace: BlueprintFunctionTraceArtifact,
  sourceMapTrace: BlueprintPropertyReferenceTraceArtifact,
  candidateMapTrace: BlueprintPropertyReferenceTraceArtifact,
  callTargetTrace: BlueprintCallTargetTraceArtifact,
): void {
  if (managerTrace.artifactType !== "unlockable-manager-trace") {
    throw new Error("Expected an unlockable-manager-trace input.");
  }
  if (wrapperTrace.artifactType !== "blueprint-function-trace") {
    throw new Error("Expected a blueprint-function-trace input.");
  }
  if (propertyReaderTrace.artifactType !== "blueprint-property-reference-trace") {
    throw new Error("Expected a blueprint-property-reference-trace input.");
  }
  if (requestGeneratorTrace.artifactType !== "blueprint-function-trace") {
    throw new Error("Expected a blueprint-function-trace request-generator input.");
  }
  if (marketEntryTrace.artifactType !== "blueprint-function-trace") {
    throw new Error("Expected a Blueprint function trace for Market entrypoints.");
  }
  if (sourceMapTrace.artifactType !== "blueprint-property-reference-trace") {
    throw new Error("Expected a source-map property-reference trace input.");
  }
  if (candidateMapTrace.artifactType !== "blueprint-property-reference-trace") {
    throw new Error("Expected a candidate-map property-reference trace input.");
  }
  if (callTargetTrace.artifactType !== "blueprint-call-target-trace") {
    throw new Error("Expected a Blueprint call-target trace input.");
  }
  const otherInputs = [
    wrapperTrace,
    propertyReaderTrace,
    requestGeneratorTrace,
    marketEntryTrace,
    sourceMapTrace,
    candidateMapTrace,
    callTargetTrace,
  ];
  if (otherInputs.some((input) => !sameBuild(managerTrace.build, input.build))) {
    throw new Error("New-release inputs refer to different game builds.");
  }
  if (otherInputs.some((input) => !sameMappings(managerTrace.mappings, input.mappings))) {
    throw new Error("New-release inputs refer to different mappings.");
  }
  if (otherInputs.some((input) => !sameEngine(managerTrace.engine, input.engine))) {
    throw new Error("New-release inputs refer to different engine configurations.");
  }
  if (
    managerTrace.requestedFunctionPaths.length !== 1 ||
    managerTrace.requestedFunctionPaths[0] !== eventGraphFunctionPath ||
    managerTrace.functions.length !== 1
  ) {
    throw new Error("Unlock manager trace scope changed.");
  }
  if (
    propertyReaderTrace.blueprintPropertyReferences.targetPropertyName !==
      "ExampleReleaseKind" ||
    propertyReaderTrace.selectionRule !== "explicit-functions-with-read-references" ||
    propertyReaderTrace.requestedFunctionPaths.length !== 1 ||
    propertyReaderTrace.requestedFunctionPaths[0] !== requestFunctionPath ||
    propertyReaderTrace.functions.length !== 1
  ) {
    throw new Error("Property-reader trace scope changed.");
  }
  if (
    requestGeneratorTrace.functions.length !== 1 ||
    requestGeneratorTrace.functions[0]?.functionPath !== requestGeneratorFunctionPath
  ) {
    throw new Error("Request-generator trace scope changed.");
  }
}

function sameBuild(
  expected: UnlockableManagerTraceArtifact["build"],
  actual: UnlockableManagerTraceArtifact["build"],
): boolean {
  return expected.manifestSha256 === actual.manifestSha256 &&
    expected.steamAppId === actual.steamAppId &&
    expected.steamBuildId === actual.steamBuildId;
}

function sameMappings(
  expected: UnlockableManagerTraceArtifact["mappings"],
  actual: UnlockableManagerTraceArtifact["mappings"],
): boolean {
  return expected.fileName === actual.fileName &&
    expected.sizeBytes === actual.sizeBytes &&
    expected.sha256 === actual.sha256 &&
    expected.formatVersion === actual.formatVersion;
}

function sameEngine(
  expected: UnlockableManagerTraceArtifact["engine"],
  actual: UnlockableManagerTraceArtifact["engine"],
): boolean {
  return expected.version === actual.version &&
    expected.cue4ParseProfile === actual.cue4ParseProfile &&
    expected.source === actual.source &&
    expected.confidence === actual.confidence;
}

function assertRequestSelection(trace: BlueprintPropertyReferenceTraceArtifact): void {
  const function_ = findTraceFunction(trace.functions, requestFunctionName);
  if (
    function_.classPath !== requestClassPath ||
    function_.functionPath !== requestFunctionPath
  ) {
    throw new Error("Property-reader function identity changed.");
  }
  assertTraceNodeTree(function_);

  const randomAssignment = findTraceNode(function_, 2243);
  assertTraceRootNode(function_, 2243, "EX_LetBool");
  assertTraceSymbolChild(randomAssignment, function_, "Variable", randomResultSymbol);
  const randomCall = findTraceCall(function_, 2253, "RandomBoolWithWeight", "final", 1);
  assertChildCall(randomAssignment, randomCall, "Assignment");
  assertTraceLiteralChild(randomCall, function_, "Parameters[0]", "number", "0.5");

  const conditionAssignment = findTraceNode(function_, 2268);
  assertTraceRootNode(function_, 2268, "EX_LetBool");
  assertTraceSymbolChild(conditionAssignment, function_, "Variable", requestConditionSymbol);
  const combine = findTraceCall(function_, 2278, "BooleanAND", "final", 2);
  assertChildCall(conditionAssignment, combine, "Assignment");
  const unlockContext = findTraceNode(function_, 2287);
  assertChildCall(combine, unlockContext, "Parameters[0]");
  if (unlockContext.kind !== "context" || unlockContext.symbol !== "ExampleReleaseKind") {
    throw new Error("New-release request unlock context changed.");
  }
  assertTraceSymbolChild(
    unlockContext,
    function_,
    "ContextExpression",
    "ExampleReleaseKind",
  );
  assertTraceSymbolChild(combine, function_, "Parameters[1]", randomResultSymbol);

  const condition = assertTraceJump(
    function_,
    2328,
    "conditional-false",
    "codeOffset",
    2381,
  );
  assertTraceSymbolChild(condition, function_, "BooleanExpression", requestConditionSymbol);
  assertLiteralAssignment(function_, 2342, "EX_Let", guaranteedStepSymbol, "integer", "1");
  assertLiteralAssignment(
    function_,
    2365,
    "EX_LetBool",
    optionalPassSymbol,
    "boolean",
    "false",
  );
  assertTraceJump(function_, 2376, "unconditional", "codeOffset", 2040);

  const stepComparisonAssignment = findTraceNode(function_, 2098);
  assertTraceRootNode(function_, 2098, "EX_LetBool");
  assertTraceSymbolChild(
    stepComparisonAssignment,
    function_,
    "Variable",
    "ExampleSymbol_4c35bb67638e",
  );
  const stepOne = findTraceCall(function_, 2108, "NotEqual_IntInt", "final", 2);
  assertChildCall(stepComparisonAssignment, stepOne, "Assignment");
  assertTraceSymbolChild(stepOne, function_, "Parameters[0]", guaranteedStepSymbol);
  assertTraceLiteralChild(stepOne, function_, "Parameters[1]", "integer", "1");
  assertIntegerArgumentEntries(stepOne, [{ position: 1, value: "1" }]);
  const stepRoute = assertTraceJump(
    function_,
    2132,
    "conditional-false",
    "codeOffset",
    4028,
  );
  assertTraceSymbolChild(
    stepRoute,
    function_,
    "BooleanExpression",
    "ExampleSymbol_4c35bb67638e",
  );

  assertLiteralAssignment(
    function_,
    4028,
    "EX_LetBool",
    newReleaseRequestedSymbol,
    "boolean",
    "true",
  );
  assertLiteralAssignment(
    function_,
    4039,
    "EX_LetBool",
    "Temp_bool_Variable_5",
    "boolean",
    "true",
  );
  assertLiteralAssignment(
    function_,
    4050,
    "EX_Let",
    "Temp_byte_Variable_6",
    "integer",
    "5",
  );
  const mapContext = findTraceNode(function_, 4070);
  assertTraceRootNode(function_, 4070, "EX_Context");
  const addPrimaryRequest = findTraceCall(function_, 4092, "Map_Add", "final", 3);
  assertChildCall(mapContext, addPrimaryRequest, "ContextExpression");
  assertTraceSymbolChild(addPrimaryRequest, function_, "Parameters[0]", "Primary Request");
  assertTraceSymbolChild(
    addPrimaryRequest,
    function_,
    "Parameters[1]",
    "Temp_byte_Variable_6",
  );
  assertTraceSymbolChild(
    addPrimaryRequest,
    function_,
    "Parameters[2]",
    "Temp_bool_Variable_5",
  );

  const onlyNewReleaseOutput = findTraceNode(function_, 3358);
  assertTraceRootNode(function_, 3358, "EX_LetBool");
  assertTraceSymbolChild(onlyNewReleaseOutput, function_, "Variable", "Only New Release");
  assertTraceSymbolChild(
    onlyNewReleaseOutput,
    function_,
    "Assignment",
    newReleaseRequestedSymbol,
  );
  const mandatoryRequestOutput = findTraceNode(function_, 3396);
  assertTraceRootNode(function_, 3396, "EX_Let");
  assertTraceSymbolChild(mandatoryRequestOutput, function_, "Variable", "Mandatory Request");
  assertTraceSymbolChild(mandatoryRequestOutput, function_, "Assignment", "Primary Request");
}

function assertRequestGeneration(trace: BlueprintFunctionTraceArtifact): void {
  const function_ = findTraceFunction(trace.functions, requestGeneratorFunctionName);
  if (
    function_.classPath !== requestClassPath ||
    function_.functionPath !== requestGeneratorFunctionPath
  ) {
    throw new Error("Request-generator function identity changed.");
  }
  assertTraceNodeTree(function_);

  const selector = findTraceCall(
    function_,
    448,
    requestFunctionName,
    "local-virtual",
    12,
  );
  const selectorOutputs = [
    "ExampleSymbol_2d9587f02b15",
    "ExampleSymbol_2dab19f58908",
    "ExampleSymbol_fdd233385842",
    "ExampleSymbol_f72d95a50008",
    "ExampleSymbol_eaf6430ce095",
    "ExampleSymbol_ad7be0bfe1a1",
    "ExampleSymbol_f8f40d1f8f50",
    "ExampleSymbol_27293807bacb",
    "ExampleSymbol_f7389c4d36a2",
    "ExampleSymbol_3de17167922e",
    "ExampleSymbol_def4f117dc03",
    "ExampleSymbol_60fa85ea8d84",
  ] as const;
  for (const [position, symbol] of selectorOutputs.entries()) {
    assertTraceSymbolChild(selector, function_, `Parameters[${position}]`, symbol);
  }
  const selectorSuccess = assertTraceJump(
    function_,
    570,
    "conditional-false",
    "codeOffset",
    785,
  );
  assertTraceSymbolChild(
    selectorSuccess,
    function_,
    "BooleanExpression",
    selectorOutputs[0],
  );
  assertTraceJump(function_, 584, "push-flow", "pushingAddress", 1272);
  assertVariableAssignment(
    function_,
    735,
    "EX_LetBool",
    "Only New Release",
    selectorOutputs[8],
  );
  assertLiteralAssignment(
    function_,
    773,
    "EX_LetBool",
    "Request Generated",
    "boolean",
    "true",
  );
  assertTraceJump(function_, 784, "pop-flow");
  assertVariableAssignment(
    function_,
    1272,
    "EX_Let",
    "Primary Request",
    selectorOutputs[10],
  );
  assertVariableAssignment(
    function_,
    1299,
    "EX_Let",
    "Optional Request",
    selectorOutputs[11],
  );

  assertTraceJump(function_, 1326, "push-flow", "pushingAddress", 2336);
  const newReleaseBranch = assertTraceJump(function_, 1331, "pop-flow-if-false");
  assertTraceSymbolChild(
    newReleaseBranch,
    function_,
    "BooleanExpression",
    selectorOutputs[8],
  );
  const castAssignment = findTraceNode(function_, 1362);
  assertTraceRootNode(function_, 1362, "EX_Let");
  assertTraceSymbolChild(
    castAssignment,
    function_,
    "Variable",
    "ExampleSymbol_59b9daf98844",
  );
  const castBranch = assertTraceJump(function_, 1427, "pop-flow-if-false");
  assertTraceSymbolChild(
    castBranch,
    function_,
    "BooleanExpression",
    "ExampleSymbol_cfba3a7c5b90",
  );

  const randomAssignment = findTraceNode(function_, 1437);
  assertTraceRootNode(function_, 1437, "EX_LetBool");
  assertTraceSymbolChild(
    randomAssignment,
    function_,
    "Variable",
    "ExampleSymbol_df2cd757b8a8",
  );
  const randomGate = findTraceCall(
    function_,
    1447,
    "RandomBoolWithWeight",
    "final",
    1,
  );
  assertChildCall(randomAssignment, randomGate, "Assignment");
  assertTraceLiteralChild(randomGate, function_, "Parameters[0]", "number", "0.66");

  const firstLength = findTraceCall(function_, 1502, "Map_Length", "final", 1);
  assertCollectionArgument(function_, firstLength, 1511, 1577);
  const positiveCountAssignment = findTraceNode(function_, 1587);
  assertTraceRootNode(function_, 1587, "EX_LetBool");
  assertTraceSymbolChild(
    positiveCountAssignment,
    function_,
    "Variable",
    "ExampleSymbol_b752835dd3cc",
  );
  const positiveCount = findTraceCall(function_, 1597, "Greater_IntInt", "final", 2);
  assertChildCall(positiveCountAssignment, positiveCount, "Assignment");
  assertTraceSymbolChild(
    positiveCount,
    function_,
    "Parameters[0]",
    "ExampleSymbol_a76986845fbb",
  );
  assertTraceLiteralChild(positiveCount, function_, "Parameters[1]", "integer", "0");
  assertIntegerArgumentEntries(positiveCount, [{ position: 1, value: "0" }]);

  const combinedAssignment = findTraceNode(function_, 1621);
  assertTraceRootNode(function_, 1621, "EX_LetBool");
  assertTraceSymbolChild(
    combinedAssignment,
    function_,
    "Variable",
    "ExampleSymbol_69ac0269c2d9",
  );
  const combined = findTraceCall(function_, 1631, "BooleanAND", "final", 2);
  assertChildCall(combinedAssignment, combined, "Assignment");
  assertTraceSymbolChild(
    combined,
    function_,
    "Parameters[0]",
    "ExampleSymbol_b752835dd3cc",
  );
  assertTraceSymbolChild(
    combined,
    function_,
    "Parameters[1]",
    "ExampleSymbol_df2cd757b8a8",
  );
  const combinedBranch = assertTraceJump(function_, 1659, "pop-flow-if-false");
  assertTraceSymbolChild(
    combinedBranch,
    function_,
    "BooleanExpression",
    "ExampleSymbol_69ac0269c2d9",
  );

  const keys = findTraceCall(function_, 1702, "Map_Keys", "final", 2);
  assertCollectionArgument(function_, keys, 1711, 1777);
  assertTraceSymbolChild(keys, function_, "Parameters[1]", "ExampleSymbol_d6e3aa1b6c52");
  const values = findTraceCall(function_, 1829, "Map_Values", "final", 2);
  assertCollectionArgument(function_, values, 1838, 1904);
  assertTraceSymbolChild(
    values,
    function_,
    "Parameters[1]",
    "ExampleSymbol_5c9e16b9b19d",
  );
  const secondLength = findTraceCall(function_, 1963, "Map_Length", "final", 1);
  assertCollectionArgument(function_, secondLength, 1972, 2038);

  const subtractAssignment = findTraceNode(function_, 2048);
  assertTraceRootNode(function_, 2048, "EX_Let");
  assertTraceSymbolChild(
    subtractAssignment,
    function_,
    "Variable",
    "ExampleSymbol_e786ddbe8538",
  );
  const subtract = findTraceCall(function_, 2066, "Subtract_IntInt", "final", 2);
  assertChildCall(subtractAssignment, subtract, "Assignment");
  assertTraceSymbolChild(
    subtract,
    function_,
    "Parameters[0]",
    "ExampleSymbol_a76986845fbb",
  );
  assertTraceLiteralChild(subtract, function_, "Parameters[1]", "integer", "1");
  assertIntegerArgumentEntries(subtract, [{ position: 1, value: "1" }]);

  const randomIndexAssignment = findTraceNode(function_, 2090);
  assertTraceRootNode(function_, 2090, "EX_Let");
  assertTraceSymbolChild(
    randomIndexAssignment,
    function_,
    "Variable",
    "ExampleSymbol_2570513be054",
  );
  const randomIndex = findTraceCall(function_, 2108, "RandomInteger", "final", 1);
  assertChildCall(randomIndexAssignment, randomIndex, "Assignment");
  assertTraceSymbolChild(
    randomIndex,
    function_,
    "Parameters[0]",
    "ExampleSymbol_e786ddbe8538",
  );
  assertVariableAssignment(
    function_,
    2127,
    "EX_Let",
    "Example Selected Key",
    "ExampleSymbol_2570513be054",
  );

  const selectedKey = findTraceCall(function_, 2176, "Array_Get", "final", 3);
  assertTraceSymbolChild(selectedKey, function_, "Parameters[0]", "ExampleSymbol_d6e3aa1b6c52");
  assertTraceSymbolChild(selectedKey, function_, "Parameters[1]", "Example Selected Key");
  assertTraceSymbolChild(selectedKey, function_, "Parameters[2]", "ExampleSymbol_4bb2d3edf81f");
  assertVariableAssignment(
    function_,
    2213,
    "EX_Let",
    "Request Movie SKU",
    "ExampleSymbol_4bb2d3edf81f",
  );
  const selectedValue = findTraceCall(function_, 2262, "Array_Get", "final", 3);
  assertTraceSymbolChild(
    selectedValue,
    function_,
    "Parameters[0]",
    "ExampleSymbol_5c9e16b9b19d",
  );
  assertTraceSymbolChild(selectedValue, function_, "Parameters[1]", "Example Selected Key");
  assertTraceSymbolChild(
    selectedValue,
    function_,
    "Parameters[2]",
    "ExampleSymbol_38f1ea380eae",
  );
  const reservedProduct = findTraceNode(function_, 2299);
  assertTraceRootNode(function_, 2299, "EX_Let");
  assertTraceSymbolChild(reservedProduct, function_, "Variable", "Reserved Movie Product");
  const productMember = findTraceNode(function_, 2317);
  assertChildNode(reservedProduct, productMember, "Assignment");
  if (
    productMember.kind !== "context" ||
    productMember.symbol !== "ExampleField11_0_00000000000000000000000000000000"
  ) {
    throw new Error("Reserved new-release product member changed.");
  }
  assertTraceSymbolChild(
    productMember,
    function_,
    "StructExpression",
    "ExampleSymbol_38f1ea380eae",
  );
  assertTraceJump(function_, 2335, "pop-flow");
  assertLiteralAssignment(
    function_,
    2336,
    "EX_LetBool",
    "ExampleGenerateSuccess",
    "boolean",
    "true",
  );
  assertTraceRootNode(function_, 2347, "EX_Return");
}

function assertWrapperEntry(
  wrapperTrace: BlueprintFunctionTraceArtifact,
  functionName: string,
  entryPoint: number,
): void {
  const function_ = findTraceFunction(wrapperTrace.functions, functionName);
  if (function_.classPath !== classPath || function_.functionPath !== `${classPath}:${functionName}`) {
    throw new Error(`Unlock wrapper identity changed for ${functionName}.`);
  }
  assertTraceNodeTree(function_);
  const entries = function_.nodes.filter(
    (node) =>
      node.kind === "call" &&
      node.call?.functionName === eventGraphFunctionName &&
      node.call.callKind === "local-final" &&
      node.call.argumentCount === 1,
  );
  if (entries.length !== 1) {
    throw new Error(`Expected one event-graph entry call in ${functionName}.`);
  }
  const entry = entries[0]!;
  assertIntegerArguments(entry, [String(entryPoint)]);
  assertTraceLiteralChild(entry, function_, "Parameters[0]", "integer", String(entryPoint));
}

function assertIntegerArguments(
  node: ReturnType<typeof findTraceCall>,
  values: readonly string[],
): void {
  const expected = values.map((value, position) => ({ position, value }));
  if (JSON.stringify(node.call?.integerArguments) !== JSON.stringify(expected)) {
    throw new Error(`Blueprint trace integer arguments changed at statement ${node.statementIndex}.`);
  }
}

function assertIntegerArgumentEntries(
  node: ReturnType<typeof findTraceCall>,
  expected: readonly { readonly position: number; readonly value: string }[],
): void {
  if (JSON.stringify(node.call?.integerArguments) !== JSON.stringify(expected)) {
    throw new Error(`Blueprint trace integer arguments changed at statement ${node.statementIndex}.`);
  }
}

function assertLiteralAssignment(
  function_: ReturnType<typeof findTraceFunction>,
  statementIndex: number,
  opcode: string,
  symbol: string,
  literalType: "boolean" | "integer" | "number",
  value: string,
): void {
  const assignment = findTraceNode(function_, statementIndex);
  assertTraceRootNode(function_, statementIndex, opcode);
  if (assignment.kind !== "assignment") {
    throw new Error(`Blueprint trace assignment changed at statement ${statementIndex}.`);
  }
  assertTraceSymbolChild(assignment, function_, "Variable", symbol);
  assertTraceLiteralChild(assignment, function_, "Assignment", literalType, value);
}

function assertVariableAssignment(
  function_: ReturnType<typeof findTraceFunction>,
  statementIndex: number,
  opcode: string,
  targetSymbol: string,
  sourceSymbol: string,
): void {
  const assignment = findTraceNode(function_, statementIndex);
  assertTraceRootNode(function_, statementIndex, opcode);
  if (assignment.kind !== "assignment") {
    throw new Error(`Blueprint trace assignment changed at statement ${statementIndex}.`);
  }
  assertTraceSymbolChild(assignment, function_, "Variable", targetSymbol);
  assertTraceSymbolChild(assignment, function_, "Assignment", sourceSymbol);
}

function assertCollectionArgument(
  function_: ReturnType<typeof findTraceFunction>,
  callNode: ReturnType<typeof findTraceCall>,
  contextStatementIndex: number,
  fieldStatementIndex: number,
): void {
  const context = findTraceNode(function_, contextStatementIndex);
  assertChildNode(callNode, context, "Parameters[0]");
  if (context.kind !== "context" || context.symbol !== newReleaseCandidatesSymbol) {
    throw new Error(
      `New-release candidate collection changed at statement ${contextStatementIndex}.`,
    );
  }
  const field = findTraceNode(function_, fieldStatementIndex);
  assertChildNode(context, field, "ContextExpression");
  if (field.kind !== "variable" || field.symbol !== newReleaseCandidatesSymbol) {
    throw new Error(
      `New-release candidate collection field changed at statement ${fieldStatementIndex}.`,
    );
  }
}

function assertChildNode(
  parent: ReturnType<typeof findTraceNode>,
  child: ReturnType<typeof findTraceNode>,
  edge: string,
): void {
  if (child.parentNodeIndex !== parent.nodeIndex || child.edge !== edge) {
    throw new Error(
      `Blueprint trace operation changed for ${edge} at statement ${parent.statementIndex}.`,
    );
  }
}

function assertChildCall(
  parent: ReturnType<typeof findTraceNode>,
  child: ReturnType<typeof findTraceNode>,
  edge: string,
): void {
  assertChildNode(parent, child, edge);
}

function assertNamedAssignment(
  function_: ReturnType<typeof findTraceFunction>,
  statementIndex: number,
  symbol: string,
): ReturnType<typeof findTraceNode> {
  const assignment = findTraceNode(function_, statementIndex);
  assertTraceRootNode(function_, statementIndex, "EX_Let");
  if (assignment.kind !== "assignment" || assignment.symbol !== symbol) {
    throw new Error(`Blueprint trace assignment changed at statement ${statementIndex}.`);
  }
  assertTraceSymbolChild(assignment, function_, "Variable", symbol);
  return assignment;
}
