import {
  assertTraceJump,
  assertTraceNodeTree,
  assertTraceRootNode,
  findTraceCall,
  findTraceFunction,
  findTraceNode,
} from "./blueprint-trace-assertions.ts";
import type {
  BlueprintFunctionTraceArtifact,
  BlueprintPropertyReferenceTraceArtifact,
  BlueprintTraceFunctionInput,
  BlueprintTraceNodeInput,
} from "./blueprint-trace-inputs.ts";

const marketClassPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C";
const eventGraphFunctionName = "ExecuteExampleGraph_ExampleManager";
const generationFunctionName = "ExampleGenerateRecord";
const sourceMapSymbol = "Example Source Map";

const expectedMarketEntrypoints = new Map([
  ["Bind Actors", "4334"],
  ["ExampleCreatePeriodEvent", "2587"],
  ["Generate Example Manager State", "2617"],
  ["ExampleLoad", "2622"],
  ["ReceiveBeginPlay", "2388"],
  ["Save", "3539"],
]);

export function assertMarketEntrypoints(
  trace: BlueprintFunctionTraceArtifact,
): void {
  if (
    trace.artifactType !== "blueprint-function-trace" ||
    trace.callerBodies.length !== 1 ||
    trace.callerBodies[0]?.targetFunctionName !== eventGraphFunctionName ||
    trace.functions.length !== expectedMarketEntrypoints.size
  ) {
    throw new Error("Market entry trace scope changed.");
  }

  for (const [functionName, entryPoint] of expectedMarketEntrypoints) {
    const function_ = findTraceFunction(trace.functions, functionName);
    if (function_.functionPath !== `${marketClassPath}:${functionName}`) {
      throw new Error(`Market entry function identity changed: ${functionName}.`);
    }
    assertTraceNodeTree(function_);
    const calls = function_.nodes.filter(
      (node) => node.call?.functionName === eventGraphFunctionName,
    );
    if (
      calls.length !== 1 ||
      calls[0]?.call?.callKind !== "local-final" ||
      calls[0].call.argumentCount !== 1 ||
      JSON.stringify(calls[0].call.integerArguments) !==
        JSON.stringify([{ position: 0, value: entryPoint }])
    ) {
      throw new Error(`Market entrypoint changed: ${functionName}.`);
    }
  }

  const loadCall = findTraceCall(
    findTraceFunction(trace.functions, "ExampleLoad"),
    18,
    eventGraphFunctionName,
    "local-final",
    1,
  );
  if (loadCall.call?.integerArguments[0]?.value !== "2622") {
    throw new Error("Market load entrypoint changed.");
  }
}

export function assertSourceMapScope(
  trace: BlueprintPropertyReferenceTraceArtifact,
): void {
  const expectedPaths = [
    `${marketClassPath}:${eventGraphFunctionName}`,
    `${marketClassPath}:${generationFunctionName}`,
  ];
  if (
    trace.artifactType !== "blueprint-property-reference-trace" ||
    trace.blueprintPropertyReferences.targetPropertyName !== sourceMapSymbol ||
    trace.selectionRule !== "explicit-functions-with-read-references" ||
    JSON.stringify(trace.requestedFunctionPaths) !== JSON.stringify(expectedPaths) ||
    trace.functions.length !== expectedPaths.length
  ) {
    throw new Error("New-release source-map trace scope changed.");
  }
}

export function assertSourceMapRestore(
  eventGraph: BlueprintTraceFunctionInput,
): void {
  assertTraceJump(eventGraph, 2622, "push-flow", "pushingAddress", 3307);
  assertTraceRootNode(eventGraph, 2886, "EX_Let");
  const assignment = findTraceNode(eventGraph, 2886);
  if (assignment.kind !== "assignment" || assignment.symbol !== sourceMapSymbol) {
    throw new Error("New-release source-map restore assignment changed.");
  }
  assertNode(eventGraph, 2895, assignment, "Variable", "variable", sourceMapSymbol);
  const savedMap = assertNode(
    eventGraph,
    2904,
    assignment,
    "Assignment",
    "context",
    "ExampleField10_0_00000000000000000000000000000000",
  );
  const market = assertNode(
    eventGraph,
    2913,
    savedMap,
    "StructExpression",
    "context",
    "Example Manager",
  );
  assertNode(
    eventGraph,
    2914,
    market,
    "ObjectExpression",
    "variable",
    "ExampleSymbol_37c2ed4f4d9d",
  );
  assertNode(
    eventGraph,
    2935,
    market,
    "ContextExpression",
    "variable",
    "Example Manager",
  );
}

function assertNode(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  parent: BlueprintTraceNodeInput,
  edge: string,
  kind: BlueprintTraceNodeInput["kind"],
  symbol: string,
): BlueprintTraceNodeInput {
  const node = findTraceNode(function_, statementIndex);
  if (
    node.parentNodeIndex !== parent.nodeIndex ||
    node.edge !== edge ||
    node.kind !== kind ||
    node.symbol !== symbol
  ) {
    throw new Error(`New-release source-map node changed at statement ${statementIndex}.`);
  }
  return node;
}
