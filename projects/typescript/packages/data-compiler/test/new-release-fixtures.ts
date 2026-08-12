import type {
  NewReleaseArtifactIdentity,
} from "@neonretrorewind/core";

import type {
  BlueprintCallTargetTraceArtifact,
  BlueprintFunctionTraceArtifact,
  BlueprintPropertyReferenceTraceArtifact,
  BlueprintTraceFunctionInput,
  BlueprintTraceNodeInput,
  UnlockableManagerTraceArtifact,
} from "../src/blueprint-trace-inputs.ts";
import type { NewReleaseSources } from "../src/new-release-mechanics.ts";
import { createBuild, createMappings, type Mutable } from "./rental-fixtures.ts";

export const unlockClassPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C";
export const unlockEventGraph = "ExecuteExampleGraph_ExampleUnlockSystem";
const unlockFunctionPath = `${unlockClassPath}:${unlockEventGraph}`;
const marketClassPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C";
const rebuildFunctionName = "ExampleRebuildCandidates";
const filterFunctionName = "Filter Example Schedule";

export const newReleaseSources: NewReleaseSources = {
  managerTrace: identity("unlockable-manager-trace.json", "unlockable-manager-trace", "a"),
  wrapperTrace: identity(
    "blueprint-function-trace.unlock-manager-entry.json",
    "blueprint-function-trace",
    "b",
  ),
  propertyReaderTrace: identity(
    "blueprint-property-reference-trace.new-release-unlock.json",
    "blueprint-property-reference-trace",
    "c",
  ),
  requestGeneratorTrace: identity(
    "blueprint-function-trace.generate-movie-request.json",
    "blueprint-function-trace",
    "d",
  ),
  marketEntryTrace: identity(
    "blueprint-function-trace.execute-ubergraph-market-entrypoints.json",
    "blueprint-function-trace",
    "e",
  ),
  sourceMapTrace: identity(
    "blueprint-property-reference-trace.new-release-source-flow.json",
    "blueprint-property-reference-trace",
    "f",
  ),
  candidateMapTrace: identity(
    "blueprint-property-reference-trace.new-release-candidates.v2.json",
    "blueprint-property-reference-trace",
    "1",
  ),
  callTargetTrace: identity(
    "blueprint-call-target-trace.return-if-film-is-new.json",
    "blueprint-call-target-trace",
    "2",
  ),
};

export function createManagerTrace(): Mutable<UnlockableManagerTraceArtifact> {
  const nodes: Mutable<BlueprintTraceNodeInput>[] = [];
  const root = (statementIndex: number, opcode: string, kind: BlueprintTraceNodeInput["kind"], symbol: string | null = null) =>
    addNode(nodes, null, `script[${nodes.filter((node) => node.parentNodeIndex === null).length}]`, statementIndex, opcode, kind, symbol);
  const child = (parent: Mutable<BlueprintTraceNodeInput>, edge: string, statementIndex: number, opcode: string, kind: BlueprintTraceNodeInput["kind"], symbol: string | null = null) =>
    addNode(nodes, parent, edge, statementIndex, opcode, kind, symbol);

  const setUnlocked = root(3352, "EX_LetBool", "assignment");
  child(setUnlocked, "Variable", 3353, "EX_InstanceVariable", "variable", "ExampleReleaseKind");
  const enabled = child(setUnlocked, "Assignment", 3362, "EX_True", "literal");
  enabled.literal = { literalType: "boolean", value: "true" };

  const resetCall = root(3364, "EX_LocalVirtualFunction", "call");
  resetCall.call = call("local-virtual", "ExampleReleaseEnabled", 0, []);

  const firstSaveContext = root(3379, "EX_Context", "context", "None");
  child(firstSaveContext, "ObjectExpression", 3380, "EX_InstanceVariable", "variable", "Weather Actor");
  const firstSave = child(firstSaveContext, "ContextExpression", 3401, "EX_LocalVirtualFunction", "call");
  firstSave.call = call("local-virtual", "Start SaveGame Day", 1, []);
  child(firstSave, "Parameters[0]", 3414, "EX_LocalVariable", "variable", "ExampleSymbol_497dff3a47e2");

  const timespanAssignment = root(3424, "EX_Let", "assignment", "ExampleSymbol_7e5e1037058b");
  child(timespanAssignment, "Variable", 3433, "EX_LocalVariable", "variable", "ExampleSymbol_7e5e1037058b");
  const makeTimespan = child(timespanAssignment, "Assignment", 3442, "EX_CallMath", "call");
  makeTimespan.call = call("final", "MakeTimespan", 5, ["2", "0", "0", "0", "0"]);
  for (const [position, value] of ["2", "0", "0", "0", "0"].entries()) {
    const literal = child(makeTimespan, `Parameters[${position}]`, 3451 + position * 5, "EX_IntConst", "literal");
    literal.literal = { literalType: "integer", value };
  }

  const thresholdAssignment = root(3477, "EX_Let", "assignment", "ExampleSymbol_2366b926ff88");
  child(thresholdAssignment, "Variable", 3486, "EX_LocalVariable", "variable", "ExampleSymbol_2366b926ff88");
  const addThreshold = child(thresholdAssignment, "Assignment", 3495, "EX_CallMath", "call");
  addThreshold.call = call("final", "Add_DateTimeTimespan", 2, []);
  child(addThreshold, "Parameters[0]", 3504, "EX_LocalVariable", "variable", "ExampleSymbol_497dff3a47e2");
  child(addThreshold, "Parameters[1]", 3513, "EX_LocalVariable", "variable", "ExampleSymbol_7e5e1037058b");

  const comparisonAssignment = root(3523, "EX_LetBool", "assignment");
  child(comparisonAssignment, "Variable", 3524, "EX_LocalVariable", "variable", "ExampleSymbol_82f85d9f0f2f");
  const compare = child(comparisonAssignment, "Assignment", 3533, "EX_CallMath", "call");
  compare.call = call("final", "GreaterEqual_DateTimeDateTime", 2, []);
  const currentDate = child(compare, "Parameters[0]", 3542, "EX_Context", "context", "ExampleCurrentPeriod");
  child(currentDate, "ObjectExpression", 3543, "EX_InstanceVariable", "variable", "Weather Actor");
  child(currentDate, "ContextExpression", 3564, "EX_InstanceVariable", "variable", "ExampleCurrentPeriod");
  child(compare, "Parameters[1]", 3573, "EX_LocalVariable", "variable", "ExampleSymbol_2366b926ff88");

  const condition = root(3583, "EX_PopExecutionFlowIfNot", "branch");
  condition.jump = { jumpKind: "pop-flow-if-false", targets: [] };
  child(condition, "BooleanExpression", 3584, "EX_LocalVariable", "variable", "ExampleSymbol_82f85d9f0f2f");
  const successJump = root(3593, "EX_Jump", "branch");
  successJump.jump = {
    jumpKind: "unconditional",
    targets: [{ edge: "codeOffset", offset: 3352 }],
  };

  const function_: Mutable<BlueprintTraceFunctionInput> = {
    packagePath: "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.uasset",
    className: "ExampleUnlockSystem_C",
    classPath: unlockClassPath,
    functionName: unlockEventGraph,
    functionPath: unlockFunctionPath,
    flags: "FUNC_Final, FUNC_UbergraphFunction, FUNC_HasDefaults",
    bytecodeExpressionCount: 136,
    nodes,
  };
  return {
    artifactType: "unlockable-manager-trace",
    build: createBuild(),
    unlockableImplementationSites: {
      fileName: "unlockable-implementation-sites.json",
      sizeBytes: 100,
      sha256: "e".repeat(64),
    },
    requestedFunctionPaths: [unlockFunctionPath],
    mappings: createMappings(),
    engine: engine(),
    extractor: extractor(),
    totals: totals([function_], 0),
    functions: [function_],
  };
}

export function createWrapperTrace(): Mutable<BlueprintFunctionTraceArtifact> {
  const functions = [
    wrapper("ExampleReleaseEnabled", 3379),
    wrapper("ExampleLoad", 2367, true),
    wrapper("ReceiveBeginPlay", 3333),
    wrapper("Reset to new Day Event_Event", 3364, true),
    wrapper("Save", 2940),
  ];
  return {
    artifactType: "blueprint-function-trace",
    build: createBuild(),
    callerBodies: [{
      fileName: "blueprint-caller-bodies.unlock-manager-entry.json",
      sizeBytes: 100,
      sha256: "f".repeat(64),
      targetFunctionName: unlockEventGraph,
    }],
    mappings: createMappings(),
    engine: engine(),
    extractor: extractor(),
    totals: totals(functions, 5),
    functions,
  };
}

export function createPropertyReaderTrace(): Mutable<BlueprintPropertyReferenceTraceArtifact> {
  const nodes: Mutable<BlueprintTraceNodeInput>[] = [];
  const root = (
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol: string | null = null,
  ) => addNode(
    nodes,
    null,
    `script[${nodes.filter((node) => node.parentNodeIndex === null).length}]`,
    statementIndex,
    opcode,
    kind,
    symbol,
  );
  const child = (
    parent: Mutable<BlueprintTraceNodeInput>,
    edge: string,
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol: string | null = null,
  ) => addNode(nodes, parent, edge, statementIndex, opcode, kind, symbol);

  const stepComparisonAssignment = root(2098, "EX_LetBool", "assignment");
  child(
    stepComparisonAssignment,
    "Variable",
    2099,
    "EX_LocalVariable",
    "variable",
    "ExampleSymbol_4c35bb67638e",
  );
  const stepComparison = child(
    stepComparisonAssignment,
    "Assignment",
    2108,
    "EX_CallMath",
    "call",
  );
  stepComparison.call = {
    callKind: "final",
    functionName: "NotEqual_IntInt",
    argumentCount: 2,
    integerArguments: [{ position: 1, value: "1" }],
  };
  child(
    stepComparison,
    "Parameters[0]",
    2117,
    "EX_LocalVariable",
    "variable",
    "lGarantee Requested Step",
  );
  const stepLiteral = child(
    stepComparison,
    "Parameters[1]",
    2126,
    "EX_IntConst",
    "literal",
  );
  stepLiteral.literal = { literalType: "integer", value: "1" };
  const stepRoute = root(2132, "EX_JumpIfNot", "branch");
  stepRoute.jump = {
    jumpKind: "conditional-false",
    targets: [{ edge: "codeOffset", offset: 4028 }],
  };
  child(
    stepRoute,
    "BooleanExpression",
    2137,
    "EX_LocalVariable",
    "variable",
    "ExampleSymbol_4c35bb67638e",
  );

  const randomAssignment = root(2243, "EX_LetBool", "assignment");
  child(
    randomAssignment,
    "Variable",
    2244,
    "EX_LocalVariable",
    "variable",
    "ExampleSymbol_62b6867ee210",
  );
  const randomCall = child(randomAssignment, "Assignment", 2253, "EX_CallMath", "call");
  randomCall.call = call("final", "RandomBoolWithWeight", 1, []);
  const weight = child(randomCall, "Parameters[0]", 2262, "EX_FloatConst", "literal");
  weight.literal = { literalType: "number", value: "0.5" };

  const conditionAssignment = root(2268, "EX_LetBool", "assignment");
  child(
    conditionAssignment,
    "Variable",
    2269,
    "EX_LocalVariable",
    "variable",
    "ExampleSymbol_470ab9997728",
  );
  const combine = child(conditionAssignment, "Assignment", 2278, "EX_CallMath", "call");
  combine.call = call("final", "BooleanAND", 2, []);
  const unlockContext = child(
    combine,
    "Parameters[0]",
    2287,
    "EX_Context",
    "context",
    "ExampleReleaseKind",
  );
  child(
    unlockContext,
    "ContextExpression",
    2309,
    "EX_InstanceVariable",
    "variable",
    "ExampleReleaseKind",
  );
  child(
    combine,
    "Parameters[1]",
    2318,
    "EX_LocalVariable",
    "variable",
    "ExampleSymbol_62b6867ee210",
  );
  const condition = root(2328, "EX_JumpIfNot", "branch");
  condition.jump = {
    jumpKind: "conditional-false",
    targets: [{ edge: "codeOffset", offset: 2381 }],
  };
  child(
    condition,
    "BooleanExpression",
    2333,
    "EX_LocalVariable",
    "variable",
    "ExampleSymbol_470ab9997728",
  );

  literalAssignment(root, child, 2342, "EX_Let", "lGarantee Requested Step", "integer", "1");
  literalAssignment(root, child, 2365, "EX_LetBool", "lRun Optional Pass", "boolean", "false");
  const loop = root(2376, "EX_Jump", "branch");
  loop.jump = { jumpKind: "unconditional", targets: [{ edge: "codeOffset", offset: 2040 }] };

  const onlyNewRelease = root(3358, "EX_LetBool", "assignment");
  child(
    onlyNewRelease,
    "Variable",
    3359,
    "EX_LocalOutVariable",
    "variable",
    "Only New Release",
  );
  child(
    onlyNewRelease,
    "Assignment",
    3368,
    "EX_LocalVariable",
    "variable",
    "lNew Released Requested",
  );
  const mandatoryRequest = root(3396, "EX_Let", "assignment", "Mandatory Request");
  child(
    mandatoryRequest,
    "Variable",
    3405,
    "EX_LocalOutVariable",
    "variable",
    "Mandatory Request",
  );
  child(
    mandatoryRequest,
    "Assignment",
    3414,
    "EX_InstanceVariable",
    "variable",
    "Primary Request",
  );

  literalAssignment(
    root,
    child,
    4028,
    "EX_LetBool",
    "lNew Released Requested",
    "boolean",
    "true",
  );
  literalAssignment(
    root,
    child,
    4039,
    "EX_LetBool",
    "Temp_bool_Variable_5",
    "boolean",
    "true",
  );
  literalAssignment(
    root,
    child,
    4050,
    "EX_Let",
    "Temp_byte_Variable_6",
    "integer",
    "5",
  );
  const mapContext = root(4070, "EX_Context", "context", "None");
  const mapAdd = child(mapContext, "ContextExpression", 4092, "EX_FinalFunction", "call");
  mapAdd.call = call("final", "Map_Add", 3, []);
  child(mapAdd, "Parameters[0]", 4101, "EX_InstanceVariable", "variable", "Primary Request");
  child(mapAdd, "Parameters[1]", 4110, "EX_LocalVariable", "variable", "Temp_byte_Variable_6");
  child(mapAdd, "Parameters[2]", 4119, "EX_LocalVariable", "variable", "Temp_bool_Variable_5");

  const function_: Mutable<BlueprintTraceFunctionInput> = {
    packagePath:
      "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.uasset",
    className: "BTTask_ExampleRequest_C",
    classPath:
      "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C",
    functionName: "Return Example Request",
    functionPath:
      "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C:Return Example Request",
    flags:
      "FUNC_Public, FUNC_HasOutParms, FUNC_HasDefaults, FUNC_BlueprintCallable, FUNC_BlueprintEvent",
    bytecodeExpressionCount: 200,
    nodes,
  };
  return {
    artifactType: "blueprint-property-reference-trace",
    build: createBuild(),
    blueprintPropertyReferences: {
      fileName: "blueprint-property-references.new-release-unlock.json",
      sizeBytes: 100,
      sha256: "d".repeat(64),
      targetPropertyName: "ExampleReleaseKind",
    },
    requestedFunctionPaths: [function_.functionPath],
    selectionRule: "explicit-functions-with-read-references",
    mappings: createMappings(),
    engine: engine(),
    extractor: extractor(),
    totals: totals([function_], 0),
    functions: [function_],
  };
}

export function createRequestGeneratorTrace(): Mutable<BlueprintFunctionTraceArtifact> {
  const nodes: Mutable<BlueprintTraceNodeInput>[] = [];
  const root = (
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol: string | null = null,
  ) => addNode(
    nodes,
    null,
    `script[${nodes.filter((node) => node.parentNodeIndex === null).length}]`,
    statementIndex,
    opcode,
    kind,
    symbol,
  );
  const child = (
    parent: Mutable<BlueprintTraceNodeInput>,
    edge: string,
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol: string | null = null,
  ) => addNode(nodes, parent, edge, statementIndex, opcode, kind, symbol);
  const newReleaseCandidates = "Example Candidate Map";

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
  const selector = root(448, "EX_LocalVirtualFunction", "call");
  selector.call = call("local-virtual", "Return Example Request", 12, []);
  for (const [position, symbol] of selectorOutputs.entries()) {
    child(selector, `Parameters[${position}]`, 461 + position * 9, "EX_LocalVariable", "variable", symbol);
  }
  branch(root, child, 570, "EX_JumpIfNot", "conditional-false", selectorOutputs[0], 785);
  jump(root, 584, "EX_PushExecutionFlow", "push-flow", "pushingAddress", 1272);
  variableAssignment(root, child, 735, "EX_LetBool", "Only New Release", selectorOutputs[8]);
  literalAssignment(root, child, 773, "EX_LetBool", "Request Generated", "boolean", "true");
  jump(root, 784, "EX_PopExecutionFlow", "pop-flow");
  variableAssignment(root, child, 1272, "EX_Let", "Primary Request", selectorOutputs[10]);
  variableAssignment(root, child, 1299, "EX_Let", "Optional Request", selectorOutputs[11]);

  jump(root, 1326, "EX_PushExecutionFlow", "push-flow", "pushingAddress", 2336);
  branch(root, child, 1331, "EX_PopExecutionFlowIfNot", "pop-flow-if-false", selectorOutputs[8]);
  const castAssignment = root(1362, "EX_Let", "assignment");
  child(castAssignment, "Variable", 1371, "EX_LocalVariable", "variable", "ExampleSymbol_59b9daf98844");
  branch(root, child, 1427, "EX_PopExecutionFlowIfNot", "pop-flow-if-false", "ExampleSymbol_cfba3a7c5b90");

  const randomAssignment = root(1437, "EX_LetBool", "assignment");
  child(randomAssignment, "Variable", 1438, "EX_LocalVariable", "variable", "ExampleSymbol_df2cd757b8a8");
  const randomGate = child(randomAssignment, "Assignment", 1447, "EX_CallMath", "call");
  randomGate.call = call("final", "RandomBoolWithWeight", 1, []);
  const weight = child(randomGate, "Parameters[0]", 1456, "EX_FloatConst", "literal");
  weight.literal = { literalType: "number", value: "0.66" };

  collectionCall(root, child, 1502, "Map_Length", 1, 1511, 1577, newReleaseCandidates);
  const positiveAssignment = root(1587, "EX_LetBool", "assignment");
  child(positiveAssignment, "Variable", 1588, "EX_LocalVariable", "variable", "ExampleSymbol_b752835dd3cc");
  const positive = child(positiveAssignment, "Assignment", 1597, "EX_CallMath", "call");
  positive.call = {
    ...call("final", "Greater_IntInt", 2, []),
    integerArguments: [{ position: 1, value: "0" }],
  };
  child(positive, "Parameters[0]", 1606, "EX_LocalVariable", "variable", "ExampleSymbol_a76986845fbb");
  const zero = child(positive, "Parameters[1]", 1615, "EX_IntConst", "literal");
  zero.literal = { literalType: "integer", value: "0" };

  const combinedAssignment = root(1621, "EX_LetBool", "assignment");
  child(combinedAssignment, "Variable", 1622, "EX_LocalVariable", "variable", "ExampleSymbol_69ac0269c2d9");
  const combined = child(combinedAssignment, "Assignment", 1631, "EX_CallMath", "call");
  combined.call = call("final", "BooleanAND", 2, []);
  child(combined, "Parameters[0]", 1640, "EX_LocalVariable", "variable", "ExampleSymbol_b752835dd3cc");
  child(combined, "Parameters[1]", 1649, "EX_LocalVariable", "variable", "ExampleSymbol_df2cd757b8a8");
  branch(root, child, 1659, "EX_PopExecutionFlowIfNot", "pop-flow-if-false", "ExampleSymbol_69ac0269c2d9");

  const keys = collectionCall(root, child, 1702, "Map_Keys", 2, 1711, 1777, newReleaseCandidates);
  child(keys, "Parameters[1]", 1786, "EX_LocalVariable", "variable", "ExampleSymbol_d6e3aa1b6c52");
  const values = collectionCall(root, child, 1829, "Map_Values", 2, 1838, 1904, newReleaseCandidates);
  child(values, "Parameters[1]", 1913, "EX_LocalVariable", "variable", "ExampleSymbol_5c9e16b9b19d");
  collectionCall(root, child, 1963, "Map_Length", 1, 1972, 2038, newReleaseCandidates);

  const subtractAssignment = root(2048, "EX_Let", "assignment");
  child(subtractAssignment, "Variable", 2057, "EX_LocalVariable", "variable", "ExampleSymbol_e786ddbe8538");
  const subtract = child(subtractAssignment, "Assignment", 2066, "EX_CallMath", "call");
  subtract.call = {
    ...call("final", "Subtract_IntInt", 2, []),
    integerArguments: [{ position: 1, value: "1" }],
  };
  child(subtract, "Parameters[0]", 2075, "EX_LocalVariable", "variable", "ExampleSymbol_a76986845fbb");
  const one = child(subtract, "Parameters[1]", 2084, "EX_IntConst", "literal");
  one.literal = { literalType: "integer", value: "1" };

  const randomIndexAssignment = root(2090, "EX_Let", "assignment");
  child(randomIndexAssignment, "Variable", 2099, "EX_LocalVariable", "variable", "ExampleSymbol_2570513be054");
  const randomIndex = child(randomIndexAssignment, "Assignment", 2108, "EX_CallMath", "call");
  randomIndex.call = call("final", "RandomInteger", 1, []);
  child(randomIndex, "Parameters[0]", 2117, "EX_LocalVariable", "variable", "ExampleSymbol_e786ddbe8538");
  variableAssignment(root, child, 2127, "EX_Let", "Example Selected Key", "ExampleSymbol_2570513be054");

  const selectedKey = root(2176, "EX_FinalFunction", "call");
  selectedKey.call = call("final", "Array_Get", 3, []);
  child(selectedKey, "Parameters[0]", 2185, "EX_LocalVariable", "variable", "ExampleSymbol_d6e3aa1b6c52");
  child(selectedKey, "Parameters[1]", 2194, "EX_LocalVariable", "variable", "Example Selected Key");
  child(selectedKey, "Parameters[2]", 2203, "EX_LocalVariable", "variable", "ExampleSymbol_4bb2d3edf81f");
  variableAssignment(root, child, 2213, "EX_Let", "Request Movie SKU", "ExampleSymbol_4bb2d3edf81f");
  const selectedValue = root(2262, "EX_FinalFunction", "call");
  selectedValue.call = call("final", "Array_Get", 3, []);
  child(selectedValue, "Parameters[0]", 2271, "EX_LocalVariable", "variable", "ExampleSymbol_5c9e16b9b19d");
  child(selectedValue, "Parameters[1]", 2280, "EX_LocalVariable", "variable", "Example Selected Key");
  child(selectedValue, "Parameters[2]", 2289, "EX_LocalVariable", "variable", "ExampleSymbol_38f1ea380eae");
  const reservedProduct = root(2299, "EX_Let", "assignment");
  child(reservedProduct, "Variable", 2308, "EX_InstanceVariable", "variable", "Reserved Movie Product");
  const productMember = child(reservedProduct, "Assignment", 2317, "EX_StructMemberContext", "context", "ExampleField11_0_00000000000000000000000000000000");
  child(productMember, "StructExpression", 2326, "EX_LocalVariable", "variable", "ExampleSymbol_38f1ea380eae");
  jump(root, 2335, "EX_PopExecutionFlow", "pop-flow");
  literalAssignment(root, child, 2336, "EX_LetBool", "ExampleGenerateSuccess", "boolean", "true");
  root(2347, "EX_Return", "return");

  const function_: Mutable<BlueprintTraceFunctionInput> = {
    packagePath:
      "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.uasset",
    className: "BTTask_ExampleRequest_C",
    classPath:
      "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C",
    functionName: "Generate Example Request",
    functionPath:
      "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C:Generate Example Request",
    flags:
      "FUNC_Public, FUNC_HasOutParms, FUNC_HasDefaults, FUNC_BlueprintCallable, FUNC_BlueprintEvent",
    bytecodeExpressionCount: 82,
    nodes,
  };
  return {
    artifactType: "blueprint-function-trace",
    build: createBuild(),
    callerBodies: [{
      fileName: "blueprint-caller-bodies.return-movie-request.json",
      sizeBytes: 100,
      sha256: "f".repeat(64),
      targetFunctionName: "Generate Example Request",
    }],
    mappings: createMappings(),
    engine: engine(),
    extractor: extractor(),
    totals: totals([function_], 0),
    functions: [function_],
  };
}

export function createMarketEntryTrace(): Mutable<BlueprintFunctionTraceArtifact> {
  const entries = [
    ["Bind Actors", "4334", false],
    ["ExampleCreatePeriodEvent", "2587", true],
    ["Generate Example Manager State", "2617", true],
    ["ExampleLoad", "2622", true],
    ["ReceiveBeginPlay", "2388", false],
    ["Save", "3539", false],
  ] as const;
  const functions = entries.map(([functionName, entryPoint, parameter]) =>
    marketWrapper(functionName, entryPoint, parameter)
  );
  return {
    artifactType: "blueprint-function-trace",
    build: createBuild(),
    callerBodies: [{
      fileName: "blueprint-caller-bodies.execute-ubergraph-market.json",
      sizeBytes: 100,
      sha256: "8".repeat(64),
      targetFunctionName: "ExecuteExampleGraph_ExampleManager",
    }],
    mappings: createMappings(),
    engine: engine(),
    extractor: extractor(),
    totals: totals(functions, functions.length),
    functions,
  };
}

export function createSourceMapTrace(): Mutable<BlueprintPropertyReferenceTraceArtifact> {
  const eventNodes: Mutable<BlueprintTraceNodeInput>[] = [];
  const eventRoot = fixtureRoot(eventNodes);
  const loadEntry = eventRoot(2622, "EX_PushExecutionFlow", "branch");
  loadEntry.jump = {
    jumpKind: "push-flow",
    targets: [{ edge: "pushingAddress", offset: 3307 }],
  };
  const restore = eventRoot(2886, "EX_Let", "assignment", "Example Source Map");
  addNode(eventNodes, restore, "Variable", 2895, "EX_InstanceVariable", "variable", "Example Source Map");
  const savedMap = addNode(
    eventNodes,
    restore,
    "Assignment",
    2904,
    "EX_StructMemberContext",
    "context",
    "ExampleField10_0_00000000000000000000000000000000",
  );
  const market = addNode(
    eventNodes,
    savedMap,
    "StructExpression",
    2913,
    "EX_Context",
    "context",
    "Example Manager",
  );
  addNode(eventNodes, market, "ObjectExpression", 2914, "EX_LocalVariable", "variable", "ExampleSymbol_37c2ed4f4d9d");
  addNode(eventNodes, market, "ContextExpression", 2935, "EX_InstanceVariable", "variable", "Example Manager");

  const generationNodes: Mutable<BlueprintTraceNodeInput>[] = [];
  const root = fixtureRoot(generationNodes);
  const dataTableAssignment = root(5, "EX_LetObj", "assignment");
  addNode(generationNodes, dataTableAssignment, "Variable", 6, "EX_LocalVariable", "variable", "new Release Data table");
  const dataTable = addNode(generationNodes, dataTableAssignment, "Assignment", 15, "EX_ObjectConst", "literal");
  dataTable.literal = {
    literalType: "object",
    value:
      "ExampleGame/Content/ExampleProject/core/blueprint/data/ExampleScheduleTable.ExampleScheduleTable",
  };

  const rowNames = root(535, "EX_CallMath", "call");
  rowNames.call = call("final", "GetDataTableRowNames", 2, []);
  addNode(generationNodes, rowNames, "Parameters[0]", 544, "EX_LocalVariable", "variable", "new Release Data table");
  addNode(generationNodes, rowNames, "Parameters[1]", 553, "EX_LocalVariable", "variable", "ExampleSymbol_db9f9613b85f");

  const rowLookup = root(843, "EX_FinalFunction", "call");
  rowLookup.call = call("final", "GetDataTableRowFromName", 3, []);
  const lookupTable = addNode(generationNodes, rowLookup, "Parameters[0]", 852, "EX_ObjectConst", "literal");
  lookupTable.literal = { ...dataTable.literal };
  addNode(generationNodes, rowLookup, "Parameters[1]", 861, "EX_LocalVariable", "variable", "ExampleSymbol_38f1ea380eae");
  addNode(generationNodes, rowLookup, "Parameters[2]", 870, "EX_LocalVariable", "variable", "ExampleSymbol_b0106fce9ba0");

  const genreLookup = root(930, "EX_FinalFunction", "call");
  genreLookup.call = call("final", "Array_Find", 2, []);
  const unlockedGenres = addNode(generationNodes, genreLookup, "Parameters[0]", 939, "EX_Context", "context", "Example Enabled Categories");
  addNode(generationNodes, unlockedGenres, "ContextExpression", 961, "EX_InstanceVariable", "variable", "Example Enabled Categories");
  const genre = addNode(generationNodes, genreLookup, "Parameters[1]", 970, "EX_StructMemberContext", "context", "ExampleField08_0_00000000000000000000000000000000");
  addNode(generationNodes, genre, "StructExpression", 979, "EX_LocalVariable", "variable", "ExampleSymbol_b0106fce9ba0");
  const missingGenre = root(999, "EX_CallMath", "call");
  missingGenre.call = call("final", "EqualEqual_IntInt", 2, []);
  addNode(generationNodes, missingGenre, "Parameters[0]", 1008, "EX_LocalVariable", "variable", "ExampleSymbol_0b481d5b7326");
  const minusOne = addNode(generationNodes, missingGenre, "Parameters[1]", 1017, "EX_IntConst", "literal");
  minusOne.literal = { literalType: "integer", value: "-1" };
  const genreBranch = root(1023, "EX_JumpIfNot", "branch");
  genreBranch.jump = {
    jumpKind: "conditional-false",
    targets: [{ edge: "codeOffset", offset: 3519 }],
  };
  addNode(generationNodes, genreBranch, "BooleanExpression", 1028, "EX_LocalVariable", "variable", "ExampleSymbol_df2629fe7327");
  const addUnlockPoolAssignment = root(
    3519,
    "EX_Let",
    "assignment",
    "ExampleSymbol_560edd151976",
  );
  const addUnlockPoolContext = addNode(
    generationNodes,
    addUnlockPoolAssignment,
    "Assignment",
    3537,
    "EX_Context",
    "context",
    "ExampleSymbol_560edd151976",
  );
  const addUnlockPool = addNode(
    generationNodes,
    addUnlockPoolContext,
    "ContextExpression",
    3559,
    "EX_FinalFunction",
    "call",
  );
  addUnlockPool.call = call("final", "Array_Add", 2, []);
  addNode(generationNodes, addUnlockPool, "Parameters[0]", 3568, "EX_LocalVariable", "variable", "ExampleAddCandidate");
  addNode(generationNodes, addUnlockPool, "Parameters[1]", 3577, "EX_LocalVariable", "variable", "ExampleSymbol_b0106fce9ba0");

  const randomItem = root(1241, "EX_FinalFunction", "call");
  randomItem.call = call("final", "Array_Random", 3, []);
  addNode(generationNodes, randomItem, "Parameters[0]", 1250, "EX_LocalVariable", "variable", "ExampleAddCandidate");

  const existing = root(1337, "EX_FinalFunction", "call");
  existing.call = call("final", "Map_Find", 3, []);
  addNode(generationNodes, existing, "Parameters[0]", 1346, "EX_InstanceVariable", "variable", "Example Source Map");
  const existingSku = addNode(generationNodes, existing, "Parameters[1]", 1355, "EX_StructMemberContext", "context", "ExampleField15_0_00000000000000000000000000000000");
  addNode(generationNodes, existingSku, "StructExpression", 1364, "EX_LocalVariable", "variable", "ExampleCurrentCandidate");
  const duplicateBranch = root(1383, "EX_JumpIfNot", "branch");
  duplicateBranch.jump = {
    jumpKind: "conditional-false",
    targets: [{ edge: "codeOffset", offset: 1462 }],
  };
  const removeDuplicate = root(1429, "EX_FinalFunction", "call");
  removeDuplicate.call = call("final", "Array_RemoveItem", 2, []);
  addNode(generationNodes, removeDuplicate, "Parameters[0]", 1438, "EX_LocalVariable", "variable", "ExampleAddCandidate");
  addNode(generationNodes, removeDuplicate, "Parameters[1]", 1447, "EX_LocalVariable", "variable", "ExampleCurrentCandidate");
  const retry = root(1457, "EX_Jump", "branch");
  retry.jump = {
    jumpKind: "unconditional",
    targets: [{ edge: "codeOffset", offset: 1112 }],
  };

  sourceMapAdd(generationNodes, root, 2129, 2138, 2147, 2156, 2165, "Example Source Map");
  sourceMapAdd(generationNodes, root, 2842, 2851, 2860, 2869, 2878, "Example Poster Map");

  const values = root(2978, "EX_FinalFunction", "call");
  values.call = call("final", "Map_Values", 2, []);
  addNode(generationNodes, values, "Parameters[0]", 2987, "EX_InstanceVariable", "variable", "Example Source Map");
  addNode(generationNodes, values, "Parameters[1]", 2996, "EX_LocalVariable", "variable", "ExampleSymbol_5c9e16b9b19d");
  const secondHandBranch = root(3254, "EX_PopExecutionFlowIfNot", "branch");
  secondHandBranch.jump = { jumpKind: "pop-flow-if-false", targets: [] };
  const secondHand = addNode(generationNodes, secondHandBranch, "BooleanExpression", 3255, "EX_StructMemberContext", "context", "ExampleField14_0_00000000000000000000000000000000");
  addNode(generationNodes, secondHand, "StructExpression", 3264, "EX_LocalVariable", "variable", "ExampleSymbol_4bb2d3edf81f");
  const remove = root(3364, "EX_FinalFunction", "call");
  remove.call = call("final", "Map_Remove", 2, []);
  addNode(generationNodes, remove, "Parameters[0]", 3373, "EX_InstanceVariable", "variable", "Example Source Map");
  const removalSku = addNode(generationNodes, remove, "Parameters[1]", 3382, "EX_StructMemberContext", "context", "ExampleField15_0_00000000000000000000000000000000");
  const removalBoxData = addNode(generationNodes, removalSku, "StructExpression", 3391, "EX_StructMemberContext", "context", "ExampleField03_0_00000000000000000000000000000000");
  const removalBaseStructure = addNode(generationNodes, removalBoxData, "StructExpression", 3400, "EX_StructMemberContext", "context", "ExampleField02_0_00000000000000000000000000000000");
  const removalProduct = addNode(generationNodes, removalBaseStructure, "StructExpression", 3409, "EX_StructMemberContext", "context", "ExampleField11_0_00000000000000000000000000000000");
  addNode(generationNodes, removalProduct, "StructExpression", 3418, "EX_LocalVariable", "variable", "ExampleSymbol_4bb2d3edf81f");
  const cleanupLoop = root(3498, "EX_Jump", "branch");
  cleanupLoop.jump = {
    jumpKind: "unconditional",
    targets: [{ edge: "codeOffset", offset: 3052 }],
  };

  const functions = [
    candidateFunction("ExecuteExampleGraph_ExampleManager", eventNodes),
    candidateFunction("ExampleGenerateRecord", generationNodes),
  ];
  return {
    artifactType: "blueprint-property-reference-trace",
    build: createBuild(),
    blueprintPropertyReferences: {
      fileName: "blueprint-property-references.new-release-source.json",
      sizeBytes: 100,
      sha256: "7".repeat(64),
      targetPropertyName: "Example Source Map",
    },
    requestedFunctionPaths: functions.map((function_) => function_.functionPath),
    selectionRule: "explicit-functions-with-read-references",
    mappings: createMappings(),
    engine: engine(),
    extractor: extractor(),
    totals: totals(functions, 0),
    functions,
  };
}

export function createCandidateMapTrace(): Mutable<BlueprintPropertyReferenceTraceArtifact> {
  const rebuildNodes: Mutable<BlueprintTraceNodeInput>[] = [];
  const rebuildRoot = fixtureRoot(rebuildNodes);
  const rebuildReturn = rebuildRoot(0, "EX_PushExecutionFlow", "branch");
  rebuildReturn.jump = {
    jumpKind: "push-flow",
    targets: [{ edge: "pushingAddress", offset: 519 }],
  };
  const weatherValid = rebuildRoot(15, "EX_CallMath", "call");
  weatherValid.call = call("final", "IsValid", 1, []);
  addNode(rebuildNodes, weatherValid, "Parameters[0]", 24, "EX_InstanceVariable", "variable", "Weather ref");
  const validityBranch = rebuildRoot(34, "EX_PopExecutionFlowIfNot", "branch");
  validityBranch.jump = { jumpKind: "pop-flow-if-false", targets: [] };
  addNode(rebuildNodes, validityBranch, "BooleanExpression", 35, "EX_LocalVariable", "variable", "ExampleSymbol_9858083e331f");
  const clearContext = rebuildRoot(44, "EX_Context", "context", "None");
  const clear = addNode(rebuildNodes, clearContext, "ContextExpression", 66, "EX_FinalFunction", "call");
  clear.call = call("final", "Map_Clear", 1, []);
  addNode(rebuildNodes, clear, "Parameters[0]", 75, "EX_InstanceVariable", "variable", "Example Candidate Map");
  const values = rebuildRoot(118, "EX_FinalFunction", "call");
  values.call = call("final", "Map_Values", 2, []);
  addNode(rebuildNodes, values, "Parameters[0]", 127, "EX_InstanceVariable", "variable", "Example Source Map");
  addNode(rebuildNodes, values, "Parameters[1]", 136, "EX_LocalVariable", "variable", "ExampleSymbol_5c9e16b9b19d");
  fixtureLiteralAssignment(rebuildNodes, rebuildRoot, 146, "EX_Let", "Temp_int_Loop_Counter_Variable", "integer", "0", 155, 164);
  fixtureLiteralAssignment(rebuildNodes, rebuildRoot, 169, "EX_Let", "Temp_int_Array_Index_Variable", "integer", "0", 178, 187);
  const lengthAssignment = rebuildRoot(192, "EX_Let", "assignment", "ExampleSymbol_5546bd5cfb37");
  addNode(rebuildNodes, lengthAssignment, "Variable", 201, "EX_LocalOutVariable", "variable", "ExampleSymbol_5546bd5cfb37");
  const lengthContext = addNode(rebuildNodes, lengthAssignment, "Assignment", 210, "EX_Context", "context", "ExampleSymbol_5546bd5cfb37");
  const length = addNode(rebuildNodes, lengthContext, "ContextExpression", 232, "EX_FinalFunction", "call");
  length.call = call("final", "Array_Length", 1, []);
  addNode(rebuildNodes, length, "Parameters[0]", 241, "EX_LocalVariable", "variable", "ExampleSymbol_5c9e16b9b19d");
  const loopConditionAssignment = rebuildRoot(251, "EX_LetBool", "assignment");
  addNode(rebuildNodes, loopConditionAssignment, "Variable", 252, "EX_LocalOutVariable", "variable", "ExampleSymbol_ea1fd7e15884");
  const loopCondition = addNode(rebuildNodes, loopConditionAssignment, "Assignment", 261, "EX_CallMath", "call");
  loopCondition.call = call("final", "Less_IntInt", 2, []);
  addNode(rebuildNodes, loopCondition, "Parameters[0]", 270, "EX_LocalVariable", "variable", "Temp_int_Loop_Counter_Variable");
  addNode(rebuildNodes, loopCondition, "Parameters[1]", 279, "EX_LocalVariable", "variable", "ExampleSymbol_5546bd5cfb37");
  const loopBranch = rebuildRoot(289, "EX_PopExecutionFlowIfNot", "branch");
  loopBranch.jump = { jumpKind: "pop-flow-if-false", targets: [] };
  addNode(rebuildNodes, loopBranch, "BooleanExpression", 290, "EX_LocalVariable", "variable", "ExampleSymbol_ea1fd7e15884");
  fixtureVariableAssignment(rebuildNodes, rebuildRoot, 299, "EX_Let", "Temp_int_Array_Index_Variable", "Temp_int_Loop_Counter_Variable", 308, 317);
  const loopIncrement = rebuildRoot(326, "EX_PushExecutionFlow", "branch");
  loopIncrement.jump = {
    jumpKind: "push-flow",
    targets: [{ edge: "pushingAddress", offset: 445 }],
  };
  const item = rebuildRoot(353, "EX_FinalFunction", "call");
  item.call = call("final", "Array_Get", 3, []);
  addNode(rebuildNodes, item, "Parameters[0]", 362, "EX_LocalVariable", "variable", "ExampleSymbol_5c9e16b9b19d");
  addNode(rebuildNodes, item, "Parameters[1]", 371, "EX_LocalVariable", "variable", "Temp_int_Array_Index_Variable");
  addNode(rebuildNodes, item, "Parameters[2]", 380, "EX_LocalVariable", "variable", "ExampleSymbol_4bb2d3edf81f");
  const filterCall = rebuildRoot(390, "EX_LocalVirtualFunction", "call");
  filterCall.call = call("local-virtual", "Filter Example Schedule", 2, []);
  const date = addNode(rebuildNodes, filterCall, "Parameters[0]", 403, "EX_Context", "context", "ExampleCurrentPeriod");
  addNode(rebuildNodes, date, "ObjectExpression", 404, "EX_InstanceVariable", "variable", "Weather ref");
  addNode(rebuildNodes, date, "ContextExpression", 425, "EX_InstanceVariable", "variable", "ExampleCurrentPeriod");
  addNode(rebuildNodes, filterCall, "Parameters[1]", 434, "EX_LocalVariable", "variable", "ExampleSymbol_4bb2d3edf81f");
  const loopPop = rebuildRoot(444, "EX_PopExecutionFlow", "branch");
  loopPop.jump = { jumpKind: "pop-flow", targets: [] };
  const incrementAssignment = rebuildRoot(445, "EX_Let", "assignment", "ExampleSymbol_fbf99360b7d0");
  addNode(rebuildNodes, incrementAssignment, "Variable", 454, "EX_LocalOutVariable", "variable", "ExampleSymbol_fbf99360b7d0");
  const increment = addNode(rebuildNodes, incrementAssignment, "Assignment", 463, "EX_CallMath", "call");
  increment.call = call("final", "Add_IntInt", 2, []);
  addNode(rebuildNodes, increment, "Parameters[0]", 472, "EX_LocalVariable", "variable", "Temp_int_Loop_Counter_Variable");
  const one = addNode(rebuildNodes, increment, "Parameters[1]", 481, "EX_IntConst", "literal");
  one.literal = { literalType: "integer", value: "1" };
  fixtureVariableAssignment(rebuildNodes, rebuildRoot, 487, "EX_Let", "Temp_int_Loop_Counter_Variable", "ExampleSymbol_fbf99360b7d0", 496, 505);
  const loopBack = rebuildRoot(514, "EX_Jump", "branch");
  loopBack.jump = {
    jumpKind: "unconditional",
    targets: [{ edge: "codeOffset", offset: 192 }],
  };
  rebuildRoot(519, "EX_Return", "return");

  const filterNodes: Mutable<BlueprintTraceNodeInput>[] = [];
  const filterRoot = fixtureRoot(filterNodes);
  const secondHand = filterRoot(10, "EX_CallMath", "call");
  secondHand.call = call("final", "EqualEqual_BoolBool", 2, []);
  addNode(filterNodes, secondHand, "Parameters[0]", 19, "EX_StructMemberContext", "context", "ExampleField14_0_00000000000000000000000000000000");
  const falseLiteral = addNode(filterNodes, secondHand, "Parameters[1]", 37, "EX_False", "literal");
  falseLiteral.literal = { literalType: "boolean", value: "false" };
  const released = filterRoot(49, "EX_CallMath", "call");
  released.call = call("final", "EqualEqual_BoolBool", 2, []);
  addNode(filterNodes, released, "Parameters[0]", 58, "EX_StructMemberContext", "context", "ExampleField12_0_00000000000000000000000000000000");
  const trueLiteral = addNode(filterNodes, released, "Parameters[1]", 76, "EX_True", "literal");
  trueLiteral.literal = { literalType: "boolean", value: "true" };
  const combined = filterRoot(88, "EX_CallMath", "call");
  combined.call = call("final", "BooleanAND", 2, []);
  addNode(filterNodes, combined, "Parameters[0]", 97, "EX_LocalVariable", "variable", "ExampleSymbol_d2ee12acae76");
  addNode(filterNodes, combined, "Parameters[1]", 106, "EX_LocalVariable", "variable", "ExampleSymbol_a0a6ec447959");
  const preconditionBranch = filterRoot(116, "EX_JumpIfNot", "branch");
  preconditionBranch.jump = { jumpKind: "conditional-false", targets: [{ edge: "codeOffset", offset: 770 }] };
  addNode(filterNodes, preconditionBranch, "BooleanExpression", 121, "EX_LocalVariable", "variable", "ExampleSymbol_69ac0269c2d9");
  const predicate = filterRoot(152, "EX_LocalVirtualFunction", "call");
  predicate.call = call("local-virtual", "Evaluate Example Record", 4, []);
  const predicateProduct = addNode(filterNodes, predicate, "Parameters[0]", 165, "EX_StructMemberContext", "context", "ExampleField11_0_00000000000000000000000000000000");
  addNode(filterNodes, predicateProduct, "StructExpression", 174, "EX_LocalVariable", "variable", "Example Input Record");
  addNode(filterNodes, predicate, "Parameters[1]", 183, "EX_Self", "operation");
  addNode(filterNodes, predicate, "Parameters[2]", 184, "EX_LocalVariable", "variable", "ExampleSymbol_cb75a284c42b");
  addNode(filterNodes, predicate, "Parameters[3]", 193, "EX_LocalVariable", "variable", "ExampleSymbol_c12d64d7fc3d");
  const predicateBranch = filterRoot(203, "EX_JumpIfNot", "branch");
  predicateBranch.jump = { jumpKind: "conditional-false", targets: [{ edge: "codeOffset", offset: 496 }] };
  addNode(filterNodes, predicateBranch, "BooleanExpression", 208, "EX_LocalVariable", "variable", "ExampleSymbol_cb75a284c42b");
  fixtureStructMemberCopy(filterNodes, filterRoot, 217, 226, 235, 244, 253, "ExampleField11_0_00000000000000000000000000000000", "ExampleSymbol_5ac47990d176 Input Record");
  const eligibleSecondHand = fixtureLiteralAssignment(filterNodes, filterRoot, 299, "EX_LetBool", "ExampleField14_0_00000000000000000000000000000000", "boolean", "false", 300, 318, "EX_StructMemberContext", "context");
  addNode(filterNodes, eligibleSecondHand, "StructExpression", 309, "EX_LocalVariable", "variable", "ExampleSymbol_5ac47990d176 Input Record");
  const eligibleBasePrice = fixtureLiteralAssignment(filterNodes, filterRoot, 364, "EX_Let", "ExampleField01_0_00000000000000000000000000000000", "integer", "0", 373, 391, "EX_StructMemberContext", "context");
  addNode(filterNodes, eligibleBasePrice, "StructExpression", 382, "EX_LocalVariable", "variable", "ExampleSymbol_5ac47990d176 Input Record");
  const eligible = filterRoot(418, "EX_FinalFunction", "call");
  eligible.call = call("final", "Map_Add", 3, []);
  addNode(filterNodes, eligible, "Parameters[0]", 427, "EX_InstanceVariable", "variable", "Example Candidate Map");
  const eligibleSku = addNode(filterNodes, eligible, "Parameters[1]", 436, "EX_StructMemberContext", "context", "ExampleField15_0_00000000000000000000000000000000");
  const eligibleBoxData = addNode(filterNodes, eligibleSku, "StructExpression", 445, "EX_StructMemberContext", "context", "ExampleField03_0_00000000000000000000000000000000");
  const eligibleBaseStructure = addNode(filterNodes, eligibleBoxData, "StructExpression", 454, "EX_StructMemberContext", "context", "ExampleField02_0_00000000000000000000000000000000");
  const eligibleProduct = addNode(filterNodes, eligibleBaseStructure, "StructExpression", 463, "EX_StructMemberContext", "context", "ExampleField11_0_00000000000000000000000000000000");
  addNode(filterNodes, eligibleProduct, "StructExpression", 472, "EX_LocalVariable", "variable", "Example Input Record");
  addNode(filterNodes, eligible, "Parameters[2]", 481, "EX_LocalVariable", "variable", "ExampleSymbol_5ac47990d176 Input Record");
  const successJump = filterRoot(491, "EX_Jump", "branch");
  successJump.jump = { jumpKind: "unconditional", targets: [{ edge: "codeOffset", offset: 770 }] };
  fixtureStructMemberCopy(filterNodes, filterRoot, 496, 505, 514, 523, 532, "ExampleField11_0_00000000000000000000000000000000", "ExampleSymbol_5ac47990d176 Input Record_1");
  const ineligibleSecondHand = fixtureLiteralAssignment(filterNodes, filterRoot, 578, "EX_LetBool", "ExampleField14_0_00000000000000000000000000000000", "boolean", "true", 579, 597, "EX_StructMemberContext", "context");
  addNode(filterNodes, ineligibleSecondHand, "StructExpression", 588, "EX_LocalVariable", "variable", "ExampleSymbol_5ac47990d176 Input Record_1");
  const ineligibleBasePrice = fixtureLiteralAssignment(filterNodes, filterRoot, 643, "EX_Let", "ExampleField01_0_00000000000000000000000000000000", "integer", "0", 652, 670, "EX_StructMemberContext", "context");
  addNode(filterNodes, ineligibleBasePrice, "StructExpression", 661, "EX_LocalVariable", "variable", "ExampleSymbol_5ac47990d176 Input Record_1");
  const ineligible = filterRoot(697, "EX_FinalFunction", "call");
  ineligible.call = call("final", "Map_Add", 3, []);
  addNode(filterNodes, ineligible, "Parameters[0]", 706, "EX_InstanceVariable", "variable", "Example Source Map");
  const ineligibleSku = addNode(filterNodes, ineligible, "Parameters[1]", 715, "EX_StructMemberContext", "context", "ExampleField15_0_00000000000000000000000000000000");
  const ineligibleBoxData = addNode(filterNodes, ineligibleSku, "StructExpression", 724, "EX_StructMemberContext", "context", "ExampleField03_0_00000000000000000000000000000000");
  const ineligibleBaseStructure = addNode(filterNodes, ineligibleBoxData, "StructExpression", 733, "EX_StructMemberContext", "context", "ExampleField02_0_00000000000000000000000000000000");
  const ineligibleProduct = addNode(filterNodes, ineligibleBaseStructure, "StructExpression", 742, "EX_StructMemberContext", "context", "ExampleField11_0_00000000000000000000000000000000");
  addNode(filterNodes, ineligibleProduct, "StructExpression", 751, "EX_LocalVariable", "variable", "Example Input Record");
  addNode(filterNodes, ineligible, "Parameters[2]", 760, "EX_LocalVariable", "variable", "ExampleSymbol_5ac47990d176 Input Record_1");
  filterRoot(770, "EX_Return", "return");

  const functions = [
    candidateFunction(rebuildFunctionName, rebuildNodes),
    candidateFunction(filterFunctionName, filterNodes),
  ];
  return {
    artifactType: "blueprint-property-reference-trace",
    build: createBuild(),
    blueprintPropertyReferences: {
      fileName: "blueprint-property-references.new-release-candidates.v3.json",
      sizeBytes: 100,
      sha256: "9".repeat(64),
      targetPropertyName: "Example Candidate Map",
    },
    requestedFunctionPaths: functions.map((function_) => function_.functionPath),
    selectionRule: "explicit-functions-with-read-references",
    mappings: createMappings(),
    engine: engine(),
    extractor: extractor(),
    totals: totals(functions, 0),
    functions,
  };
}

export function createCallTargetTrace(): Mutable<BlueprintCallTargetTraceArtifact> {
  const nodes: Mutable<BlueprintTraceNodeInput>[] = [];
  const root = fixtureRoot(nodes);
  fixtureLiteralAssignment(nodes, root, 0, "EX_Let", "ExampleDuration", "integer", "7", 9, 18);
  const gameMode = root(33, "EX_CallMath", "call");
  gameMode.call = call("final", "GetGameMode", 1, []);
  addNode(nodes, gameMode, "Parameters[0]", 42, "EX_LocalVariable", "variable", "__WorldContext");
  const castBranch = root(117, "EX_JumpIfNot", "branch");
  castBranch.jump = { jumpKind: "conditional-false", targets: [{ edge: "codeOffset", offset: 1889 }] };
  addNode(nodes, castBranch, "BooleanExpression", 122, "EX_LocalVariable", "variable", "ExampleSymbol_cfba3a7c5b90");
  const elapsed = root(1512, "EX_CallMath", "call");
  elapsed.call = call("final", "Subtract_IntInt", 2, []);
  addNode(nodes, elapsed, "Parameters[0]", 1521, "EX_Context", "context", "Example Period Count");
  addNode(nodes, elapsed, "Parameters[1]", 1596, "EX_StructMemberContext", "context", "Example Available Period_0_00000000000000000000000000000000");
  const compare = root(1634, "EX_CallMath", "call");
  compare.call = call("final", "LessEqual_IntInt", 2, []);
  addNode(nodes, compare, "Parameters[0]", 1643, "EX_LocalVariable", "variable", "ExampleSymbol_e786ddbe8538");
  addNode(nodes, compare, "Parameters[1]", 1652, "EX_LocalVariable", "variable", "ExampleDuration");
  const addDuration = root(1680, "EX_CallMath", "call");
  addDuration.call = call("final", "Add_IntInt", 2, []);
  addNode(nodes, addDuration, "Parameters[0]", 1689, "EX_StructMemberContext", "context", "Example Available Period_0_00000000000000000000000000000000");
  addNode(nodes, addDuration, "Parameters[1]", 1716, "EX_LocalVariable", "variable", "ExampleDuration");
  const remaining = root(1744, "EX_CallMath", "call");
  remaining.call = call("final", "Subtract_IntInt", 2, []);
  addNode(nodes, remaining, "Parameters[0]", 1753, "EX_LocalVariable", "variable", "ExampleSymbol_fbf99360b7d0");
  addNode(nodes, remaining, "Parameters[1]", 1762, "EX_Context", "context", "Example Period Count");
  fixtureVariableAssignment(nodes, root, 1838, "EX_LetBool", "is New", "ExampleSymbol_a3f5a084342d", 1839, 1848);
  fixtureVariableAssignment(nodes, root, 1857, "EX_Let", "is New Day Left", "ExampleSymbol_0e5eff394dbb", 1866, 1875);
  const successJump = root(1884, "EX_Jump", "branch");
  successJump.jump = { jumpKind: "unconditional", targets: [{ edge: "codeOffset", offset: 1923 }] };
  fixtureLiteralAssignment(nodes, root, 1889, "EX_LetBool", "is New", "boolean", "false", 1890, 1899);
  fixtureLiteralAssignment(nodes, root, 1900, "EX_Let", "is New Day Left", "integer", "0", 1909, 1918);
  root(1923, "EX_Return", "return");

  const predicateClassPath =
    "ExampleGame/Content/ExampleProject/core/blueprint/data/ExampleRecord.ExampleRecord_C";
  const predicatePath = `${predicateClassPath}:Evaluate Example Record`;
  const signature = {
    parameterCount: 4,
    parameters: [
      parameter(0, "Example Product Struct", "Struct<Example Product Struct>", "Parm, OutParm"),
      parameter(1, "__WorldContext", "Object", "Parm"),
      parameter(2, "is New", "Bool", "Parm, OutParm"),
      parameter(3, "is New Day Left", "Int", "Parm, OutParm"),
    ],
  };
  return {
    artifactType: "blueprint-call-target-trace",
    build: createBuild(),
    sourceTrace: {
      ...newReleaseSources.candidateMapTrace,
      targetPropertyName: "Example Candidate Map",
    },
    declarations: {
      fileName: "blueprint-function-declarations.return-if-film-is-new.json",
      sizeBytes: 100,
      sha256: "3".repeat(64),
      artifactType: "blueprint-function-declarations",
      targetFunctionName: "Evaluate Example Record",
      declarationRule: "exact-raw-function-export-object-name",
    },
    recordedCall: {
      callerFunctionPath:
        "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C:Filter Example Schedule",
      statementIndex: 152,
      opcode: "EX_LocalVirtualFunction",
      call: {
        callKind: "local-virtual",
        functionName: "Evaluate Example Record",
        argumentCount: 4,
        integerArguments: [],
      },
    },
    binding: {
      bindingRule: "exact-context-object-class-and-declaration",
      relationship: "verified",
      receiverClassMatchesDeclarationOwner: true,
      argumentCountMatchesParameterCount: true,
      receiver: {
        contextStatementIndex: 130,
        contextOpcode: "EX_Context",
        callEdge: "ContextExpression",
        receiverStatementIndex: 131,
        receiverOpcode: "EX_ObjectConst",
        receiverEdge: "ObjectExpression",
        objectName: "Default__ExampleRecord_C",
        objectPath:
          "ExampleGame/Content/ExampleProject/core/blueprint/data/ExampleRecord.Default__ExampleRecord_C",
        classPath: predicateClassPath,
        exportType: "ExampleRecord_C",
      },
      declaration: {
        packagePath:
          "ExampleGame/Content/ExampleProject/core/blueprint/data/ExampleRecord.uasset",
        packageExportIndex: 14,
        objectPath: predicatePath,
        ownerPath: predicateClassPath,
        signature,
      },
      function: {
        packagePath:
          "ExampleGame/Content/ExampleProject/core/blueprint/data/ExampleRecord.uasset",
        className: "ExampleRecord_C",
        classPath: predicateClassPath,
        functionName: "Evaluate Example Record",
        functionPath: predicatePath,
        flags: "FUNC_Public, FUNC_BlueprintCallable",
        bytecodeExpressionCount: 12,
        nodes,
      },
    },
    mappings: createMappings(),
    engine: engine(),
    extractor: extractor(),
  };
}

function fixtureRoot(nodes: Mutable<BlueprintTraceNodeInput>[]) {
  return (
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol: string | null = null,
  ) => addNode(
    nodes,
    null,
    `script[${nodes.filter((node) => node.parentNodeIndex === null).length}]`,
    statementIndex,
    opcode,
    kind,
    symbol,
  );
}

function fixtureLiteralAssignment(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  root: ReturnType<typeof fixtureRoot>,
  statementIndex: number,
  opcode: string,
  symbol: string,
  literalType: "boolean" | "integer",
  value: string,
  variableStatementIndex: number,
  literalStatementIndex: number,
  variableOpcode = "EX_LocalVariable",
  variableKind: BlueprintTraceNodeInput["kind"] = "variable",
): Mutable<BlueprintTraceNodeInput> {
  const assignment = root(statementIndex, opcode, "assignment", opcode === "EX_Let" ? symbol : null);
  const target = addNode(
    nodes,
    assignment,
    "Variable",
    variableStatementIndex,
    variableOpcode,
    variableKind,
    symbol,
  );
  const literal = addNode(
    nodes,
    assignment,
    "Assignment",
    literalStatementIndex,
    literalType === "boolean" ? (value === "true" ? "EX_True" : "EX_False") : "EX_IntConst",
    "literal",
  );
  literal.literal = { literalType, value };
  return target;
}

function fixtureStructMemberCopy(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  root: ReturnType<typeof fixtureRoot>,
  assignmentStatementIndex: number,
  targetMemberStatementIndex: number,
  targetStructStatementIndex: number,
  sourceMemberStatementIndex: number,
  sourceStructStatementIndex: number,
  memberSymbol: string,
  targetStructSymbol: string,
): void {
  const assignment = root(assignmentStatementIndex, "EX_Let", "assignment", memberSymbol);
  const target = addNode(
    nodes,
    assignment,
    "Variable",
    targetMemberStatementIndex,
    "EX_StructMemberContext",
    "context",
    memberSymbol,
  );
  addNode(
    nodes,
    target,
    "StructExpression",
    targetStructStatementIndex,
    "EX_LocalVariable",
    "variable",
    targetStructSymbol,
  );
  const source = addNode(
    nodes,
    assignment,
    "Assignment",
    sourceMemberStatementIndex,
    "EX_StructMemberContext",
    "context",
    memberSymbol,
  );
  addNode(
    nodes,
    source,
    "StructExpression",
    sourceStructStatementIndex,
    "EX_LocalVariable",
    "variable",
    "Example Input Record",
  );
}

function fixtureVariableAssignment(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  root: ReturnType<typeof fixtureRoot>,
  statementIndex: number,
  opcode: string,
  targetSymbol: string,
  sourceSymbol: string,
  variableStatementIndex: number,
  sourceStatementIndex: number,
): void {
  const assignment = root(statementIndex, opcode, "assignment", opcode === "EX_Let" ? targetSymbol : null);
  addNode(nodes, assignment, "Variable", variableStatementIndex, "EX_LocalOutVariable", "variable", targetSymbol);
  addNode(nodes, assignment, "Assignment", sourceStatementIndex, "EX_LocalVariable", "variable", sourceSymbol);
}

function candidateFunction(
  functionName: string,
  nodes: Mutable<BlueprintTraceNodeInput>[],
): Mutable<BlueprintTraceFunctionInput> {
  return {
    packagePath: "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.uasset",
    className: "ExampleManager_C",
    classPath: marketClassPath,
    functionName,
    functionPath: `${marketClassPath}:${functionName}`,
    flags: "FUNC_Public, FUNC_BlueprintCallable",
    bytecodeExpressionCount: nodes.filter((node) => node.parentNodeIndex === null).length,
    nodes,
  };
}

function parameter(
  position: number,
  name: string,
  type: string,
  flags: string,
) {
  return { position, name, type, arrayDimension: 1, flags };
}

function variableAssignment(
  root: (
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol?: string | null,
  ) => Mutable<BlueprintTraceNodeInput>,
  child: (
    parent: Mutable<BlueprintTraceNodeInput>,
    edge: string,
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol?: string | null,
  ) => Mutable<BlueprintTraceNodeInput>,
  statementIndex: number,
  opcode: string,
  targetSymbol: string,
  sourceSymbol: string,
): void {
  const assignment = root(statementIndex, opcode, "assignment", targetSymbol);
  child(assignment, "Variable", statementIndex + 1, "EX_LocalVariable", "variable", targetSymbol);
  child(assignment, "Assignment", statementIndex + 2, "EX_LocalVariable", "variable", sourceSymbol);
}

function collectionCall(
  root: (
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol?: string | null,
  ) => Mutable<BlueprintTraceNodeInput>,
  child: (
    parent: Mutable<BlueprintTraceNodeInput>,
    edge: string,
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol?: string | null,
  ) => Mutable<BlueprintTraceNodeInput>,
  statementIndex: number,
  functionName: string,
  argumentCount: number,
  contextStatementIndex: number,
  fieldStatementIndex: number,
  collectionSymbol: string,
): Mutable<BlueprintTraceNodeInput> {
  const functionCall = root(statementIndex, "EX_FinalFunction", "call");
  functionCall.call = call("final", functionName, argumentCount, []);
  const context = child(
    functionCall,
    "Parameters[0]",
    contextStatementIndex,
    "EX_Context",
    "context",
    collectionSymbol,
  );
  child(
    context,
    "ContextExpression",
    fieldStatementIndex,
    "EX_InstanceVariable",
    "variable",
    collectionSymbol,
  );
  return functionCall;
}

function branch(
  root: (
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol?: string | null,
  ) => Mutable<BlueprintTraceNodeInput>,
  child: (
    parent: Mutable<BlueprintTraceNodeInput>,
    edge: string,
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol?: string | null,
  ) => Mutable<BlueprintTraceNodeInput>,
  statementIndex: number,
  opcode: string,
  jumpKind: NonNullable<BlueprintTraceNodeInput["jump"]>["jumpKind"],
  conditionSymbol: string,
  targetOffset?: number,
): void {
  const condition = root(statementIndex, opcode, "branch");
  condition.jump = {
    jumpKind,
    targets: targetOffset === undefined
      ? []
      : [{ edge: "codeOffset", offset: targetOffset }],
  };
  child(
    condition,
    "BooleanExpression",
    statementIndex + 1,
    "EX_LocalVariable",
    "variable",
    conditionSymbol,
  );
}

function jump(
  root: (
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol?: string | null,
  ) => Mutable<BlueprintTraceNodeInput>,
  statementIndex: number,
  opcode: string,
  jumpKind: NonNullable<BlueprintTraceNodeInput["jump"]>["jumpKind"],
  targetEdge?: string,
  targetOffset?: number,
): void {
  const operation = root(statementIndex, opcode, "branch");
  operation.jump = {
    jumpKind,
    targets: targetEdge === undefined
      ? []
      : [{ edge: targetEdge, offset: targetOffset! }],
  };
}

function literalAssignment(
  root: (
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol?: string | null,
  ) => Mutable<BlueprintTraceNodeInput>,
  child: (
    parent: Mutable<BlueprintTraceNodeInput>,
    edge: string,
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol?: string | null,
  ) => Mutable<BlueprintTraceNodeInput>,
  statementIndex: number,
  opcode: string,
  symbol: string,
  literalType: "boolean" | "integer",
  value: string,
): void {
  const assignment = root(statementIndex, opcode, "assignment", opcode === "EX_Let" ? symbol : null);
  child(
    assignment,
    "Variable",
    statementIndex + (opcode === "EX_Let" ? 9 : 1),
    "EX_LocalVariable",
    "variable",
    symbol,
  );
  const literal = child(
    assignment,
    "Assignment",
    statementIndex + (opcode === "EX_Let" ? 18 : 10),
    literalType === "boolean" ? (value === "true" ? "EX_True" : "EX_False") :
      opcode === "EX_Let" && symbol === "Temp_byte_Variable_6" ? "EX_ByteConst" : "EX_IntConst",
    "literal",
  );
  literal.literal = { literalType, value };
}

function marketWrapper(
  functionName: string,
  entryPoint: string,
  parameter: boolean,
): Mutable<BlueprintTraceFunctionInput> {
  const nodes: Mutable<BlueprintTraceNodeInput>[] = [];
  if (parameter) {
    const assignment = addNode(
      nodes,
      null,
      "script[0]",
      0,
      "EX_LetValueOnPersistentFrame",
      "assignment",
      "Parameter",
    );
    addNode(
      nodes,
      assignment,
      "AssignmentExpression",
      9,
      "EX_LocalVariable",
      "variable",
      "Parameter",
    );
  }
  const statementIndex = parameter ? 18 : 0;
  const entry = addNode(
    nodes,
    null,
    `script[${parameter ? 1 : 0}]`,
    statementIndex,
    "EX_LocalFinalFunction",
    "call",
  );
  entry.call = call("local-final", "ExecuteExampleGraph_ExampleManager", 1, [entryPoint]);
  const literal = addNode(
    nodes,
    entry,
    "Parameters[0]",
    statementIndex + 9,
    "EX_IntConst",
    "literal",
  );
  literal.literal = { literalType: "integer", value: entryPoint };
  return {
    packagePath: "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.uasset",
    className: "ExampleManager_C",
    classPath: marketClassPath,
    functionName,
    functionPath: `${marketClassPath}:${functionName}`,
    flags: "FUNC_Public, FUNC_BlueprintCallable",
    bytecodeExpressionCount: parameter ? 2 : 1,
    nodes,
  };
}

function sourceMapAdd(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  root: ReturnType<typeof fixtureRoot>,
  callStatement: number,
  mapStatement: number,
  skuStatement: number,
  filmStatement: number,
  valueStatement: number,
  collection: string,
): void {
  const add = root(callStatement, "EX_FinalFunction", "call");
  add.call = call("final", "Map_Add", 3, []);
  addNode(
    nodes,
    add,
    "Parameters[0]",
    mapStatement,
    "EX_InstanceVariable",
    "variable",
    collection,
  );
  const sku = addNode(
    nodes,
    add,
    "Parameters[1]",
    skuStatement,
    "EX_StructMemberContext",
    "context",
    "ExampleField15_0_00000000000000000000000000000000",
  );
  addNode(
    nodes,
    sku,
    "StructExpression",
    filmStatement,
    "EX_LocalVariable",
    "variable",
    "ExampleCurrentCandidate",
  );
  addNode(
    nodes,
    add,
    "Parameters[2]",
    valueStatement,
    "EX_LocalVariable",
    "variable",
    "ExampleSymbol_5ac47990d176 Input Record",
  );
}

function wrapper(functionName: string, entryPoint: number, parameter = false): Mutable<BlueprintTraceFunctionInput> {
  const nodes: Mutable<BlueprintTraceNodeInput>[] = [];
  if (parameter) {
    const assignment = addNode(nodes, null, "script[0]", 0, "EX_LetValueOnPersistentFrame", "assignment", "Parameter");
    addNode(nodes, assignment, "AssignmentExpression", 9, "EX_LocalVariable", "variable", "Parameter");
  }
  const entry = addNode(nodes, null, `script[${parameter ? 1 : 0}]`, parameter ? 18 : 0, "EX_LocalFinalFunction", "call");
  entry.call = call("local-final", unlockEventGraph, 1, [String(entryPoint)]);
  const literal = addNode(nodes, entry, "Parameters[0]", parameter ? 27 : 9, "EX_IntConst", "literal");
  literal.literal = { literalType: "integer", value: String(entryPoint) };
  return {
    packagePath: "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.uasset",
    className: "ExampleUnlockSystem_C",
    classPath: unlockClassPath,
    functionName,
    functionPath: `${unlockClassPath}:${functionName}`,
    flags: "FUNC_Public",
    bytecodeExpressionCount: nodes.length,
    nodes,
  };
}

function addNode(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  parent: Mutable<BlueprintTraceNodeInput> | null,
  edge: string,
  statementIndex: number,
  opcode: string,
  kind: BlueprintTraceNodeInput["kind"],
  symbol: string | null = null,
): Mutable<BlueprintTraceNodeInput> {
  const node: Mutable<BlueprintTraceNodeInput> = {
    nodeIndex: nodes.length,
    parentNodeIndex: parent?.nodeIndex ?? null,
    edge,
    depth: parent === null ? 0 : parent.depth + 1,
    statementIndex,
    opcode,
    kind,
    symbol,
    call: null,
    jump: null,
    literal: null,
  };
  nodes.push(node);
  return node;
}

function call(
  callKind: NonNullable<BlueprintTraceNodeInput["call"]>["callKind"],
  functionName: string,
  argumentCount: number,
  values: readonly string[],
): NonNullable<Mutable<BlueprintTraceNodeInput>["call"]> {
  return {
    callKind,
    functionName,
    argumentCount,
    integerArguments: values.map((value, position) => ({ position, value })),
  };
}

function totals(functions: readonly Mutable<BlueprintTraceFunctionInput>[], entrypointCount: number) {
  const nodes = functions.flatMap((function_) => function_.nodes);
  return {
    packageCount: 1,
    classCount: 1,
    functionCount: functions.length,
    nodeCount: nodes.length,
    callCount: nodes.filter((node) => node.call !== null).length,
    branchCount: nodes.filter((node) => node.jump !== null).length,
    entrypointCount,
  };
}

function engine() {
  return {
    version: "5.4" as const,
    cue4ParseProfile: "GAME_UE5_4" as const,
    source: "configured" as const,
    confidence: "probable" as const,
  };
}

function extractor() {
  return {
    name: "NeonRetroRewind.StaticExtractor" as const,
    version: "0.0.1",
    cue4ParseVersion: "1.2.2.202607",
  };
}

function identity<ArtifactType extends NewReleaseArtifactIdentity["artifactType"]>(
  fileName: string,
  artifactType: ArtifactType,
  hashCharacter: string,
): NewReleaseArtifactIdentity<ArtifactType> {
  return {
    fileName,
    artifactType,
    sizeBytes: 100,
    sha256: hashCharacter.repeat(64),
  } as NewReleaseArtifactIdentity<ArtifactType>;
}
