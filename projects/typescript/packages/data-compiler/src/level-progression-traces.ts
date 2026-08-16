import type { LevelProgressionArtifactIdentity } from "@neonretrorewind/core";

import {
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
  BlueprintTraceFunctionInput,
  BlueprintTraceNodeInput,
} from "./blueprint-trace-inputs.ts";

export const gameModeClassPath =
  "ExampleGame/Content/ExampleProject/core/gamemode/ExampleMode.ExampleMode_C";
export const changeXpFunctionName = "Apply Example Progress";
export const gameModeEventGraphName = "ExecuteExampleGraph_ExampleMode";
export const experienceClassPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleProgression.ExampleProgression_C";
export const maximumFunctionName = "Get Example Progress Limit";
export const endOfDayClassPath =
  "ExampleGame/Content/ExampleProject/core/widget/dayUI/ExampleEndOfPeriod.ExampleEndOfPeriod_C";
export const endOfDayEventGraphName = "ExecuteExampleGraph_ExampleEndOfPeriod";
export const initAnimationFunctionName = "ExampleInitializeProgress";
export const requirementFunctionName = "Get Example Threshold";
export const cumulativeFunctionName = "Get Example Period Progress";

const xpTableObjectPath =
  "ExampleGame/Content/ExampleProject/core/gamesettings/ExampleThresholdTable.ExampleThresholdTable";

export function assertChangeXpTrace(
  trace: BlueprintFunctionTraceArtifact,
): void {
  if (
    trace.functions.length !== 1 ||
    trace.functions[0]?.functionPath !== `${gameModeClassPath}:${changeXpFunctionName}`
  ) {
    throw new Error("Change-XP trace scope changed.");
  }
  const function_ = findTraceFunction(trace.functions, changeXpFunctionName);
  assertFunctionIdentity(function_, gameModeClassPath, changeXpFunctionName);
  assertTraceNodeTree(function_);

  assertVariableAssignment(function_, 5, "Local Xp modification", "Example Progress Delta");
  assertCallArguments(
    function_,
    50,
    "Add_IntInt",
    "final",
    ["Example Lifetime Progress", "Local Xp modification"],
  );
  assertVariableAssignment(
    function_,
    78,
    "Example Lifetime Progress",
    "ExampleSymbol_fbf99360b7d0",
  );
  assertCallArguments(
    function_,
    123,
    "Add_IntInt",
    "final",
    ["Local Xp modification", "Example Current Progress"],
  );
  assertCallArguments(
    function_,
    169,
    "Min",
    "final",
    ["ExampleSymbol_68a76c00e78c", "Example Progress Limit"],
  );
  assertVariableAssignment(
    function_,
    197,
    "Example Current Progress",
    "ExampleSymbol_560a86c90290",
  );
  assertCallArguments(
    function_,
    246,
    "Apply Example Progress Value",
    "local-virtual",
    ["Local Xp modification", "Example Current Progress"],
  );
  assertCallArguments(
    function_,
    388,
    "ExampleAccumulateProgress",
    "local-virtual",
    ["Local Xp modification"],
  );
}

export function assertMaximumTraces(
  callerTrace: BlueprintPropertyReferenceTraceArtifact,
  targetTrace: BlueprintCallTargetTraceArtifact,
  callerSource: LevelProgressionArtifactIdentity,
): void {
  const changePath = `${gameModeClassPath}:${changeXpFunctionName}`;
  const eventGraphPath = `${gameModeClassPath}:${gameModeEventGraphName}`;
  if (
    callerTrace.blueprintPropertyReferences.targetPropertyName !==
      "Example Progress Limit" ||
    callerTrace.selectionRule !== "explicit-functions-with-recorded-references" ||
    !sameStringSet(callerTrace.requestedFunctionPaths, [changePath, eventGraphPath]) ||
    !sameStringSet(
      callerTrace.functions.map((function_) => function_.functionPath),
      [changePath, eventGraphPath],
    )
  ) {
    throw new Error("Maximum-XP caller trace scope changed.");
  }

  const caller = findTraceFunction(callerTrace.functions, gameModeEventGraphName);
  assertFunctionIdentity(caller, gameModeClassPath, gameModeEventGraphName);
  assertTraceNodeTree(caller);
  const context = findTraceNode(caller, 30993);
  assertTraceRootNode(caller, 30993, "EX_Context");
  if (context.kind !== "context") {
    throw new Error("Maximum-XP caller context changed.");
  }
  assertLiteralChild(
    context,
    caller,
    "ObjectExpression",
    "object",
    `${experienceClassPath.replace(".ExampleProgression_C", "")}.Default__ExampleProgression_C`,
  );
  const call = findTraceCall(caller, 31015, maximumFunctionName, "local-virtual", 2);
  assertChild(context, call, "ContextExpression");
  assertTraceSymbolChild(
    call,
    caller,
    "Parameters[1]",
    "ExampleSymbol_9f8e94efa4bd",
  );
  assertVariableAssignment(
    caller,
    31039,
    "Example Progress Limit",
    "ExampleSymbol_9f8e94efa4bd",
  );

  if (
    targetTrace.recordedCall.callerFunctionPath !== eventGraphPath ||
    targetTrace.recordedCall.statementIndex !== 31015 ||
    targetTrace.recordedCall.opcode !== "EX_LocalVirtualFunction" ||
    targetTrace.recordedCall.call.functionName !== maximumFunctionName ||
    targetTrace.recordedCall.call.callKind !== "local-virtual" ||
    targetTrace.recordedCall.call.argumentCount !== 2
  ) {
    throw new Error("Maximum-XP recorded call changed.");
  }
  if (
    targetTrace.sourceTrace.fileName !== callerSource.fileName ||
    targetTrace.sourceTrace.sha256 !== callerSource.sha256 ||
    targetTrace.sourceTrace.sizeBytes !== callerSource.sizeBytes ||
    targetTrace.sourceTrace.targetPropertyName !== "Example Progress Limit"
  ) {
    throw new Error("Maximum-XP target trace does not identify the supplied caller trace.");
  }
  if (
    targetTrace.binding.bindingRule !== "exact-context-object-class-and-declaration" ||
    targetTrace.binding.relationship !== "verified" ||
    targetTrace.binding.receiverClassMatchesDeclarationOwner !== true ||
    targetTrace.binding.argumentCountMatchesParameterCount !== true ||
    targetTrace.binding.receiver.classPath !== experienceClassPath ||
    targetTrace.binding.declaration.ownerPath !== experienceClassPath ||
    targetTrace.binding.declaration.objectPath !==
      `${experienceClassPath}:${maximumFunctionName}`
  ) {
    throw new Error("Maximum-XP call-target binding changed.");
  }

  assertMaximumFunction(targetTrace.binding.function);
}

export function assertEndOfDayTrace(
  trace: BlueprintPropertyReferenceTraceArtifact,
): void {
  const functionNames = [
    "ExampleApplyProgressRewards",
    endOfDayEventGraphName,
    initAnimationFunctionName,
    requirementFunctionName,
    cumulativeFunctionName,
  ];
  const functionPaths = functionNames.map((name) => `${endOfDayClassPath}:${name}`);
  if (
    trace.blueprintPropertyReferences.targetPropertyName !== "ExampleLevel" ||
    trace.selectionRule !== "explicit-functions-with-recorded-references" ||
    !sameStringSet(trace.requestedFunctionPaths, functionPaths) ||
    !sameStringSet(
      trace.functions.map((function_) => function_.functionPath),
      functionPaths,
    )
  ) {
    throw new Error("End-of-day Level trace scope changed.");
  }

  const requirement = findTraceFunction(trace.functions, requirementFunctionName);
  const cumulative = findTraceFunction(trace.functions, cumulativeFunctionName);
  const init = findTraceFunction(trace.functions, initAnimationFunctionName);
  const eventGraph = findTraceFunction(trace.functions, endOfDayEventGraphName);
  for (const function_ of [requirement, cumulative, init, eventGraph]) {
    assertFunctionIdentity(function_, endOfDayClassPath, function_.functionName);
    assertTraceNodeTree(function_);
  }
  assertRequirementFunction(requirement);
  assertCumulativeFunction(cumulative);
  assertInitAnimationFunction(init);
  assertEndOfDayEventGraph(eventGraph);
}

function assertMaximumFunction(function_: BlueprintTraceFunctionInput): void {
  assertFunctionIdentity(function_, experienceClassPath, maximumFunctionName);
  assertTraceNodeTree(function_);
  assertObjectAssignment(function_, 99, "ExampleProgressTable", xpTableObjectPath);
  assertCallWithLiteral(
    function_,
    136,
    "GetDataTableColumnAsString",
    "final",
    "Parameters[1]",
    "name",
    "ExampleRequiredProgress",
  );
  assertCallArguments(
    function_,
    254,
    "Array_Length",
    "final",
    ["ExampleSymbol_d75d2a8b4564"],
  );
  assertCallArguments(
    function_,
    283,
    "Less_IntInt",
    "final",
    ["Temp_int_Loop_Counter_Variable", "ExampleSymbol_5546bd5cfb37"],
  );
  assertTraceJump(function_, 311, "conditional-false", "codeOffset", 555);
  assertCallArguments(
    function_,
    379,
    "Array_Get",
    "final",
    [
      "ExampleSymbol_d75d2a8b4564",
      "Temp_int_Array_Index_Variable",
      "ExampleSymbol_4bb2d3edf81f",
    ],
  );
  assertCallArguments(
    function_,
    434,
    "Conv_StringToInt",
    "final",
    ["ExampleSymbol_4bb2d3edf81f"],
  );
  assertCallArguments(
    function_,
    471,
    "Add_IntInt",
    "final",
    ["ExampleSymbol_abfd6d199e8b", "Accumulated XP"],
  );
  assertVariableAssignment(
    function_,
    499,
    "Accumulated XP",
    "ExampleSymbol_68a76c00e78c",
  );
  assertCallWithLiteral(
    function_,
    605,
    "Add_IntInt",
    "final",
    "Parameters[1]",
    "integer",
    "1",
  );
  assertTraceJump(function_, 656, "unconditional", "codeOffset", 214);
  assertVariableAssignment(function_, 555, "Example Required Progress", "Accumulated XP");
}

function assertRequirementFunction(function_: BlueprintTraceFunctionInput): void {
  assertCallWithLiteral(
    function_,
    18,
    "GetDataTableColumnAsString",
    "final",
    "Parameters[1]",
    "name",
    "ExampleRequiredProgress",
  );
  assertCallWithLiteral(
    function_,
    196,
    "GreaterEqual_IntInt",
    "final",
    "Parameters[1]",
    "integer",
    "3",
  );
  assertLiteralAssignment(function_, 234, "ExampleLevel", "integer", "99999");
  assertTraceJump(function_, 150, "conditional-false", "codeOffset", 390);
  assertCallArguments(
    function_,
    412,
    "Array_Get",
    "final",
    [
      "ExampleSymbol_d75d2a8b4564",
      "ExampleCurrentTier",
      "ExampleSymbol_4bb2d3edf81f",
    ],
  );
  assertCallArguments(
    function_,
    467,
    "Conv_StringToInt",
    "final",
    ["ExampleSymbol_4bb2d3edf81f"],
  );
  assertVariableAssignment(
    function_,
    486,
    "ExampleLevel",
    "ExampleSymbol_abfd6d199e8b",
  );
}

function assertCumulativeFunction(function_: BlueprintTraceFunctionInput): void {
  assertCallWithLiteral(
    function_,
    140,
    "GetDataTableColumnAsString",
    "final",
    "Parameters[1]",
    "name",
    "ExampleLevel",
  );
  assertCallWithLiteral(
    function_,
    190,
    "GetDataTableColumnAsString",
    "final",
    "Parameters[1]",
    "name",
    "ExampleRequiredProgress",
  );
  assertCallArguments(
    function_,
    348,
    "Array_Length",
    "final",
    ["ExampleSymbol_d75d2a8b4564"],
  );
  assertCallArguments(
    function_,
    511,
    "Array_Get",
    "final",
    [
      "ExampleSymbol_d75d2a8b4564",
      "Temp_int_Array_Index_Variable",
      "ExampleSymbol_4bb2d3edf81f",
    ],
  );
  assertCallArguments(
    function_,
    603,
    "Add_IntInt",
    "final",
    ["ExampleSymbol_abfd6d199e8b", "Accumulated XP"],
  );
  assertCallArguments(
    function_,
    668,
    "GreaterEqual_IntInt",
    "final",
    ["Temp_int_Array_Index_Variable", "local Level"],
  );
  assertVariableAssignment(function_, 746, "Example Required Progress", "Accumulated XP");
}

function assertInitAnimationFunction(function_: BlueprintTraceFunctionInput): void {
  assertCallArgumentsBySymbol(
    function_,
    230,
    cumulativeFunctionName,
    "local-virtual",
    ["ExampleLevel", "ExampleSymbol_a7c13f9116b9"],
  );
  assertCallArguments(
    function_,
    375,
    cumulativeFunctionName,
    "local-virtual",
    ["ExampleSymbol_e786ddbe8538", "ExampleSymbol_526ef20c98db"],
  );
  assertCallArgumentsBySymbol(
    function_,
    452,
    "Subtract_IntInt",
    "final",
    ["Example Current Progress", "ExampleDailyProgress"],
  );
  assertCallArguments(
    function_,
    586,
    "Subtract_IntInt",
    "final",
    ["ExampleSymbol_0e5eff394dbb", "Example Cumulative Progress"],
  );
  assertVariableAssignment(
    function_,
    895,
    "ExampleInitialProgress",
    "ExampleSymbol_c65df1df8c08",
  );
  assertAssignmentSourceSymbol(function_, 922, "Example Remaining Progress", "ExampleDailyProgress");
}

function assertEndOfDayEventGraph(function_: BlueprintTraceFunctionInput): void {
  assertLiteralAssignment(
    function_,
    15,
    "ExampleProgressFraction",
    "number",
    "0",
  );
  assertCallWithLiteral(
    function_,
    114,
    "Subtract_IntInt",
    "final",
    "Parameters[1]",
    "integer",
    "1",
  );
  assertCallArguments(
    function_,
    160,
    requirementFunctionName,
    "local-virtual",
    ["ExampleSymbol_0e5eff394dbb", "ExampleSymbol_c98aa86e91ba"],
  );
  assertCallArguments(
    function_,
    210,
    "FFloor",
    "final",
    ["ExampleInitialProgress"],
  );
  assertCallArguments(
    function_,
    247,
    "Subtract_IntInt",
    "final",
    ["ExampleSymbol_c98aa86e91ba", "ExampleSymbol_b4e18586ed51"],
  );
  assertCallArguments(
    function_,
    293,
    "Subtract_IntInt",
    "final",
    ["Example Remaining Progress", "ExampleSymbol_d33b763b6534"],
  );
  assertVariableAssignment(
    function_,
    321,
    "Example Remaining Progress",
    "ExampleSymbol_be6409e14ce2",
  );
  assertLiteralAssignment(function_, 348, "ExampleInitialProgress", "number", "0");
  assertCallArgumentsBySymbol(
    function_,
    375,
    requirementFunctionName,
    "local-virtual",
    ["ExampleLevel", "ExampleSymbol_2b6c8e733724"],
  );
  assertCallWithLiteral(
    function_,
    576,
    "Add_IntInt",
    "final",
    "Parameters[1]",
    "integer",
    "1",
  );
  assertVariableAssignment(
    function_,
    622,
    "ExampleLevel",
    "ExampleSymbol_fbf99360b7d0",
  );
  assertSkipOffset(function_, 953, "Delay", 15);
  assertSkipOffset(function_, 1053, "DelayUntilNextTick", 558);
  assertSkipOffset(function_, 1508, "DelayUntilNextTick", 1008);

  assertCallArgumentsBySymbol(
    function_,
    2912,
    requirementFunctionName,
    "local-virtual",
    ["ExampleLevel", "ExampleSymbol_d226b81c5597"],
  );
  assertCallArguments(
    function_,
    4034,
    "Divide_DoubleDouble",
    "final",
    ["ExampleSymbol_05f5d19e94a0", "ExampleSymbol_c65df1df8c08"],
  );
  const clamp = findTraceCall(function_, 4080, "FClamp", "final", 3);
  assertTraceSymbolChild(
    clamp,
    function_,
    "Parameters[0]",
    "ExampleSymbol_7fb9e119d7ae",
  );
  assertTraceLiteralChild(clamp, function_, "Parameters[1]", "number", "0");
  assertTraceLiteralChild(clamp, function_, "Parameters[2]", "number", "1");
  assertVariableAssignment(
    function_,
    4117,
    "ExampleProgressFraction",
    "ExampleSymbol_993c5cdf8035",
  );
  assertCallWithLiteral(
    function_,
    1786,
    "GreaterEqual_DoubleDouble",
    "final",
    "Parameters[1]",
    "number",
    "1",
  );
  assertTraceJump(function_, 1814, "conditional-false", "codeOffset", 1833);
  assertTraceJump(function_, 1828, "unconditional", "codeOffset", 1488);
  assertCallWithLiteral(
    function_,
    1843,
    "GreaterEqual_DoubleDouble",
    "final",
    "Parameters[1]",
    "number",
    "1",
  );
  assertCallWithLiteral(
    function_,
    1881,
    "LessEqual_IntInt",
    "final",
    "Parameters[1]",
    "integer",
    "0",
  );
  assertCallArguments(
    function_,
    1915,
    "BooleanOR",
    "final",
    [
      "ExampleSymbol_a689c31c681f",
      "ExampleSymbol_a3f5a084342d",
    ],
  );
  findTraceCall(function_, 1953, "K2_ClearAndInvalidateTimerHandle", "final", 2);
}

function assertFunctionIdentity(
  function_: BlueprintTraceFunctionInput,
  classPath: string,
  functionName: string,
): void {
  if (
    function_.classPath !== classPath ||
    function_.functionName !== functionName ||
    function_.functionPath !== `${classPath}:${functionName}`
  ) {
    throw new Error(`Blueprint function identity changed for ${functionName}.`);
  }
}

function assertCallArguments(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  functionName: string,
  callKind: NonNullable<BlueprintTraceNodeInput["call"]>["callKind"],
  symbols: readonly string[],
): void {
  const call = findTraceCall(
    function_,
    statementIndex,
    functionName,
    callKind,
    symbols.length,
  );
  for (const [position, symbol] of symbols.entries()) {
    assertTraceSymbolChild(call, function_, `Parameters[${position}]`, symbol);
  }
}

function assertCallArgumentsBySymbol(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  functionName: string,
  callKind: NonNullable<BlueprintTraceNodeInput["call"]>["callKind"],
  symbols: readonly string[],
): void {
  const call = findTraceCall(
    function_,
    statementIndex,
    functionName,
    callKind,
    symbols.length,
  );
  for (const [position, symbol] of symbols.entries()) {
    const child = findChild(call, function_, `Parameters[${position}]`);
    if (child.symbol !== symbol) {
      throw new Error(
        `Blueprint trace input changed at statement ${statementIndex}.`,
      );
    }
  }
}

function assertCallWithLiteral(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  functionName: string,
  callKind: NonNullable<BlueprintTraceNodeInput["call"]>["callKind"],
  edge: string,
  literalType: NonNullable<BlueprintTraceNodeInput["literal"]>["literalType"],
  value: string,
): void {
  const argumentCount = Number(edge.match(/\[(\d+)\]/u)?.[1] ?? 0) + 1;
  const call = findTraceCall(
    function_,
    statementIndex,
    functionName,
    callKind,
    argumentCount,
  );
  assertTraceLiteralChild(call, function_, edge, literalType, value);
}

function assertVariableAssignment(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  targetSymbol: string,
  sourceSymbol: string,
): void {
  const assignment = findTraceNode(function_, statementIndex);
  assertTraceRootNode(function_, statementIndex, assignment.opcode);
  if (assignment.kind !== "assignment" || assignment.symbol !== targetSymbol) {
    throw new Error(`Blueprint assignment changed at statement ${statementIndex}.`);
  }
  assertTraceSymbolChild(assignment, function_, "Assignment", sourceSymbol);
}

function assertAssignmentSourceSymbol(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  targetSymbol: string,
  sourceSymbol: string,
): void {
  const assignment = findTraceNode(function_, statementIndex);
  assertTraceRootNode(function_, statementIndex, assignment.opcode);
  if (assignment.kind !== "assignment" || assignment.symbol !== targetSymbol) {
    throw new Error(`Blueprint assignment changed at statement ${statementIndex}.`);
  }
  const source = findChild(assignment, function_, "Assignment");
  if (source.symbol !== sourceSymbol) {
    throw new Error(`Blueprint assignment source changed at statement ${statementIndex}.`);
  }
}

function assertLiteralAssignment(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  targetSymbol: string,
  literalType: NonNullable<BlueprintTraceNodeInput["literal"]>["literalType"],
  value: string,
): void {
  const assignment = findTraceNode(function_, statementIndex);
  assertTraceRootNode(function_, statementIndex, assignment.opcode);
  if (assignment.kind !== "assignment" || assignment.symbol !== targetSymbol) {
    throw new Error(`Blueprint assignment changed at statement ${statementIndex}.`);
  }
  assertTraceLiteralChild(assignment, function_, "Assignment", literalType, value);
}

function assertObjectAssignment(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  targetSymbol: string,
  objectPath: string,
): void {
  const assignment = findTraceNode(function_, statementIndex);
  assertTraceRootNode(function_, statementIndex, assignment.opcode);
  if (assignment.kind !== "assignment") {
    throw new Error(`Blueprint assignment changed at statement ${statementIndex}.`);
  }
  assertTraceSymbolChild(assignment, function_, "Variable", targetSymbol);
  assertLiteralChild(assignment, function_, "Assignment", "object", objectPath);
}

function assertLiteralChild(
  parent: BlueprintTraceNodeInput,
  function_: BlueprintTraceFunctionInput,
  edge: string,
  literalType: NonNullable<BlueprintTraceNodeInput["literal"]>["literalType"],
  value: string,
): void {
  const child = findChild(parent, function_, edge);
  if (child.literal?.literalType !== literalType || child.literal.value !== value) {
    throw new Error(
      `Blueprint trace literal changed for ${edge} at statement ${parent.statementIndex}.`,
    );
  }
}

function assertSkipOffset(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  functionName: string,
  target: number,
): void {
  const call = findTraceCall(function_, statementIndex, functionName, "final", functionName === "Delay" ? 3 : 2);
  const descendants = function_.nodes.filter((node) => isDescendant(node, call, function_));
  const matches = descendants.filter(
    (node) =>
      node.opcode === "EX_SkipOffsetConst" &&
      node.literal?.literalType === "integer" &&
      node.literal.value === String(target),
  );
  if (matches.length !== 1) {
    throw new Error(`Blueprint continuation target changed at statement ${statementIndex}.`);
  }
}

function isDescendant(
  node: BlueprintTraceNodeInput,
  ancestor: BlueprintTraceNodeInput,
  function_: BlueprintTraceFunctionInput,
): boolean {
  let parentIndex = node.parentNodeIndex;
  while (parentIndex !== null) {
    if (parentIndex === ancestor.nodeIndex) {
      return true;
    }
    parentIndex = function_.nodes[parentIndex]?.parentNodeIndex ?? null;
  }
  return false;
}

function assertChild(
  parent: BlueprintTraceNodeInput,
  child: BlueprintTraceNodeInput,
  edge: string,
): void {
  if (child.parentNodeIndex !== parent.nodeIndex || child.edge !== edge) {
    throw new Error(
      `Blueprint trace operation changed for ${edge} at statement ${parent.statementIndex}.`,
    );
  }
}

function findChild(
  parent: BlueprintTraceNodeInput,
  function_: BlueprintTraceFunctionInput,
  edge: string,
): BlueprintTraceNodeInput {
  const matches = function_.nodes.filter(
    (node) => node.parentNodeIndex === parent.nodeIndex && node.edge === edge,
  );
  if (matches.length !== 1) {
    throw new Error(
      `Expected one Blueprint trace child ${edge} at statement ${parent.statementIndex}.`,
    );
  }
  return matches[0]!;
}

function sameStringSet(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return actual.length === expected.length &&
    [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
}
