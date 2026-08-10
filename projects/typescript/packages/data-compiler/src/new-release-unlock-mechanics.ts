import type {
  NewReleaseUnlockArtifactIdentity,
  NewReleaseUnlockMechanics,
} from "@neonretrorewind/core";
import { NewReleaseUnlockMechanicsSchema } from "@neonretrorewind/core";

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
  BlueprintFunctionTraceArtifact,
  BlueprintPropertyReferenceTraceArtifact,
  UnlockableManagerTraceArtifact,
} from "./blueprint-trace-inputs.ts";

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
const randomResultSymbol = "ExampleSymbol_62b6867ee210";
const requestConditionSymbol = "ExampleSymbol_470ab9997728";
const guaranteedStepSymbol = "lGarantee Requested Step";
const optionalPassSymbol = "lRun Optional Pass";
const newReleaseRequestedSymbol = "lNew Released Requested";

export interface NewReleaseUnlockSources {
  readonly managerTrace: NewReleaseUnlockArtifactIdentity<"unlockable-manager-trace">;
  readonly wrapperTrace: NewReleaseUnlockArtifactIdentity<"blueprint-function-trace">;
  readonly propertyReaderTrace: NewReleaseUnlockArtifactIdentity<"blueprint-property-reference-trace">;
}

export function compileNewReleaseUnlockMechanics(
  managerTrace: UnlockableManagerTraceArtifact,
  wrapperTrace: BlueprintFunctionTraceArtifact,
  propertyReaderTrace: BlueprintPropertyReferenceTraceArtifact,
  sources: NewReleaseUnlockSources,
): NewReleaseUnlockMechanics {
  assertInputContracts(managerTrace, wrapperTrace, propertyReaderTrace);
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

  return NewReleaseUnlockMechanicsSchema.assert({
    artifactType: "new-release-unlock-mechanics",
    build: {
      steamAppId: managerTrace.build.steamAppId,
      steamBuildId: managerTrace.build.steamBuildId,
    },
    sources,
    scope: "new-release-unlock",
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
  });
}

function assertInputContracts(
  managerTrace: UnlockableManagerTraceArtifact,
  wrapperTrace: BlueprintFunctionTraceArtifact,
  propertyReaderTrace: BlueprintPropertyReferenceTraceArtifact,
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
  if (
    JSON.stringify(managerTrace.build) !== JSON.stringify(wrapperTrace.build) ||
    JSON.stringify(managerTrace.build) !== JSON.stringify(propertyReaderTrace.build)
  ) {
    throw new Error("Unlock traces refer to different game builds.");
  }
  if (
    JSON.stringify(managerTrace.mappings) !== JSON.stringify(wrapperTrace.mappings) ||
    JSON.stringify(managerTrace.mappings) !== JSON.stringify(propertyReaderTrace.mappings)
  ) {
    throw new Error("Unlock traces refer to different mappings.");
  }
  if (
    JSON.stringify(managerTrace.engine) !== JSON.stringify(wrapperTrace.engine) ||
    JSON.stringify(managerTrace.engine) !== JSON.stringify(propertyReaderTrace.engine)
  ) {
    throw new Error("Unlock traces refer to different engine configurations.");
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

function assertChildCall(
  parent: ReturnType<typeof findTraceNode>,
  child: ReturnType<typeof findTraceNode>,
  edge: string,
): void {
  if (child.parentNodeIndex !== parent.nodeIndex || child.edge !== edge) {
    throw new Error(`Blueprint trace operation changed for ${edge} at statement ${parent.statementIndex}.`);
  }
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
