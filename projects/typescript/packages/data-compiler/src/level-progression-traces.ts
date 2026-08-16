import type {
  LevelProgressionArtifactIdentity,
  LevelProgressionTargetProfile,
} from "@neonretrorewind/core";

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

export function assertChangeXpTrace(
  trace: BlueprintFunctionTraceArtifact,
  profile: LevelProgressionTargetProfile,
): void {
  const target = profile.traces.experienceUpdate;
  if (
    trace.functions.length !== 1 ||
    trace.functions[0]?.functionPath !== `${target.classPath}:${target.functionName}`
  ) {
    throw new Error("Change-XP trace scope changed.");
  }
  const function_ = findTraceFunction(trace.functions, target.functionName);
  assertFunctionIdentity(function_, target.classPath, target.functionName);
  assertTraceNodeTree(function_);

  assertVariableAssignment(
    function_,
    target.statements.retainModification,
    target.fields.localModification,
    target.fields.modificationInput,
  );
  assertCallArguments(
    function_,
    target.statements.addLifetimeExperience,
    "Add_IntInt",
    "final",
    [target.fields.lifetimeExperience, target.fields.localModification],
  );
  assertVariableAssignment(
    function_,
    target.statements.storeLifetimeExperience,
    target.fields.lifetimeExperience,
    target.symbols.lifetimeAddResult,
  );
  assertCallArguments(
    function_,
    target.statements.addCurrentExperience,
    "Add_IntInt",
    "final",
    [target.fields.localModification, target.fields.currentExperience],
  );
  assertCallArguments(
    function_,
    target.statements.capCurrentExperience,
    "Min",
    "final",
    [target.symbols.currentAddResult, target.fields.maximumExperience],
  );
  assertVariableAssignment(
    function_,
    target.statements.storeCurrentExperience,
    target.fields.currentExperience,
    target.symbols.cappedResult,
  );
  assertCallArguments(
    function_,
    target.statements.publishUiValue,
    target.functions.publishUiValue,
    "local-virtual",
    [target.fields.localModification, target.fields.currentExperience],
  );
  assertCallArguments(
    function_,
    target.statements.addDailyStatistic,
    target.functions.addDailyStatistic,
    "local-virtual",
    [target.fields.localModification],
  );
}

export function assertMaximumTraces(
  callerTrace: BlueprintPropertyReferenceTraceArtifact,
  targetTrace: BlueprintCallTargetTraceArtifact,
  callerSource: LevelProgressionArtifactIdentity,
  profile: LevelProgressionTargetProfile,
): void {
  const change = profile.traces.experienceUpdate;
  const target = profile.traces.maximum;
  const changePath = `${change.classPath}:${change.functionName}`;
  const eventGraphPath = `${target.callerClassPath}:${target.callerFunction}`;
  if (
    callerTrace.blueprintPropertyReferences.targetPropertyName !==
      target.destinationField ||
    callerTrace.selectionRule !== "explicit-functions-with-recorded-references" ||
    !sameStringSet(callerTrace.requestedFunctionPaths, [changePath, eventGraphPath]) ||
    !sameStringSet(
      callerTrace.functions.map((function_) => function_.functionPath),
      [changePath, eventGraphPath],
    )
  ) {
    throw new Error("Maximum-XP caller trace scope changed.");
  }

  const caller = findTraceFunction(callerTrace.functions, target.callerFunction);
  assertFunctionIdentity(caller, target.callerClassPath, target.callerFunction);
  assertTraceNodeTree(caller);
  const context = findTraceNode(caller, target.statements.callerContext);
  assertTraceRootNode(caller, target.statements.callerContext, "EX_Context");
  if (context.kind !== "context") {
    throw new Error("Maximum-XP caller context changed.");
  }
  assertLiteralChild(
    context,
    caller,
    "ObjectExpression",
    "object",
    target.receiverObjectPath,
  );
  const call = findTraceCall(
    caller,
    target.statements.callerCall,
    target.targetFunction,
    "local-virtual",
    2,
  );
  assertChild(context, call, "ContextExpression");
  assertTraceSymbolChild(
    call,
    caller,
    "Parameters[1]",
    target.symbols.callerResult,
  );
  assertVariableAssignment(
    caller,
    target.statements.callerAssignment,
    target.destinationField,
    target.symbols.callerResult,
  );

  if (
    targetTrace.recordedCall.callerFunctionPath !== eventGraphPath ||
    targetTrace.recordedCall.statementIndex !== target.statements.callerCall ||
    targetTrace.recordedCall.opcode !== "EX_LocalVirtualFunction" ||
    targetTrace.recordedCall.call.functionName !== target.targetFunction ||
    targetTrace.recordedCall.call.callKind !== "local-virtual" ||
    targetTrace.recordedCall.call.argumentCount !== 2
  ) {
    throw new Error("Maximum-XP recorded call changed.");
  }
  if (
    targetTrace.sourceTrace.fileName !== callerSource.fileName ||
    targetTrace.sourceTrace.sha256 !== callerSource.sha256 ||
    targetTrace.sourceTrace.sizeBytes !== callerSource.sizeBytes ||
    targetTrace.sourceTrace.targetPropertyName !== target.destinationField
  ) {
    throw new Error("Maximum-XP target trace does not identify the supplied caller trace.");
  }
  if (
    targetTrace.binding.bindingRule !== "exact-context-object-class-and-declaration" ||
    targetTrace.binding.relationship !== "verified" ||
    targetTrace.binding.receiverClassMatchesDeclarationOwner !== true ||
    targetTrace.binding.argumentCountMatchesParameterCount !== true ||
    targetTrace.binding.receiver.classPath !== target.targetClassPath ||
    targetTrace.binding.declaration.ownerPath !== target.targetClassPath ||
    targetTrace.binding.declaration.objectPath !==
      `${target.targetClassPath}:${target.targetFunction}`
  ) {
    throw new Error("Maximum-XP call-target binding changed.");
  }

  assertMaximumFunction(targetTrace.binding.function, profile);
}

export function assertEndOfDayTrace(
  trace: BlueprintPropertyReferenceTraceArtifact,
  profile: LevelProgressionTargetProfile,
): void {
  const target = profile.traces.endOfDay;
  const functionNames = [
    target.functions.applyRewards,
    target.functions.eventGraph,
    target.functions.initializeAnimation,
    target.functions.requirementLookup,
    target.functions.cumulativeProgress,
  ];
  const functionPaths = functionNames.map((name) => `${target.classPath}:${name}`);
  if (
    trace.blueprintPropertyReferences.targetPropertyName !== target.levelProperty ||
    trace.selectionRule !== "explicit-functions-with-recorded-references" ||
    !sameStringSet(trace.requestedFunctionPaths, functionPaths) ||
    !sameStringSet(
      trace.functions.map((function_) => function_.functionPath),
      functionPaths,
    )
  ) {
    throw new Error("End-of-day Level trace scope changed.");
  }

  const requirement = findTraceFunction(trace.functions, target.functions.requirementLookup);
  const cumulative = findTraceFunction(trace.functions, target.functions.cumulativeProgress);
  const init = findTraceFunction(trace.functions, target.functions.initializeAnimation);
  const eventGraph = findTraceFunction(trace.functions, target.functions.eventGraph);
  for (const function_ of [requirement, cumulative, init, eventGraph]) {
    assertFunctionIdentity(function_, target.classPath, function_.functionName);
    assertTraceNodeTree(function_);
  }
  assertRequirementFunction(requirement, profile);
  assertCumulativeFunction(cumulative, profile);
  assertInitAnimationFunction(init, profile);
  assertEndOfDayEventGraph(eventGraph, profile);
}

function assertMaximumFunction(
  function_: BlueprintTraceFunctionInput,
  profile: LevelProgressionTargetProfile,
): void {
  const target = profile.traces.maximum;
  assertFunctionIdentity(function_, target.targetClassPath, target.targetFunction);
  assertTraceNodeTree(function_);
  assertObjectAssignment(
    function_,
    target.statements.targetTable,
    target.tableVariable,
    profile.xpTable.objectPath,
  );
  assertCallWithLiteral(
    function_,
    target.statements.targetColumn,
    "GetDataTableColumnAsString",
    "final",
    "Parameters[1]",
    "name",
    profile.xpTable.fields.requiredProgress,
  );
  assertCallArguments(
    function_,
    target.statements.targetArrayLength,
    "Array_Length",
    "final",
    [target.symbols.columnValues],
  );
  assertCallArguments(
    function_,
    target.statements.targetLoopCondition,
    "Less_IntInt",
    "final",
    [target.symbols.loopCounter, target.symbols.arrayLength],
  );
  assertTraceJump(
    function_,
    target.statements.targetLoopExit,
    "conditional-false",
    "codeOffset",
    target.jumpTargets.loopExit,
  );
  assertCallArguments(
    function_,
    target.statements.targetArrayGet,
    "Array_Get",
    "final",
    [
      target.symbols.columnValues,
      target.symbols.arrayIndex,
      target.symbols.arrayItem,
    ],
  );
  assertCallArguments(
    function_,
    target.statements.targetConvert,
    "Conv_StringToInt",
    "final",
    [target.symbols.arrayItem],
  );
  assertCallArguments(
    function_,
    target.statements.targetAccumulate,
    "Add_IntInt",
    "final",
    [target.symbols.convertedItem, target.accumulator],
  );
  assertVariableAssignment(
    function_,
    target.statements.targetStoreAccumulator,
    target.accumulator,
    target.symbols.accumulatedValue,
  );
  assertCallWithLiteral(
    function_,
    target.statements.targetIncrement,
    "Add_IntInt",
    "final",
    "Parameters[1]",
    "integer",
    "1",
  );
  assertTraceJump(
    function_,
    target.statements.targetLoopBack,
    "unconditional",
    "codeOffset",
    target.jumpTargets.loopBack,
  );
  assertVariableAssignment(
    function_,
    target.statements.targetOutput,
    target.outputField,
    target.accumulator,
  );
}

function assertRequirementFunction(
  function_: BlueprintTraceFunctionInput,
  profile: LevelProgressionTargetProfile,
): void {
  const target = profile.traces.requirementLookup;
  assertCallWithLiteral(
    function_,
    target.statements.readColumn,
    "GetDataTableColumnAsString",
    "final",
    "Parameters[1]",
    "name",
    profile.xpTable.fields.requiredProgress,
  );
  assertCallWithLiteral(
    function_,
    target.statements.demoComparison,
    "GreaterEqual_IntInt",
    "final",
    "Parameters[1]",
    "integer",
    String(target.demoOverride.atOrAboveRuntimeLevel),
  );
  assertLiteralAssignment(
    function_,
    target.statements.demoOverride,
    target.outputField,
    "integer",
    String(target.demoOverride.requiredXp),
  );
  assertTraceJump(
    function_,
    target.statements.branch,
    "conditional-false",
    "codeOffset",
    target.jumpTargets.fullGame,
  );
  assertCallArguments(
    function_,
    target.statements.fullGameArrayGet,
    "Array_Get",
    "final",
    [
      target.symbols.columnValues,
      target.currentLevelSymbol,
      target.symbols.arrayItem,
    ],
  );
  assertCallArguments(
    function_,
    target.statements.fullGameConvert,
    "Conv_StringToInt",
    "final",
    [target.symbols.arrayItem],
  );
  assertVariableAssignment(
    function_,
    target.statements.storeOutput,
    target.outputField,
    target.symbols.convertedItem,
  );
}

function assertCumulativeFunction(
  function_: BlueprintTraceFunctionInput,
  profile: LevelProgressionTargetProfile,
): void {
  const target = profile.traces.endOfDay;
  assertCallWithLiteral(
    function_,
    target.statements.cumulativeLevelColumn,
    "GetDataTableColumnAsString",
    "final",
    "Parameters[1]",
    "name",
    profile.xpTable.fields.level,
  );
  assertCallWithLiteral(
    function_,
    target.statements.cumulativeXpColumn,
    "GetDataTableColumnAsString",
    "final",
    "Parameters[1]",
    "name",
    profile.xpTable.fields.requiredProgress,
  );
  assertCallArguments(
    function_,
    target.statements.cumulativeArrayLength,
    "Array_Length",
    "final",
    [target.symbols.cumulativeColumnValues],
  );
  assertCallArguments(
    function_,
    target.statements.cumulativeArrayGet,
    "Array_Get",
    "final",
    [
      target.symbols.cumulativeColumnValues,
      target.symbols.cumulativeArrayIndex,
      target.symbols.cumulativeArrayItem,
    ],
  );
  assertCallArguments(
    function_,
    target.statements.cumulativeAccumulate,
    "Add_IntInt",
    "final",
    [target.symbols.cumulativeConvertedItem, target.symbols.cumulativeAccumulator],
  );
  assertCallArguments(
    function_,
    target.statements.cumulativeStopComparison,
    "GreaterEqual_IntInt",
    "final",
    [target.symbols.cumulativeLoopCounter, target.symbols.cumulativeLevelInput],
  );
  assertVariableAssignment(
    function_,
    target.statements.cumulativeOutput,
    target.fields.requirementOutput,
    target.symbols.cumulativeAccumulator,
  );
}

function assertInitAnimationFunction(
  function_: BlueprintTraceFunctionInput,
  profile: LevelProgressionTargetProfile,
): void {
  const target = profile.traces.endOfDay;
  assertCallArgumentsBySymbol(
    function_,
    target.statements.initializePreviousCumulative,
    target.functions.cumulativeProgress,
    "local-virtual",
    [target.levelProperty, target.symbols.initialPreviousCumulative],
  );
  assertCallArguments(
    function_,
    target.statements.initializeCurrentCumulative,
    target.functions.cumulativeProgress,
    "local-virtual",
    [target.symbols.initialPreviousLevel, target.symbols.initialCurrentCumulative],
  );
  assertCallArgumentsBySymbol(
    function_,
    target.statements.initializeSubtractDaily,
    "Subtract_IntInt",
    "final",
    [target.fields.currentExperience, target.fields.dailyExperience],
  );
  assertCallArguments(
    function_,
    target.statements.initializeSubtractPrevious,
    "Subtract_IntInt",
    "final",
    [target.symbols.initialStartingExperience, target.fields.cumulativeExperience],
  );
  assertVariableAssignment(
    function_,
    target.statements.initializeStoreInitial,
    target.fields.initialExperience,
    target.symbols.initialCurrentCumulativeResult,
  );
  assertAssignmentSourceSymbol(
    function_,
    target.statements.initializeStoreRemaining,
    target.fields.remainingExperience,
    target.fields.dailyExperience,
  );
}

function assertEndOfDayEventGraph(
  function_: BlueprintTraceFunctionInput,
  profile: LevelProgressionTargetProfile,
): void {
  const target = profile.traces.endOfDay;
  assertLiteralAssignment(
    function_,
    target.statements.resetProgress,
    target.fields.progressFraction,
    "number",
    "0",
  );
  assertCallWithLiteral(
    function_,
    target.statements.previousLevelSubtract,
    "Subtract_IntInt",
    "final",
    "Parameters[1]",
    "integer",
    "1",
  );
  assertCallArguments(
    function_,
    target.statements.initializePreviousRequirement,
    target.functions.requirementLookup,
    "local-virtual",
    [target.symbols.previousLevel, target.symbols.previousRequirement],
  );
  assertCallArguments(
    function_,
    target.statements.floorInitialXp,
    "FFloor",
    "final",
    [target.fields.initialExperience],
  );
  assertCallArguments(
    function_,
    target.statements.calculateLevelCost,
    "Subtract_IntInt",
    "final",
    [target.symbols.previousRequirement, target.symbols.flooredInitialExperience],
  );
  assertCallArguments(
    function_,
    target.statements.deductLevelCost,
    "Subtract_IntInt",
    "final",
    [target.fields.remainingExperience, target.symbols.levelCost],
  );
  assertVariableAssignment(
    function_,
    target.statements.storeRemainingXp,
    target.fields.remainingExperience,
    target.symbols.remainingAfterDeduction,
  );
  assertLiteralAssignment(
    function_,
    target.statements.resetInitialXp,
    target.fields.initialExperience,
    "number",
    "0",
  );
  assertCallArgumentsBySymbol(
    function_,
    target.statements.lookupNextRequirement,
    target.functions.requirementLookup,
    "local-virtual",
    [target.levelProperty, target.symbols.nextRequirement],
  );
  assertCallWithLiteral(
    function_,
    target.statements.incrementLevel,
    "Add_IntInt",
    "final",
    "Parameters[1]",
    "integer",
    "1",
  );
  assertVariableAssignment(
    function_,
    target.statements.storeLevel,
    target.levelProperty,
    target.symbols.incrementedLevel,
  );
  assertSkipOffset(
    function_,
    target.statements.returnToInitialization,
    "Delay",
    target.jumpTargets.returnToInitialization,
  );
  assertSkipOffset(
    function_,
    target.statements.nextTickFirst,
    "DelayUntilNextTick",
    target.jumpTargets.nextTickFirst,
  );
  assertSkipOffset(
    function_,
    target.statements.nextTickSecond,
    "DelayUntilNextTick",
    target.jumpTargets.nextTickSecond,
  );

  assertCallArgumentsBySymbol(
    function_,
    target.statements.updateProgressText,
    target.functions.requirementLookup,
    "local-virtual",
    [target.levelProperty, target.symbols.displayedRequirement],
  );
  assertCallArguments(
    function_,
    target.statements.progressDivide,
    "Divide_DoubleDouble",
    "final",
    [target.symbols.progressNumerator, target.symbols.progressDenominator],
  );
  const clamp = findTraceCall(
    function_,
    target.statements.progressClamp,
    "FClamp",
    "final",
    3,
  );
  assertTraceSymbolChild(
    clamp,
    function_,
    "Parameters[0]",
    target.symbols.progressQuotient,
  );
  assertTraceLiteralChild(clamp, function_, "Parameters[1]", "number", "0");
  assertTraceLiteralChild(clamp, function_, "Parameters[2]", "number", "1");
  assertVariableAssignment(
    function_,
    target.statements.storeProgress,
    target.fields.progressFraction,
    target.symbols.clampedProgress,
  );
  assertCallWithLiteral(
    function_,
    target.statements.compareProgress,
    "GreaterEqual_DoubleDouble",
    "final",
    "Parameters[1]",
    "number",
    "1",
  );
  assertTraceJump(
    function_,
    target.statements.progressBranch,
    "conditional-false",
    "codeOffset",
    target.jumpTargets.progressIncomplete,
  );
  assertTraceJump(
    function_,
    target.statements.levelUpRoute,
    "unconditional",
    "codeOffset",
    target.jumpTargets.levelUpRoute,
  );
  assertCallWithLiteral(
    function_,
    target.statements.compareTimer,
    "GreaterEqual_DoubleDouble",
    "final",
    "Parameters[1]",
    "number",
    "1",
  );
  assertCallWithLiteral(
    function_,
    target.statements.compareRemainingXp,
    "LessEqual_IntInt",
    "final",
    "Parameters[1]",
    "integer",
    "0",
  );
  assertCallArguments(
    function_,
    target.statements.combineStopConditions,
    "BooleanOR",
    "final",
    [
      target.symbols.timerComplete,
      target.symbols.remainingComplete,
    ],
  );
  findTraceCall(
    function_,
    target.statements.clearTimer,
    "K2_ClearAndInvalidateTimerHandle",
    "final",
    2,
  );
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
