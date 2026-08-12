import type {
  NewReleaseArtifactIdentity,
  NewReleaseMechanics,
} from "@neonretrorewind/core";

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
  BlueprintPropertyReferenceTraceArtifact,
} from "./blueprint-trace-inputs.ts";

const marketClassPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C";
const rebuildFunctionName = "ExampleRebuildCandidates";
const rebuildFunctionPath = `${marketClassPath}:${rebuildFunctionName}`;
const filterFunctionName = "Filter Example Schedule";
const filterFunctionPath = `${marketClassPath}:${filterFunctionName}`;
const predicateFunctionName = "Evaluate Example Record";
const predicateClassPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/data/ExampleRecord.ExampleRecord_C";
const predicateFunctionPath = `${predicateClassPath}:${predicateFunctionName}`;
const candidateCollection = "Example Candidate Map";
const sourceCollection = "Example Source Map";
const sourceValuesSymbol = "ExampleSymbol_5c9e16b9b19d";
const loopCounterSymbol = "Temp_int_Loop_Counter_Variable";
const arrayIndexSymbol = "Temp_int_Array_Index_Variable";
const arrayLengthSymbol = "ExampleSymbol_5546bd5cfb37";
const loopConditionSymbol = "ExampleSymbol_ea1fd7e15884";
const incrementedCounterSymbol = "ExampleSymbol_fbf99360b7d0";
const selectedFilmSymbol = "ExampleSymbol_4bb2d3edf81f";
const inputFilmSymbol = "Example Input Record";
const eligibleFilmSymbol = "ExampleSymbol_5ac47990d176 Input Record";
const ineligibleFilmSymbol = "ExampleSymbol_5ac47990d176 Input Record_1";
const releasedSymbol = "ExampleField12_0_00000000000000000000000000000000";
const secondHandSymbol =
  "ExampleField14_0_00000000000000000000000000000000";
const productSymbol = "ExampleField11_0_00000000000000000000000000000000";
const productSkuSymbol = "ExampleField15_0_00000000000000000000000000000000";
const productBoxDataSymbol = "ExampleField03_0_00000000000000000000000000000000";
const productBaseStructureSymbol = "ExampleField02_0_00000000000000000000000000000000";
const basePriceSymbol = "ExampleField01_0_00000000000000000000000000000000";
const availableDaySymbol =
  "Example Available Period_0_00000000000000000000000000000000";
const elapsedSymbol = "ExampleSymbol_e786ddbe8538";
const durationSymbol = "ExampleDuration";
const isNewSymbol = "ExampleSymbol_a3f5a084342d";
const availablePlusDurationSymbol = "ExampleSymbol_fbf99360b7d0";
const remainingDaysSymbol = "ExampleSymbol_0e5eff394dbb";
const predicateOutputSymbol = "ExampleSymbol_cb75a284c42b";
const predicateRemainingDaysSymbol =
  "ExampleSymbol_c12d64d7fc3d";

export function compileNewReleaseCandidateEligibility(
  candidateMapTrace: BlueprintPropertyReferenceTraceArtifact,
  callTargetTrace: BlueprintCallTargetTraceArtifact,
  candidateMapIdentity: NewReleaseArtifactIdentity<"blueprint-property-reference-trace">,
): NewReleaseMechanics["candidateEligibility"] {
  assertCandidateMapScope(candidateMapTrace);
  assertCallTargetBinding(callTargetTrace, candidateMapIdentity);

  const rebuild = findTraceFunction(candidateMapTrace.functions, rebuildFunctionName);
  const filter = findTraceFunction(candidateMapTrace.functions, filterFunctionName);
  assertRebuildFlow(rebuild);
  assertFilterFlow(filter);
  assertPredicateFlow(callTargetTrace.binding.function);

  return {
    rebuild: {
      trigger: "filter-all-new-release-movie-data",
      requiresWeatherReference: true,
      sourceCollection,
      candidateCollection,
      candidateCollectionClearedBeforeScan: true,
      iteration: "source-map-values",
    },
    preconditions: {
      released: true,
      secondHandAvailable: false,
      operator: "and",
    },
    predicate: {
      function: predicateFunctionName,
      ownerClass: "ExampleRecord_C",
      durationDays: 7,
      elapsedDays: "days-passed-minus-available-in-game-day",
      comparison: "elapsed-days-less-than-or-equal-to-duration",
      lowerBoundEnforced: false,
      remainingDays: "available-in-game-day-plus-duration-minus-days-passed",
      gameModeCastFailure: {
        isNew: false,
        remainingDays: 0,
      },
    },
    outcomes: {
      eligible: {
        collection: candidateCollection,
        key: "product-sku",
        secondHandAvailable: false,
        basePrice: 0,
      },
      preconditionFailure: {
        collection: sourceCollection,
        effect: "no-mutation",
      },
      predicateFailure: {
        collection: sourceCollection,
        key: "product-sku",
        secondHandAvailable: true,
        basePrice: 0,
      },
      remainingDaysConsumedByCaller: false,
    },
    evidence: {
      kind: "kismet-analysis",
      confidence: "direct",
      marketClassPath,
      rebuildFunction: rebuildFunctionName,
      filterFunction: filterFunctionName,
      predicateClassPath,
      predicateFunction: predicateFunctionName,
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
  };
}

function assertCandidateMapScope(trace: BlueprintPropertyReferenceTraceArtifact): void {
  if (
    trace.blueprintPropertyReferences.targetPropertyName !== candidateCollection ||
    trace.selectionRule !== "explicit-functions-with-read-references" ||
    trace.requestedFunctionPaths.length !== 2 ||
    !trace.requestedFunctionPaths.includes(rebuildFunctionPath) ||
    !trace.requestedFunctionPaths.includes(filterFunctionPath) ||
    trace.functions.length !== 2
  ) {
    throw new Error("Candidate-map trace scope changed.");
  }
}

function assertCallTargetBinding(
  trace: BlueprintCallTargetTraceArtifact,
  candidateMapIdentity: NewReleaseArtifactIdentity<"blueprint-property-reference-trace">,
): void {
  if (
    trace.sourceTrace.fileName !== candidateMapIdentity.fileName ||
    trace.sourceTrace.sha256 !== candidateMapIdentity.sha256 ||
    trace.sourceTrace.sizeBytes !== candidateMapIdentity.sizeBytes ||
    trace.sourceTrace.artifactType !== candidateMapIdentity.artifactType ||
    trace.sourceTrace.targetPropertyName !== candidateCollection
  ) {
    throw new Error("Call-target trace is not bound to the candidate-map trace.");
  }

  if (
    trace.recordedCall.callerFunctionPath !== filterFunctionPath ||
    trace.recordedCall.statementIndex !== 152 ||
    trace.recordedCall.opcode !== "EX_LocalVirtualFunction" ||
    trace.recordedCall.call.callKind !== "local-virtual" ||
    trace.recordedCall.call.functionName !== predicateFunctionName ||
    trace.recordedCall.call.argumentCount !== 4 ||
    trace.recordedCall.call.integerArguments.length !== 0
  ) {
    throw new Error("Candidate predicate call binding changed.");
  }

  const { binding } = trace;
  if (
    binding.bindingRule !== "exact-context-object-class-and-declaration" ||
    !("contextStatementIndex" in binding.receiver)
  ) {
    throw new Error("Candidate predicate target identity changed.");
  }

  const { receiver } = binding;
  const parameterNames = binding.declaration.signature.parameters.map(
    (parameter) => parameter.name,
  );
  if (
    binding.relationship !== "verified" ||
    !binding.receiverClassMatchesDeclarationOwner ||
    !binding.argumentCountMatchesParameterCount ||
    receiver.contextStatementIndex !== 130 ||
    receiver.receiverStatementIndex !== 131 ||
    receiver.objectName !== "Default__ExampleRecord_C" ||
    receiver.classPath !== predicateClassPath ||
    receiver.exportType !== "ExampleRecord_C" ||
    binding.declaration.packageExportIndex !== 14 ||
    binding.declaration.objectPath !== predicateFunctionPath ||
    binding.declaration.ownerPath !== predicateClassPath ||
    binding.declaration.signature.parameterCount !== 4 ||
    JSON.stringify(parameterNames) !==
      JSON.stringify(["Example Product Struct", "__WorldContext", "is New", "is New Day Left"]) ||
    binding.function.classPath !== predicateClassPath ||
    binding.function.functionPath !== predicateFunctionPath ||
    binding.function.functionName !== predicateFunctionName
  ) {
    throw new Error("Candidate predicate target identity changed.");
  }
}

function assertRebuildFlow(
  function_: BlueprintPropertyReferenceTraceArtifact["functions"][number],
): void {
  if (function_.classPath !== marketClassPath || function_.functionPath !== rebuildFunctionPath) {
    throw new Error("Candidate rebuild function identity changed.");
  }
  assertTraceNodeTree(function_);

  assertTraceJump(function_, 0, "push-flow", "pushingAddress", 519);
  const weatherValid = findTraceCall(function_, 15, "IsValid", "final", 1);
  assertTraceSymbolChild(weatherValid, function_, "Parameters[0]", "Weather ref");
  const validityBranch = assertTraceJump(function_, 34, "pop-flow-if-false");
  assertTraceSymbolChild(
    validityBranch,
    function_,
    "BooleanExpression",
    "ExampleSymbol_9858083e331f",
  );

  const clearContext = findTraceNode(function_, 44);
  const clear = findTraceCall(function_, 66, "Map_Clear", "final", 1);
  assertChildNode(clearContext, clear, "ContextExpression");
  assertTraceSymbolChild(clear, function_, "Parameters[0]", candidateCollection);

  const values = findTraceCall(function_, 118, "Map_Values", "final", 2);
  assertTraceSymbolChild(values, function_, "Parameters[0]", sourceCollection);
  assertTraceSymbolChild(values, function_, "Parameters[1]", sourceValuesSymbol);

  assertLiteralAssignment(
    function_,
    146,
    "EX_Let",
    loopCounterSymbol,
    "integer",
    "0",
  );
  assertLiteralAssignment(
    function_,
    169,
    "EX_Let",
    arrayIndexSymbol,
    "integer",
    "0",
  );

  const lengthAssignment = findTraceNode(function_, 192);
  assertTraceRootNode(function_, 192, "EX_Let");
  assertTraceSymbolChild(lengthAssignment, function_, "Variable", arrayLengthSymbol);
  const lengthContext = assertContextNodeChild(
    lengthAssignment,
    function_,
    "Assignment",
    210,
    "EX_Context",
    arrayLengthSymbol,
  );
  const length = findTraceCall(function_, 232, "Array_Length", "final", 1);
  assertChildNode(lengthContext, length, "ContextExpression");
  assertTraceSymbolChild(length, function_, "Parameters[0]", sourceValuesSymbol);

  const loopConditionAssignment = findTraceNode(function_, 251);
  assertTraceRootNode(function_, 251, "EX_LetBool");
  assertTraceSymbolChild(
    loopConditionAssignment,
    function_,
    "Variable",
    loopConditionSymbol,
  );
  const loopCondition = findTraceCall(function_, 261, "Less_IntInt", "final", 2);
  assertChildNode(loopConditionAssignment, loopCondition, "Assignment");
  assertTraceSymbolChild(loopCondition, function_, "Parameters[0]", loopCounterSymbol);
  assertTraceSymbolChild(loopCondition, function_, "Parameters[1]", arrayLengthSymbol);
  const loopBranch = assertTraceJump(function_, 289, "pop-flow-if-false");
  assertTraceSymbolChild(loopBranch, function_, "BooleanExpression", loopConditionSymbol);

  assertVariableAssignment(
    function_,
    299,
    "EX_Let",
    arrayIndexSymbol,
    loopCounterSymbol,
  );
  assertTraceJump(function_, 326, "push-flow", "pushingAddress", 445);
  const item = findTraceCall(function_, 353, "Array_Get", "final", 3);
  assertTraceSymbolChild(item, function_, "Parameters[0]", sourceValuesSymbol);
  assertTraceSymbolChild(item, function_, "Parameters[1]", arrayIndexSymbol);
  assertTraceSymbolChild(item, function_, "Parameters[2]", selectedFilmSymbol);
  const filter = findTraceCall(function_, 390, filterFunctionName, "local-virtual", 2);
  assertTraceSymbolChild(filter, function_, "Parameters[1]", selectedFilmSymbol);
  const dateContext = findTraceNode(function_, 403);
  assertChildNode(filter, dateContext, "Parameters[0]");
  assertTraceSymbolChild(dateContext, function_, "ObjectExpression", "Weather ref");
  assertTraceSymbolChild(dateContext, function_, "ContextExpression", "ExampleCurrentPeriod");

  assertTraceJump(function_, 444, "pop-flow");
  const incrementAssignment = findTraceNode(function_, 445);
  assertTraceRootNode(function_, 445, "EX_Let");
  assertTraceSymbolChild(
    incrementAssignment,
    function_,
    "Variable",
    incrementedCounterSymbol,
  );
  const increment = findTraceCall(function_, 463, "Add_IntInt", "final", 2);
  assertChildNode(incrementAssignment, increment, "Assignment");
  assertTraceSymbolChild(increment, function_, "Parameters[0]", loopCounterSymbol);
  assertTraceLiteralChild(increment, function_, "Parameters[1]", "integer", "1");
  assertVariableAssignment(
    function_,
    487,
    "EX_Let",
    loopCounterSymbol,
    incrementedCounterSymbol,
  );
  assertTraceJump(function_, 514, "unconditional", "codeOffset", 192);
  assertTraceRootNode(function_, 519, "EX_Return");
}

function assertFilterFlow(
  function_: BlueprintPropertyReferenceTraceArtifact["functions"][number],
): void {
  if (function_.classPath !== marketClassPath || function_.functionPath !== filterFunctionPath) {
    throw new Error("Candidate filter function identity changed.");
  }
  assertTraceNodeTree(function_);

  const secondHand = findTraceCall(function_, 10, "EqualEqual_BoolBool", "final", 2);
  assertContextSymbolChild(
    secondHand,
    function_,
    "Parameters[0]",
    19,
    "EX_StructMemberContext",
    secondHandSymbol,
  );
  assertTraceLiteralChild(secondHand, function_, "Parameters[1]", "boolean", "false");
  const released = findTraceCall(function_, 49, "EqualEqual_BoolBool", "final", 2);
  assertContextSymbolChild(
    released,
    function_,
    "Parameters[0]",
    58,
    "EX_StructMemberContext",
    releasedSymbol,
  );
  assertTraceLiteralChild(released, function_, "Parameters[1]", "boolean", "true");
  const combined = findTraceCall(function_, 88, "BooleanAND", "final", 2);
  assertTraceSymbolChild(
    combined,
    function_,
    "Parameters[0]",
    "ExampleSymbol_d2ee12acae76",
  );
  assertTraceSymbolChild(
    combined,
    function_,
    "Parameters[1]",
    "ExampleSymbol_a0a6ec447959",
  );
  const preconditionBranch = assertTraceJump(
    function_,
    116,
    "conditional-false",
    "codeOffset",
    770,
  );
  assertTraceSymbolChild(
    preconditionBranch,
    function_,
    "BooleanExpression",
    "ExampleSymbol_69ac0269c2d9",
  );

  const predicate = findTraceCall(
    function_,
    152,
    predicateFunctionName,
    "local-virtual",
    4,
  );
  const predicateProduct = assertContextSymbolChild(
    predicate,
    function_,
    "Parameters[0]",
    165,
    "EX_StructMemberContext",
    productSymbol,
  );
  assertVariableNodeChild(
    predicateProduct,
    function_,
    "StructExpression",
    174,
    inputFilmSymbol,
  );
  assertTraceSymbolChild(predicate, function_, "Parameters[2]", predicateOutputSymbol);
  assertTraceSymbolChild(
    predicate,
    function_,
    "Parameters[3]",
    predicateRemainingDaysSymbol,
  );
  const predicateBranch = assertTraceJump(
    function_,
    203,
    "conditional-false",
    "codeOffset",
    496,
  );
  assertTraceSymbolChild(
    predicateBranch,
    function_,
    "BooleanExpression",
    predicateOutputSymbol,
  );

  assertStructMemberCopy(
    function_,
    217,
    226,
    235,
    244,
    253,
    productSymbol,
    eligibleFilmSymbol,
  );
  const eligibleSecondHand = assertContextLiteralAssignment(
    function_,
    299,
    "EX_LetBool",
    300,
    secondHandSymbol,
    "boolean",
    "false",
  );
  assertVariableNodeChild(
    eligibleSecondHand,
    function_,
    "StructExpression",
    309,
    eligibleFilmSymbol,
  );
  const eligibleBasePrice = assertContextLiteralAssignment(
    function_,
    364,
    "EX_Let",
    373,
    basePriceSymbol,
    "integer",
    "0",
  );
  assertVariableNodeChild(
    eligibleBasePrice,
    function_,
    "StructExpression",
    382,
    eligibleFilmSymbol,
  );
  const addEligible = findTraceCall(function_, 418, "Map_Add", "final", 3);
  assertTraceSymbolChild(addEligible, function_, "Parameters[0]", candidateCollection);
  assertProductSkuKey(function_, addEligible, [436, 445, 454, 463, 472]);
  assertVariableNodeChild(
    addEligible,
    function_,
    "Parameters[2]",
    481,
    eligibleFilmSymbol,
  );
  assertTraceJump(function_, 491, "unconditional", "codeOffset", 770);

  assertStructMemberCopy(
    function_,
    496,
    505,
    514,
    523,
    532,
    productSymbol,
    ineligibleFilmSymbol,
  );
  const ineligibleSecondHand = assertContextLiteralAssignment(
    function_,
    578,
    "EX_LetBool",
    579,
    secondHandSymbol,
    "boolean",
    "true",
  );
  assertVariableNodeChild(
    ineligibleSecondHand,
    function_,
    "StructExpression",
    588,
    ineligibleFilmSymbol,
  );
  const ineligibleBasePrice = assertContextLiteralAssignment(
    function_,
    643,
    "EX_Let",
    652,
    basePriceSymbol,
    "integer",
    "0",
  );
  assertVariableNodeChild(
    ineligibleBasePrice,
    function_,
    "StructExpression",
    661,
    ineligibleFilmSymbol,
  );
  const addIneligible = findTraceCall(function_, 697, "Map_Add", "final", 3);
  assertTraceSymbolChild(addIneligible, function_, "Parameters[0]", sourceCollection);
  assertProductSkuKey(function_, addIneligible, [715, 724, 733, 742, 751]);
  assertVariableNodeChild(
    addIneligible,
    function_,
    "Parameters[2]",
    760,
    ineligibleFilmSymbol,
  );

  const remainingDayUses = function_.nodes.filter(
    (node) => node.symbol === predicateRemainingDaysSymbol,
  );
  if (remainingDayUses.length !== 1 || remainingDayUses[0]?.statementIndex !== 193) {
    throw new Error("Candidate predicate remaining-days output usage changed.");
  }
}

function assertPredicateFlow(
  function_: BlueprintCallTargetTraceArtifact["binding"]["function"],
): void {
  assertTraceNodeTree(function_);
  assertLiteralAssignment(function_, 0, "EX_Let", durationSymbol, "integer", "7");

  const gameMode = findTraceCall(function_, 33, "GetGameMode", "final", 1);
  assertTraceSymbolChild(gameMode, function_, "Parameters[0]", "__WorldContext");
  const castBranch = assertTraceJump(
    function_,
    117,
    "conditional-false",
    "codeOffset",
    1889,
  );
  assertTraceSymbolChild(
    castBranch,
    function_,
    "BooleanExpression",
    "ExampleSymbol_cfba3a7c5b90",
  );

  const elapsed = findTraceCall(function_, 1512, "Subtract_IntInt", "final", 2);
  assertContextSymbolChild(
    elapsed,
    function_,
    "Parameters[0]",
    1521,
    "EX_Context",
    "Example Period Count",
  );
  assertContextSymbolChild(
    elapsed,
    function_,
    "Parameters[1]",
    1596,
    "EX_StructMemberContext",
    availableDaySymbol,
  );
  const compare = findTraceCall(function_, 1634, "LessEqual_IntInt", "final", 2);
  assertTraceSymbolChild(compare, function_, "Parameters[0]", elapsedSymbol);
  assertTraceSymbolChild(compare, function_, "Parameters[1]", durationSymbol);
  const addDuration = findTraceCall(function_, 1680, "Add_IntInt", "final", 2);
  assertContextSymbolChild(
    addDuration,
    function_,
    "Parameters[0]",
    1689,
    "EX_StructMemberContext",
    availableDaySymbol,
  );
  assertTraceSymbolChild(addDuration, function_, "Parameters[1]", durationSymbol);
  const remaining = findTraceCall(function_, 1744, "Subtract_IntInt", "final", 2);
  assertTraceSymbolChild(
    remaining,
    function_,
    "Parameters[0]",
    availablePlusDurationSymbol,
  );
  assertContextSymbolChild(
    remaining,
    function_,
    "Parameters[1]",
    1762,
    "EX_Context",
    "Example Period Count",
  );

  assertVariableAssignment(function_, 1838, "EX_LetBool", "is New", isNewSymbol);
  assertVariableAssignment(
    function_,
    1857,
    "EX_Let",
    "is New Day Left",
    remainingDaysSymbol,
  );
  assertTraceJump(function_, 1884, "unconditional", "codeOffset", 1923);
  assertLiteralAssignment(function_, 1889, "EX_LetBool", "is New", "boolean", "false");
  assertLiteralAssignment(
    function_,
    1900,
    "EX_Let",
    "is New Day Left",
    "integer",
    "0",
  );

  const branches = function_.nodes.filter((node) => node.jump !== null);
  const comparisons = function_.nodes.filter(
    (node) =>
      node.call !== null &&
      /^(?:Greater|GreaterEqual|Less|LessEqual|EqualEqual|NotEqual)_IntInt$/u.test(
        node.call.functionName,
      ),
  );
  if (
    branches.length !== 2 ||
    comparisons.length !== 1 ||
    comparisons[0]?.statementIndex !== 1634
  ) {
    throw new Error("Candidate predicate comparison or lower-bound behavior changed.");
  }
}

function assertProductSkuKey(
  function_: BlueprintPropertyReferenceTraceArtifact["functions"][number],
  mapAdd: ReturnType<typeof findTraceCall>,
  statementIndexes: readonly [number, number, number, number, number],
): void {
  const [skuIndex, boxDataIndex, baseStructureIndex, productIndex, inputIndex] =
    statementIndexes;
  const sku = assertContextNodeChild(
    mapAdd,
    function_,
    "Parameters[1]",
    skuIndex,
    "EX_StructMemberContext",
    productSkuSymbol,
  );
  const boxData = assertContextNodeChild(
    sku,
    function_,
    "StructExpression",
    boxDataIndex,
    "EX_StructMemberContext",
    productBoxDataSymbol,
  );
  const baseStructure = assertContextNodeChild(
    boxData,
    function_,
    "StructExpression",
    baseStructureIndex,
    "EX_StructMemberContext",
    productBaseStructureSymbol,
  );
  const product = assertContextNodeChild(
    baseStructure,
    function_,
    "StructExpression",
    productIndex,
    "EX_StructMemberContext",
    productSymbol,
  );
  assertVariableNodeChild(
    product,
    function_,
    "StructExpression",
    inputIndex,
    inputFilmSymbol,
  );
}

function assertContextSymbolChild(
  parent: ReturnType<typeof findTraceNode>,
  function_: BlueprintCallTargetTraceArtifact["binding"]["function"] |
    BlueprintPropertyReferenceTraceArtifact["functions"][number],
  edge: string,
  statementIndex: number,
  opcode: string,
  symbol: string,
): ReturnType<typeof findTraceNode> {
  return assertContextNodeChild(
    parent,
    function_,
    edge,
    statementIndex,
    opcode,
    symbol,
  );
}

function assertContextNodeChild(
  parent: ReturnType<typeof findTraceNode>,
  function_: BlueprintCallTargetTraceArtifact["binding"]["function"] |
    BlueprintPropertyReferenceTraceArtifact["functions"][number],
  edge: string,
  statementIndex: number,
  opcode: string,
  symbol: string,
): ReturnType<typeof findTraceNode> {
  const child = findTraceNode(function_, statementIndex);
  assertChildNode(parent, child, edge);
  if (child.kind !== "context" || child.opcode !== opcode || child.symbol !== symbol) {
    throw new Error(
      `Candidate trace context changed for ${edge} at statement ${parent.statementIndex}.`,
    );
  }
  return child;
}

function assertVariableNodeChild(
  parent: ReturnType<typeof findTraceNode>,
  function_: BlueprintCallTargetTraceArtifact["binding"]["function"] |
    BlueprintPropertyReferenceTraceArtifact["functions"][number],
  edge: string,
  statementIndex: number,
  symbol: string,
): ReturnType<typeof findTraceNode> {
  const child = findTraceNode(function_, statementIndex);
  assertChildNode(parent, child, edge);
  if (child.kind !== "variable" || child.symbol !== symbol) {
    throw new Error(
      `Candidate trace variable changed for ${edge} at statement ${parent.statementIndex}.`,
    );
  }
  return child;
}

function assertLiteralAssignment(
  function_: BlueprintCallTargetTraceArtifact["binding"]["function"] |
    BlueprintPropertyReferenceTraceArtifact["functions"][number],
  statementIndex: number,
  opcode: string,
  symbol: string,
  literalType: "boolean" | "integer",
  value: string,
): void {
  const assignment = findTraceNode(function_, statementIndex);
  assertTraceRootNode(function_, statementIndex, opcode);
  if (assignment.kind !== "assignment") {
    throw new Error(`Candidate assignment changed at statement ${statementIndex}.`);
  }
  assertTraceSymbolChild(assignment, function_, "Variable", symbol);
  assertTraceLiteralChild(assignment, function_, "Assignment", literalType, value);
}

function assertContextLiteralAssignment(
  function_: BlueprintPropertyReferenceTraceArtifact["functions"][number],
  statementIndex: number,
  opcode: string,
  targetStatementIndex: number,
  symbol: string,
  literalType: "boolean" | "integer",
  value: string,
): ReturnType<typeof findTraceNode> {
  const assignment = findTraceNode(function_, statementIndex);
  assertTraceRootNode(function_, statementIndex, opcode);
  if (assignment.kind !== "assignment") {
    throw new Error(`Candidate assignment changed at statement ${statementIndex}.`);
  }
  const target = assertContextSymbolChild(
    assignment,
    function_,
    "Variable",
    targetStatementIndex,
    "EX_StructMemberContext",
    symbol,
  );
  assertTraceLiteralChild(assignment, function_, "Assignment", literalType, value);
  return target;
}

function assertStructMemberCopy(
  function_: BlueprintPropertyReferenceTraceArtifact["functions"][number],
  assignmentStatementIndex: number,
  targetMemberStatementIndex: number,
  targetStructStatementIndex: number,
  sourceMemberStatementIndex: number,
  sourceStructStatementIndex: number,
  memberSymbol: string,
  targetStructSymbol: string,
): void {
  const assignment = findTraceNode(function_, assignmentStatementIndex);
  assertTraceRootNode(function_, assignmentStatementIndex, "EX_Let");
  if (assignment.kind !== "assignment") {
    throw new Error(
      `Candidate assignment changed at statement ${assignmentStatementIndex}.`,
    );
  }
  const target = assertContextNodeChild(
    assignment,
    function_,
    "Variable",
    targetMemberStatementIndex,
    "EX_StructMemberContext",
    memberSymbol,
  );
  assertVariableNodeChild(
    target,
    function_,
    "StructExpression",
    targetStructStatementIndex,
    targetStructSymbol,
  );
  const source = assertContextNodeChild(
    assignment,
    function_,
    "Assignment",
    sourceMemberStatementIndex,
    "EX_StructMemberContext",
    memberSymbol,
  );
  assertVariableNodeChild(
    source,
    function_,
    "StructExpression",
    sourceStructStatementIndex,
    inputFilmSymbol,
  );
}

function assertVariableAssignment(
  function_: BlueprintCallTargetTraceArtifact["binding"]["function"] |
    BlueprintPropertyReferenceTraceArtifact["functions"][number],
  statementIndex: number,
  opcode: string,
  targetSymbol: string,
  sourceSymbol: string,
): void {
  const assignment = findTraceNode(function_, statementIndex);
  assertTraceRootNode(function_, statementIndex, opcode);
  if (assignment.kind !== "assignment") {
    throw new Error(`Candidate assignment changed at statement ${statementIndex}.`);
  }
  assertTraceSymbolChild(assignment, function_, "Variable", targetSymbol);
  assertTraceSymbolChild(assignment, function_, "Assignment", sourceSymbol);
}

function assertChildNode(
  parent: ReturnType<typeof findTraceNode>,
  child: ReturnType<typeof findTraceNode>,
  edge: string,
): void {
  if (child.parentNodeIndex !== parent.nodeIndex || child.edge !== edge) {
    throw new Error(
      `Candidate trace operation changed for ${edge} at statement ${parent.statementIndex}.`,
    );
  }
}
