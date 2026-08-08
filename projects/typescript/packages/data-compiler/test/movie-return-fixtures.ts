import type { MovieReturnArtifactIdentity } from "@neonretrorewind/core";

import type {
  BlueprintCallerBodiesArtifact,
  BlueprintCallSitesArtifact,
} from "../src/blueprint-caller-inputs.ts";
import type {
  BlueprintFunctionTraceArtifact,
  BlueprintTraceNodeInput,
} from "../src/blueprint-trace-inputs.ts";
import type { MovieReturnSources } from "../src/movie-return-mechanics.ts";
import {
  createBuild,
  createMappings,
  rentalSources,
  type Mutable,
} from "./rental-fixtures.ts";

export const callerPackagePath =
  "ExampleGame/Content/ExampleProject/core/ai/pawn/ExampleActor.uasset";
export const callerClassPath =
  "ExampleGame/Content/ExampleProject/core/ai/pawn/ExampleActor.ExampleActor_C";
export const callerFunction = "Initialize Example Return";
const callerFunctionPath = `${callerClassPath}:${callerFunction}`;
const selectionFunction = "Select Example Items";
const statementIndexes = [465, 519] as const;

const callSiteIdentity = createCallerIdentity(
  "blueprint-call-sites.movie-return.v1.json",
  "blueprint-call-sites",
  "e",
  200,
  1,
);
const callerBodyIdentity = createCallerIdentity(
  "blueprint-caller-bodies.movie-return.v1.json",
  "blueprint-caller-bodies",
  "f",
  300,
  1,
);
const functionTraceIdentity = createCallerIdentity(
  "blueprint-function-trace.movie-customer.v2.json",
  "blueprint-function-trace",
  "a",
  400,
  2,
);

export const movieReturnSources: MovieReturnSources = {
  ...rentalSources,
  blueprintCallSites: callSiteIdentity,
  blueprintCallerBodies: callerBodyIdentity,
  blueprintFunctionTrace: functionTraceIdentity,
};

export function createCallSites(): Mutable<BlueprintCallSitesArtifact> {
  const callSites = statementIndexes.map((statementIndex) => ({
    packagePath: callerPackagePath,
    className: "ExampleActor_C",
    classPath: callerClassPath,
    functionName: callerFunction,
    functionPath: callerFunctionPath,
    callKind: "local-virtual" as const,
    statementIndex,
  }));

  return {
    artifactType: "blueprint-call-sites",
    schemaVersion: 1,
    build: createBuild(),
    staticCensus: {
      fileName: "static-census.v1.json",
      sizeBytes: 100,
      sha256: "1".repeat(64),
      schemaVersion: 1,
    },
    mappings: createMappings(),
    target: { functionName: selectionFunction },
    candidateRule: "parsed-packages-with-function-exports",
    coverage: "complete",
    totals: {
      candidatePackageCount: 604,
      scannedPackageCount: 604,
      failedPackageCount: 0,
      classCount: 604,
      functionCount: 7527,
      callSiteCount: 2,
    },
    callSites,
    failures: [],
  };
}

export function createCallerBodies(): Mutable<BlueprintCallerBodiesArtifact> {
  const pseudoCode = [
    `    public void ${callerFunction}()`,
    "    {",
    "        Select Example Device(foundConsole, console);",
    "        if (!ExampleSymbol_f35fefb6cd59)",
    "            goto Label_399;",
    "        return;",
    "        Label_399:",
    `        ExampleSymbol_59b9daf98844->Actor Gatherer->ExampleQueueSystem->${selectionFunction}(foundMovies, movies);`,
    `        ref to Rent system->${selectionFunction}(foundMovies, movies);`,
    "        if (!ExampleSymbol_19b27f16b828)",
    "            return;",
    "        ExampleSymbol_5546bd5cfb37 = ExampleSymbol_701a289356d8.Length;",
    "        ExampleAddInventoryItem(current Cartridge in loop, false);",
    "        ref to Rent system->Remove Example Ready Item(current Cartridge in loop, removed);",
    "    }",
  ].join("\n");

  return {
    artifactType: "blueprint-caller-bodies",
    schemaVersion: 1,
    build: createBuild(),
    callSites: {
      fileName: callSiteIdentity.fileName,
      sizeBytes: callSiteIdentity.sizeBytes,
      sha256: callSiteIdentity.sha256,
      schemaVersion: 1,
    },
    mappings: createMappings(),
    target: { functionName: selectionFunction },
    totals: {
      packageCount: 1,
      classCount: 1,
      functionCount: 1,
      callSiteCount: 2,
      pseudoCodeCharacterCount: pseudoCode.length,
    },
    functions: [
      {
        packagePath: callerPackagePath,
        className: "ExampleActor_C",
        classPath: callerClassPath,
        functionName: callerFunction,
        functionPath: callerFunctionPath,
        flags: "FUNC_Public, FUNC_BlueprintCallable, FUNC_BlueprintEvent",
        bytecodeExpressionCount: 48,
        calls: statementIndexes.map((statementIndex) => ({
          callKind: "local-virtual" as const,
          statementIndex,
        })),
        pseudoCode,
      },
    ],
  };
}

export function createFunctionTrace(): Mutable<BlueprintFunctionTraceArtifact> {
  const functions = [
    createWrapperFunction("ExampleAttachContainer", "275"),
    createWrapperFunction("ExampleAttachChild", "246"),
    createEventGraphFunction(),
    createWrapperFunction("ExampleGeneratePreference", "191"),
    createCustomerFunction(),
    createWrapperFunction("ReceiveBeginPlay", "68", true),
    createWrapperFunction("ExampleUpdateContainerPhysics", "555"),
  ];
  const nodes = functions.flatMap((function_) => function_.nodes);

  return {
    artifactType: "blueprint-function-trace",
    schemaVersion: 2,
    build: createBuild(),
    callerBodies: [
      {
        fileName: "blueprint-caller-bodies.ai-client-ubergraph.v1.json",
        sizeBytes: 100,
        sha256: "7".repeat(64),
        schemaVersion: 1,
        targetFunctionName: "ExecuteExampleGraph_ExampleActor",
      },
      {
        fileName: "blueprint-caller-bodies.movie-customer-entry.v1.json",
        sizeBytes: 200,
        sha256: "8".repeat(64),
        schemaVersion: 1,
        targetFunctionName: callerFunction,
      },
      {
        fileName: callerBodyIdentity.fileName,
        sizeBytes: callerBodyIdentity.sizeBytes,
        sha256: callerBodyIdentity.sha256,
        schemaVersion: 1,
        targetFunctionName: selectionFunction,
      },
    ],
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
      entrypointCount: 5,
    },
    functions,
  };
}

function createWrapperFunction(
  functionName: string,
  entryPoint: string,
  includeReturn = false,
): Mutable<BlueprintFunctionTraceArtifact>["functions"][number] {
  const nodes = [
    callNode(0, 0, "ExecuteExampleGraph_ExampleActor", "local-final", 1, [
      { position: 0, value: entryPoint },
    ]),
  ];
  if (includeReturn) nodes.push(operationNode(1, 15, "EX_Return", "return"));
  return traceFunction(functionName, nodes);
}

function createEventGraphFunction(): Mutable<BlueprintFunctionTraceArtifact>["functions"][number] {
  const caseVisibility = callNode(
    1,
    10,
    "ExampleToggleContainer",
    "local-virtual",
    1,
  );
  const hiddenArgument = {
    ...operationNode(2, 23, "EX_False", "literal"),
    parentNodeIndex: 1,
    edge: "Parameters[0]",
    depth: 1,
    literal: { literalType: "boolean" as const, value: "false" },
  };
  return traceFunction("ExecuteExampleGraph_ExampleActor", [
    jumpNode(0, 0, "computed"),
    caseVisibility,
    hiddenArgument,
    callNode(3, 25, "ReceiveBeginPlay", "local-final", 0),
    callNode(4, 35, "ExampleGeneratePreference", "local-virtual", 0),
    callNode(5, 49, callerFunction, "local-virtual", 0),
    jumpNode(6, 68, "unconditional", "codeOffset", 10),
  ]);
}

function createCustomerFunction(): Mutable<BlueprintFunctionTraceArtifact>["functions"][number] {
  const nodes: Mutable<BlueprintTraceNodeInput>[] = [];
  const root = (node: Mutable<BlueprintTraceNodeInput>) => {
    node.nodeIndex = nodes.length;
    node.edge = `script[${nodes.filter((candidate) => candidate.parentNodeIndex === null).length}]`;
    nodes.push(node);
    return node;
  };
  const child = (
    parent: Mutable<BlueprintTraceNodeInput>,
    edge: string,
    statementIndex: number,
    symbol?: string,
    literal?: BlueprintTraceNodeInput["literal"],
  ) => {
    nodes.push({
      ...operationNode(nodes.length, statementIndex, symbol ? "EX_LocalVariable" : "EX_False", symbol ? "variable" : "literal"),
      parentNodeIndex: parent.nodeIndex,
      edge,
      depth: 1,
      symbol: symbol ?? null,
      literal: literal ?? null,
    });
  };

  root(jumpNode(0, 0, "push-flow", "pushingAddress", 1546));
  const consoleCall = root(callNode(0, 230, "Select Example Device", "local-virtual", 2));
  child(consoleCall, "Parameters[0]", 243, "ExampleSymbol_f35fefb6cd59");
  child(consoleCall, "Parameters[1]", 252, "ExampleSymbol_cffbb865eef0");
  const consoleBranch = root(jumpNode(0, 262, "conditional-false", "codeOffset", 399));
  child(consoleBranch, "BooleanExpression", 267, "ExampleSymbol_f35fefb6cd59");
  root(operationNode(0, 399, "EX_Context", "context"));
  for (const statementIndex of statementIndexes) {
    const selector = root(callNode(0, statementIndex, selectionFunction, "local-virtual", 2));
    child(selector, "Parameters[0]", statementIndex + 13, "ExampleSymbol_19b27f16b828");
    child(selector, "Parameters[1]", statementIndex + 22, "ExampleSymbol_701a289356d8");
  }
  const selectorFailure = root(jumpNode(0, 551, "pop-flow-if-false"));
  child(selectorFailure, "BooleanExpression", 552, "ExampleSymbol_19b27f16b828");
  root(operationNode(0, 607, "EX_Let", "assignment"));
  const arrayLength = root(callNode(0, 647, "Array_Length", "final", 1));
  child(arrayLength, "Parameters[0]", 656, "ExampleSymbol_701a289356d8");
  const lessThan = root(callNode(0, 676, "Less_IntInt", "final", 2));
  child(lessThan, "Parameters[0]", 685, "Temp_int_Loop_Counter_Variable");
  child(lessThan, "Parameters[1]", 694, "ExampleSymbol_5546bd5cfb37");
  const loopBranch = root(jumpNode(0, 704, "conditional-false", "codeOffset", 1456));
  child(loopBranch, "BooleanExpression", 709, "ExampleSymbol_ea1fd7e15884");
  const inventoryAdd = root(callNode(0, 941, "ExampleAddInventoryItem", "local-virtual", 2));
  child(inventoryAdd, "Parameters[0]", 954, "current Cartridge in loop");
  child(inventoryAdd, "Parameters[1]", 963, undefined, { literalType: "boolean", value: "false" });
  const readyRemoval = root(callNode(0, 987, "Remove Example Ready Item", "local-virtual", 2));
  child(readyRemoval, "Parameters[0]", 1000, "current Cartridge in loop");
  child(readyRemoval, "Parameters[1]", 1009, "ExampleSymbol_7c6219cf9182");
  const loopExit = root(callNode(0, 1456, "ExampleToggleBasket", "local-virtual", 1));
  child(loopExit, "Parameters[0]", 1469, undefined, { literalType: "boolean", value: "false" });
  root(jumpNode(0, 1541, "unconditional", "codeOffset", 607));
  root(operationNode(0, 1546, "EX_Return", "return"));
  return traceFunction(callerFunction, nodes);
}

function traceFunction(
  functionName: string,
  nodes: Mutable<BlueprintTraceNodeInput>[],
): Mutable<BlueprintFunctionTraceArtifact>["functions"][number] {
  return {
    packagePath: callerPackagePath,
    className: "ExampleActor_C",
    classPath: callerClassPath,
    functionName,
    functionPath: `${callerClassPath}:${functionName}`,
    flags: "FUNC_BlueprintCallable, FUNC_BlueprintEvent",
    bytecodeExpressionCount: nodes.filter((node) => node.parentNodeIndex === null).length,
    nodes,
  };
}

function operationNode(
  nodeIndex: number,
  statementIndex: number,
  opcode: string,
  kind: BlueprintTraceNodeInput["kind"],
): Mutable<BlueprintTraceNodeInput> {
  return {
    nodeIndex,
    parentNodeIndex: null,
    edge: `script[${nodeIndex}]`,
    depth: 0,
    statementIndex,
    opcode,
    kind,
    symbol: null,
    call: null,
    jump: null,
    literal: null,
  };
}

function callNode(
  nodeIndex: number,
  statementIndex: number,
  functionName: string,
  callKind: NonNullable<BlueprintTraceNodeInput["call"]>["callKind"],
  argumentCount: number,
  integerArguments: readonly { position: number; value: string }[] = [],
): Mutable<BlueprintTraceNodeInput> {
  return {
    ...operationNode(nodeIndex, statementIndex, "EX_LocalVirtualFunction", "call"),
    call: { callKind, functionName, argumentCount, integerArguments },
  };
}

function jumpNode(
  nodeIndex: number,
  statementIndex: number,
  jumpKind: NonNullable<BlueprintTraceNodeInput["jump"]>["jumpKind"],
  targetEdge?: string,
  targetOffset?: number,
): Mutable<BlueprintTraceNodeInput> {
  return {
    ...operationNode(nodeIndex, statementIndex, "EX_Jump", "branch"),
    jump: {
      jumpKind,
      targets: targetEdge === undefined ? [] : [{ edge: targetEdge, offset: targetOffset! }],
    },
  };
}

function createCallerIdentity<
  ArtifactType extends MovieReturnArtifactIdentity["artifactType"],
>(
  fileName: string,
  artifactType: ArtifactType,
  hashCharacter: string,
  sizeBytes: number,
  schemaVersion: MovieReturnArtifactIdentity<ArtifactType>["schemaVersion"],
): MovieReturnArtifactIdentity<ArtifactType> {
  return {
    fileName,
    sha256: hashCharacter.repeat(64),
    sizeBytes,
    artifactType,
    schemaVersion,
  };
}
