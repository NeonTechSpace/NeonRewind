import type {
  BlueprintTraceFunctionInput,
  BlueprintTraceNodeInput,
  RentalFunctionTraceArtifact,
} from "../src/blueprint-trace-inputs.ts";
import { createBuild, createMappings, rentalSources } from "./rental-fixtures.ts";

type Mutable<T> = { -readonly [Property in keyof T]: Mutable<T[Property]> };
type Node = Mutable<BlueprintTraceNodeInput>;

const packagePath =
  "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.uasset";
const classPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.ExampleQueueSystem_C";
const eventGraph = "ExecuteExampleGraph_ExampleQueueSystem";

export function createRentalFunctionTrace(): Mutable<RentalFunctionTraceArtifact> {
  const functions = [
    createEventGraph(),
    createWrapper("Prepare Example Items", 0, 2592, 15, 3),
    createSelection(),
    createWrapper("Example Period Event", 18, 1792, 33, 4),
  ];
  const nodes = functions.flatMap((function_) => function_.nodes);
  return {
    artifactType: "rental-function-trace",
    schemaVersion: 1,
    build: createBuild(),
    rentalBlueprintBodies: {
      fileName: rentalSources.rentalBlueprintBodies.fileName,
      sizeBytes: rentalSources.rentalBlueprintBodies.sizeBytes,
      sha256: rentalSources.rentalBlueprintBodies.sha256,
      schemaVersion: 1,
    },
    requestedFunctionPaths: functions.map((function_) => function_.functionPath),
    mappings: createMappings(),
    engine: {
      version: "5.4",
      cue4ParseProfile: "GAME_UE5_4",
      source: "configured",
      confidence: "probable",
    },
    extractor: {
      name: "NeonRetroRewind.StaticExtractor",
      version: "0.0.1",
      cue4ParseVersion: "1.2.2.202607",
    },
    totals: {
      packageCount: 1,
      classCount: 1,
      functionCount: functions.length,
      nodeCount: nodes.length,
      callCount: nodes.filter((node) => node.call !== null).length,
      branchCount: nodes.filter((node) => node.jump !== null).length,
      entrypointCount: 2,
    },
    functions,
  };
}

function createWrapper(
  name: string,
  callStatement: number,
  entryPoint: number,
  returnStatement: number,
  expressionCount: number,
): Mutable<BlueprintTraceFunctionInput> {
  const builder = createBuilder();
  const entry = builder.call(callStatement, eventGraph, "local-final", 1);
  builder.literal(entry, "Parameters[0]", callStatement + 9, "integer", String(entryPoint));
  entry.call!.integerArguments = [{ position: 0, value: String(entryPoint) }];
  builder.root(returnStatement, "EX_Return", "return");
  return traceFunction(name, expressionCount, builder.nodes);
}

function createEventGraph(): Mutable<BlueprintTraceFunctionInput> {
  const builder = createBuilder();
  const state = builder.root(1792, "EX_LetBool", "assignment");
  builder.variable(state, "Variable", 1793, "Simulated New Day Event when SaveGame is Load");
  builder.literal(state, "Assignment", 1802, "boolean", "true");
  builder.call(1803, "Prepare Example Items", "local-virtual", 0);
  builder.call(1817, "Prepare Example Devices", "local-virtual", 0);
  builder.jump(1831, "pop-flow");
  const appendContext = builder.root(1832, "EX_Context", "context", "None");
  const append = builder.call(1854, "Array_Append", "final", 2, appendContext, "ContextExpression");
  builder.variable(append, "Parameters[0]", 1863, "Example Ready Items");
  builder.variable(append, "Parameters[1]", 1872, "Example Active Items");
  const clearContext = builder.root(1882, "EX_Context", "context", "None");
  const clear = builder.call(1904, "Array_Clear", "final", 1, clearContext, "ContextExpression");
  builder.variable(clear, "Parameters[0]", 1913, "Example Active Items");
  builder.jump(1923, "pop-flow-if-false");
  builder.jump(2592, "unconditional", "codeOffset", 1832);
  return traceFunction(eventGraph, 108, builder.nodes);
}

function createSelection(): Mutable<BlueprintTraceFunctionInput> {
  const builder = createBuilder();
  addCall(builder, 40, "Array_Length", [variable("Example Selected Items")]);
  addCall(builder, 69, "GreaterEqual_IntInt", [
    variable("ExampleSymbol_be9a3b9c9802"),
    literal("integer", "4"),
  ]);
  addBranch(builder, 93, "conditional-false", 150, "ExampleSymbol_6f13bbd8ae3a");
  addBooleanAssignment(builder, 107, "Find a product", "true");
  addSymbolAssignment(builder, 118, "Item founded", "Example Selected Items");
  builder.jump(145, "unconditional", "codeOffset", 1056);
  addCall(builder, 190, "Array_Length", [variable("Example Active Items")]);
  addCall(builder, 219, "GreaterEqual_IntInt", [
    variable("ExampleSymbol_5546bd5cfb37"),
    literal("integer", "3"),
  ]);
  addCast(builder, 243, "ExampleSymbol_203da61871cf", 261, 263,
    "Example Initial Weight");
  addCall(builder, 290, "SelectFloat", [
    literal("number", "0.95"),
    variable("ExampleSymbol_203da61871cf"),
    variable("ExampleSymbol_bb52aec4341e"),
  ]);
  addCall(builder, 367, "Array_Length", [variable("Example Selected Items")]);
  addCall(builder, 396, "LessEqual_IntInt", [
    variable("ExampleSymbol_f5d2e88dd6b7"),
    literal("integer", "0"),
  ]);
  addCast(builder, 420, "ExampleSymbol_b1c3be1965a7", 438, 440,
    "Example Additional Weight");
  addCall(builder, 467, "SelectFloat", [
    variable("ExampleSymbol_5bd531b809d6"),
    variable("ExampleSymbol_b1c3be1965a7"),
    variable("ExampleSymbol_a3f5a084342d"),
  ]);
  addCast(builder, 504, "ExampleSymbol_4e61d6d250fc", 522, 524,
    "ExampleSymbol_a648c3a2c8fa");
  addCall(builder, 543, "RandomBoolWithWeight", [
    variable("ExampleSymbol_4e61d6d250fc"),
  ]);
  addBranch(builder, 562, "conditional-false", 815,
    "ExampleSymbol_df2cd757b8a8");
  addCandidateChoice(builder, 598);
  addCall(builder, 645, "NotEqual_IntInt", [
    variable("ExampleSymbol_0ab7d40dbb1d"),
    literal("integer", "-1"),
  ]);
  addBranch(builder, 669, "conditional-false", 1013,
    "ExampleSymbol_78567b0964f3");
  addCandidateChoice(builder, 705);
  addCall(builder, 782, "Array_AddUnique", [
    variable("Example Selected Items"),
    variable("ExampleSymbol_0e79e7bf84f2"),
  ]);
  builder.jump(810, "unconditional", "codeOffset", 0);
  addCall(builder, 855, "Array_Length", [variable("Example Selected Items")]);
  addCall(builder, 884, "Greater_IntInt", [
    variable("ExampleSymbol_5b49cd8b7a54"),
    literal("integer", "0"),
  ]);
  addBranch(builder, 908, "conditional-false", 965,
    "ExampleSymbol_b752835dd3cc");
  addBooleanAssignment(builder, 922, "Find a product", "true");
  addSymbolAssignment(builder, 933, "Item founded", "Example Selected Items");
  builder.jump(960, "unconditional", "codeOffset", 1056);
  addBooleanAssignment(builder, 965, "Find a product", "false");
  addEmptyAssignment(builder, 976, "Item founded");
  builder.jump(1008, "unconditional", "codeOffset", 1056);
  addBooleanAssignment(builder, 1013, "Find a product", "false");
  addEmptyAssignment(builder, 1024, "Item founded");
  builder.root(1056, "EX_Return", "return");
  return traceFunction("Select Example Items", 36, builder.nodes);
}

function addCall(
  builder: ReturnType<typeof createBuilder>,
  statement: number,
  name: string,
  arguments_: readonly Value[],
): void {
  const call = builder.call(statement, name, "final", arguments_.length);
  arguments_.forEach((value, index) => addValue(builder, call, `Parameters[${index}]`, statement + index + 1, value));
}

function addCandidateChoice(builder: ReturnType<typeof createBuilder>, statement: number): void {
  addCall(builder, statement, "Array_Random", [
    variable("Example Ready Items"),
    variable("ExampleSymbol_0e79e7bf84f2"),
    variable("ExampleSymbol_0ab7d40dbb1d"),
  ]);
}

function addBranch(
  builder: ReturnType<typeof createBuilder>,
  statement: number,
  kind: "conditional-false",
  target: number,
  condition: string,
): void {
  const branch = builder.jump(statement, kind, "codeOffset", target);
  builder.variable(branch, "BooleanExpression", statement + 1, condition);
}

function addBooleanAssignment(
  builder: ReturnType<typeof createBuilder>,
  statement: number,
  name: string,
  value: "true" | "false",
): void {
  const assignment = builder.root(statement, "EX_LetBool", "assignment");
  builder.variable(assignment, "Variable", statement + 1, name);
  builder.literal(assignment, "Assignment", statement + 2, "boolean", value);
}

function addSymbolAssignment(
  builder: ReturnType<typeof createBuilder>,
  statement: number,
  name: string,
  value: string,
): void {
  const assignment = builder.root(statement, "EX_Let", "assignment", name);
  builder.variable(assignment, "Variable", statement + 1, name);
  builder.variable(assignment, "Assignment", statement + 2, value);
}

function addEmptyAssignment(
  builder: ReturnType<typeof createBuilder>,
  statement: number,
  name: string,
): void {
  const assignment = builder.root(statement, "EX_Let", "assignment", name);
  builder.variable(assignment, "Variable", statement + 1, name);
  builder.child(assignment, "Assignment", statement + 2, "EX_ArrayConst", "operation");
}

function addCast(
  builder: ReturnType<typeof createBuilder>,
  statement: number,
  result: string,
  castStatement: number,
  targetStatement: number,
  target: string,
): void {
  const assignment = builder.root(statement, "EX_Let", "assignment", "None");
  builder.variable(assignment, "Variable", statement + 1, result);
  const cast = builder.child(assignment, "Assignment", castStatement, "EX_Cast", "operation");
  builder.variable(cast, "Target", targetStatement, target);
}

function traceFunction(
  name: string,
  expressionCount: number,
  nodes: Node[],
): Mutable<BlueprintTraceFunctionInput> {
  return {
    packagePath,
    className: "ExampleQueueSystem_C",
    classPath,
    functionName: name,
    functionPath: `${classPath}:${name}`,
    flags: "FUNC_BlueprintCallable, FUNC_BlueprintEvent",
    bytecodeExpressionCount: expressionCount,
    nodes,
  };
}

function createBuilder() {
  const nodes: Node[] = [];
  let roots = 0;
  const child = (
    parent: Node,
    edge: string,
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol: string | null = null,
  ): Node => {
    const node = baseNode(nodes.length, parent.nodeIndex, edge, parent.depth + 1, statementIndex, opcode, kind, symbol);
    nodes.push(node);
    return node;
  };
  const root = (
    statementIndex: number,
    opcode: string,
    kind: BlueprintTraceNodeInput["kind"],
    symbol: string | null = null,
  ): Node => {
    const node = baseNode(nodes.length, null, `script[${roots++}]`, 0, statementIndex, opcode, kind, symbol);
    nodes.push(node);
    return node;
  };
  const call = (
    statementIndex: number,
    name: string,
    kind: NonNullable<BlueprintTraceNodeInput["call"]>["callKind"],
    argumentCount: number,
    parent?: Node,
    edge = "Assignment",
  ): Node => {
    const node = parent
      ? child(parent, edge, statementIndex, "EX_FinalFunction", "call")
      : root(statementIndex, "EX_FinalFunction", "call");
    node.call = { callKind: kind, functionName: name, argumentCount, integerArguments: [] };
    return node;
  };
  const variable = (parent: Node, edge: string, statement: number, symbol: string): Node =>
    child(parent, edge, statement, "EX_LocalVariable", "variable", symbol);
  const literal_ = (
    parent: Node,
    edge: string,
    statement: number,
    type: NonNullable<BlueprintTraceNodeInput["literal"]>["literalType"],
    value: string,
  ): Node => {
    const node = child(parent, edge, statement, "EX_IntConst", "literal");
    node.literal = { literalType: type, value };
    return node;
  };
  const jump = (
    statement: number,
    kind: NonNullable<BlueprintTraceNodeInput["jump"]>["jumpKind"],
    edge?: string,
    offset?: number,
  ): Node => {
    const node = root(statement, "EX_Jump", "branch");
    node.jump = { jumpKind: kind, targets: edge === undefined ? [] : [{ edge, offset: offset! }] };
    return node;
  };
  return { nodes, root, child, call, variable, literal: literal_, jump };
}

function baseNode(
  nodeIndex: number,
  parentNodeIndex: number | null,
  edge: string,
  depth: number,
  statementIndex: number,
  opcode: string,
  kind: BlueprintTraceNodeInput["kind"],
  symbol: string | null,
): Node {
  return { nodeIndex, parentNodeIndex, edge, depth, statementIndex, opcode, kind, symbol, call: null, jump: null, literal: null };
}

type Value =
  | { readonly kind: "variable"; readonly value: string }
  | { readonly kind: "literal"; readonly type: NonNullable<BlueprintTraceNodeInput["literal"]>["literalType"]; readonly value: string };

const variable = (value: string): Value => ({ kind: "variable", value });
const literal = (type: Extract<Value, { kind: "literal" }>["type"], value: string): Value =>
  ({ kind: "literal", type, value });

function addValue(
  builder: ReturnType<typeof createBuilder>,
  parent: Node,
  edge: string,
  statement: number,
  value: Value,
): void {
  if (value.kind === "variable") builder.variable(parent, edge, statement, value.value);
  else builder.literal(parent, edge, statement, value.type, value.value);
}
