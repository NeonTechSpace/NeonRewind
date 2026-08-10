import type { NewReleaseUnlockArtifactIdentity } from "@neonretrorewind/core";

import type {
  BlueprintFunctionTraceArtifact,
  BlueprintPropertyReferenceTraceArtifact,
  BlueprintTraceFunctionInput,
  BlueprintTraceNodeInput,
  UnlockableManagerTraceArtifact,
} from "../src/blueprint-trace-inputs.ts";
import type { NewReleaseUnlockSources } from "../src/new-release-unlock-mechanics.ts";
import { createBuild, createMappings, type Mutable } from "./rental-fixtures.ts";

export const unlockClassPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C";
export const unlockEventGraph = "ExecuteExampleGraph_ExampleUnlockSystem";
const unlockFunctionPath = `${unlockClassPath}:${unlockEventGraph}`;

export const newReleaseUnlockSources: NewReleaseUnlockSources = {
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

function identity<ArtifactType extends NewReleaseUnlockArtifactIdentity["artifactType"]>(
  fileName: string,
  artifactType: ArtifactType,
  hashCharacter: string,
): NewReleaseUnlockArtifactIdentity<ArtifactType> {
  return {
    fileName,
    artifactType,
    sizeBytes: 100,
    sha256: hashCharacter.repeat(64),
  } as NewReleaseUnlockArtifactIdentity<ArtifactType>;
}
