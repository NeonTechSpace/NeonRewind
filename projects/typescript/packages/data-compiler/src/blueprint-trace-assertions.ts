import type {
  BlueprintTraceFunctionInput,
  BlueprintTraceNodeInput,
} from "./blueprint-trace-inputs.ts";

export function findTraceFunction(
  functions: readonly BlueprintTraceFunctionInput[],
  name: string,
): BlueprintTraceFunctionInput {
  const matches = functions.filter((function_) => function_.functionName === name);
  if (matches.length !== 1) {
    throw new Error(`Expected one Blueprint trace function ${name}, found ${matches.length}.`);
  }
  return matches[0]!;
}

export function findTraceCall(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  functionName: string,
  callKind: NonNullable<BlueprintTraceNodeInput["call"]>["callKind"],
  argumentCount: number,
): BlueprintTraceNodeInput {
  const node = findTraceNode(function_, statementIndex);
  if (
    node.call?.functionName !== functionName ||
    node.call.callKind !== callKind ||
    node.call.argumentCount !== argumentCount ||
    node.kind !== "call"
  ) {
    throw new Error(`Blueprint trace call changed at statement ${statementIndex}.`);
  }
  return node;
}

export function assertTraceCall(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  functionName: string,
  callKind: NonNullable<BlueprintTraceNodeInput["call"]>["callKind"],
  argumentCount: number,
): void {
  findTraceCall(function_, statementIndex, functionName, callKind, argumentCount);
}

export function assertTraceJump(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  jumpKind: NonNullable<BlueprintTraceNodeInput["jump"]>["jumpKind"],
  targetEdge?: string,
  targetOffset?: number,
): BlueprintTraceNodeInput {
  const node = findTraceNode(function_, statementIndex);
  const expectedTargets = targetEdge === undefined
    ? []
    : [{ edge: targetEdge, offset: targetOffset }];
  if (
    node.kind !== "branch" ||
    node.jump?.jumpKind !== jumpKind ||
    JSON.stringify(node.jump.targets) !== JSON.stringify(expectedTargets)
  ) {
    throw new Error(`Blueprint trace branch changed at statement ${statementIndex}.`);
  }
  return node;
}

export function assertTraceRootNode(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  opcode: string,
): void {
  const node = findTraceNode(function_, statementIndex);
  if (node.parentNodeIndex !== null || node.opcode !== opcode) {
    throw new Error(`Blueprint trace root operation changed at statement ${statementIndex}.`);
  }
}

export function findTraceNode(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
): BlueprintTraceNodeInput {
  const matches = function_.nodes.filter((node) => node.statementIndex === statementIndex);
  if (matches.length !== 1) {
    throw new Error(
      `Expected one Blueprint trace node at statement ${statementIndex}, found ${matches.length}.`,
    );
  }
  return matches[0]!;
}

export function assertTraceSymbolChild(
  parent: BlueprintTraceNodeInput,
  function_: BlueprintTraceFunctionInput,
  edge: string,
  symbol: string,
): void {
  const child = findChild(parent, function_, edge);
  if (child.kind !== "variable" || child.symbol !== symbol) {
    throw new Error(
      `Blueprint trace symbol changed for ${edge} at statement ${parent.statementIndex}.`,
    );
  }
}

export function assertTraceLiteralChild(
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

export function assertTraceOpcodeChild(
  parent: BlueprintTraceNodeInput,
  function_: BlueprintTraceFunctionInput,
  edge: string,
  opcode: string,
): void {
  const child = findChild(parent, function_, edge);
  if (child.opcode !== opcode) {
    throw new Error(
      `Blueprint trace operation changed for ${edge} at statement ${parent.statementIndex}.`,
    );
  }
}

export function assertTraceNodeTree(function_: BlueprintTraceFunctionInput): void {
  for (const [index, node] of function_.nodes.entries()) {
    if (node.nodeIndex !== index) {
      throw new Error(`Blueprint trace node indexes changed in ${function_.functionName}.`);
    }
    if (node.parentNodeIndex === null) {
      if (node.depth !== 0 || !node.edge.startsWith("script[")) {
        throw new Error(`Blueprint trace root node changed in ${function_.functionName}.`);
      }
      continue;
    }
    const parent = function_.nodes[node.parentNodeIndex];
    if (parent === undefined || node.parentNodeIndex >= index || node.depth !== parent.depth + 1) {
      throw new Error(`Blueprint trace parent link changed in ${function_.functionName}.`);
    }
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
