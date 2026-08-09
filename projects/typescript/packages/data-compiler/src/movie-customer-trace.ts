import type { BlueprintTraceEvidence } from "@neonretrorewind/core";

import type {
  BlueprintCallerBodiesArtifact,
  BlueprintCallSitesArtifact,
} from "./blueprint-caller-inputs.ts";
import type {
  BlueprintFunctionTraceArtifact,
} from "./blueprint-trace-inputs.ts";
import {
  assertTraceCall as assertCall,
  assertTraceJump as assertJump,
  assertTraceLiteralChild as assertLiteralChild,
  assertTraceNodeTree as assertNodeTree,
  assertTraceRootNode as assertRootNode,
  assertTraceSymbolChild as assertSymbolChild,
  findTraceCall as findCall,
  findTraceFunction,
} from "./blueprint-trace-assertions.ts";
import type { MovieReturnSources } from "./movie-return-mechanics.ts";
import type { RentalEvidenceArtifact } from "./rental-inputs.ts";

export const customerCallerClassName = "ExampleActor_C";
export const customerCallerFunctionName =
  "Initialize Example Return";

const packagePath =
  "ExampleGame/Content/ExampleProject/core/ai/pawn/ExampleActor.uasset";
const classPath =
  "ExampleGame/Content/ExampleProject/core/ai/pawn/ExampleActor.ExampleActor_C";
const customerFunctionPath = `${classPath}:${customerCallerFunctionName}`;
const eventGraphFunctionName = "ExecuteExampleGraph_ExampleActor";
const selectionFunctionName = "Select Example Items";
const selectorStatementIndexes = [465, 519] as const;
const consoleFoundSymbol =
  "ExampleSymbol_f35fefb6cd59";
const selectorFoundSymbol =
  "ExampleSymbol_19b27f16b828";
const selectorItemsSymbol =
  "ExampleSymbol_701a289356d8";
const loopCounterSymbol = "Temp_int_Loop_Counter_Variable";
const loopConditionSymbol = "ExampleSymbol_ea1fd7e15884";
const currentMovieSymbol = "current Cartridge in loop";

export function assertMovieCustomerTrace(
  rentalEvidence: RentalEvidenceArtifact,
  callSites: BlueprintCallSitesArtifact,
  callerBodies: BlueprintCallerBodiesArtifact,
  trace: BlueprintFunctionTraceArtifact,
  sources: MovieReturnSources,
): BlueprintTraceEvidence {
  assertInputIdentity(rentalEvidence, callSites, callerBodies, trace, sources);
  assertCallSiteCoverage(callSites);
  assertCallerBodyMetadata(callerBodies);
  assertTraceStructure(trace);

  const receiveBeginPlay = findTraceFunction(trace.functions, "ReceiveBeginPlay");
  const eventGraph = findTraceFunction(trace.functions, eventGraphFunctionName);
  const customer = findTraceFunction(trace.functions, customerCallerFunctionName);

  const entryCall = findCall(
    receiveBeginPlay,
    0,
    eventGraphFunctionName,
    "local-final",
    1,
  );
  if (
    entryCall.call?.argumentCount !== 1 ||
    JSON.stringify(entryCall.call.integerArguments) !==
      JSON.stringify([{ position: 0, value: "68" }])
  ) {
    throw new Error("Blueprint trace BeginPlay entry changed.");
  }
  assertRootNode(receiveBeginPlay, 15, "EX_Return");

  assertJump(eventGraph, 68, "unconditional", "codeOffset", 10);
  const caseVisibility = findCall(
    eventGraph,
    10,
    "ExampleToggleContainer",
    "local-virtual",
    1,
  );
  assertLiteralChild(caseVisibility, eventGraph, "Parameters[0]", "boolean", "false");
  assertCall(eventGraph, 25, "ReceiveBeginPlay", "local-final", 0);
  assertCall(eventGraph, 35, "ExampleGeneratePreference", "local-virtual", 0);
  assertCall(
    eventGraph,
    49,
    customerCallerFunctionName,
    "local-virtual",
    0,
  );
  if (
    eventGraph.nodes.some(
      (node) =>
        node.parentNodeIndex === null &&
        node.statementIndex >= 10 &&
        node.statementIndex < 49 &&
        node.jump !== null,
    )
  ) {
    throw new Error("Blueprint trace customer entry gained an intervening branch.");
  }

  assertCustomerControlFlow(customer);

  return {
    artifactType: "blueprint-function-trace",
    classPath,
    entryFunction: "ReceiveBeginPlay",
    entryPoint: 68,
    eventGraphFunction: eventGraphFunctionName,
    customerFunction: customerCallerFunctionName,
    statementIndexes: {
      eventGraphEntry: 68,
      customerCall: 49,
      consoleSelectionCall: 230,
      consoleFailureBranch: 262,
      consoleFailureTarget: 399,
      selectorCalls: selectorStatementIndexes,
      selectorFailureBranch: 551,
      loopHeader: 607,
      loopCondition: 704,
      inventoryAdd: 941,
      readyQueueRemoval: 987,
      loopExit: 1456,
      loopBack: 1541,
    },
  };
}

function assertCustomerControlFlow(
  customer: BlueprintFunctionTraceArtifact["functions"][number],
): void {
  assertJump(customer, 0, "push-flow", "pushingAddress", 1546);
  assertRootNode(customer, 1546, "EX_Return");

  const consoleCall = findCall(
    customer,
    230,
    "Select Example Device",
    "local-virtual",
    2,
  );
  assertSymbolChild(consoleCall, customer, "Parameters[0]", consoleFoundSymbol);
  const consoleFailure = assertJump(
    customer,
    262,
    "conditional-false",
    "codeOffset",
    399,
  );
  assertSymbolChild(consoleFailure, customer, "BooleanExpression", consoleFoundSymbol);
  assertRootNode(customer, 399, "EX_Context");

  for (const statementIndex of selectorStatementIndexes) {
    const selectorCall = findCall(
      customer,
      statementIndex,
      selectionFunctionName,
      "local-virtual",
      2,
    );
    assertSymbolChild(selectorCall, customer, "Parameters[0]", selectorFoundSymbol);
    assertSymbolChild(selectorCall, customer, "Parameters[1]", selectorItemsSymbol);
  }

  const selectorFailure = assertJump(
    customer,
    551,
    "pop-flow-if-false",
  );
  assertSymbolChild(selectorFailure, customer, "BooleanExpression", selectorFoundSymbol);

  assertRootNode(customer, 607, "EX_Let");
  const arrayLength = findCall(customer, 647, "Array_Length", "final", 1);
  assertSymbolChild(arrayLength, customer, "Parameters[0]", selectorItemsSymbol);
  const lessThan = findCall(customer, 676, "Less_IntInt", "final", 2);
  assertSymbolChild(lessThan, customer, "Parameters[0]", loopCounterSymbol);
  assertSymbolChild(lessThan, customer, "Parameters[1]", "ExampleSymbol_5546bd5cfb37");
  const loopCondition = assertJump(
    customer,
    704,
    "conditional-false",
    "codeOffset",
    1456,
  );
  assertSymbolChild(loopCondition, customer, "BooleanExpression", loopConditionSymbol);
  const loopExit = findCall(
    customer,
    1456,
    "ExampleToggleBasket",
    "local-virtual",
    1,
  );
  assertLiteralChild(loopExit, customer, "Parameters[0]", "boolean", "false");

  const inventoryAdd = findCall(
    customer,
    941,
    "ExampleAddInventoryItem",
    "local-virtual",
    2,
  );
  assertSymbolChild(inventoryAdd, customer, "Parameters[0]", currentMovieSymbol);
  assertLiteralChild(inventoryAdd, customer, "Parameters[1]", "boolean", "false");
  const readyRemoval = findCall(
    customer,
    987,
    "Remove Example Ready Item",
    "local-virtual",
    2,
  );
  assertSymbolChild(readyRemoval, customer, "Parameters[0]", currentMovieSymbol);
  assertJump(customer, 1541, "unconditional", "codeOffset", 607);
}

function assertInputIdentity(
  rentalEvidence: RentalEvidenceArtifact,
  callSites: BlueprintCallSitesArtifact,
  callerBodies: BlueprintCallerBodiesArtifact,
  trace: BlueprintFunctionTraceArtifact,
  sources: MovieReturnSources,
): void {
  if (
    callSites.artifactType !== "blueprint-call-sites" ||
    callerBodies.artifactType !== "blueprint-caller-bodies" ||
    trace.artifactType !== "blueprint-function-trace"
  ) {
    throw new Error("Expected the supported Blueprint acquisition artifacts.");
  }

  for (const [input, label] of [
    [callSites, "Blueprint call sites"],
    [callerBodies, "Blueprint caller bodies"],
    [trace, "Blueprint function trace"],
  ] as const) {
    assertSameBuild(rentalEvidence, input, label);
    assertSameMappings(rentalEvidence, input, label);
  }

  if (
    callerBodies.callSites.fileName !== sources.blueprintCallSites.fileName ||
    callerBodies.callSites.sizeBytes !== sources.blueprintCallSites.sizeBytes ||
    callerBodies.callSites.sha256 !== sources.blueprintCallSites.sha256 ||
    sources.blueprintCallSites.artifactType !== "blueprint-call-sites" ||
    sources.blueprintCallerBodies.artifactType !== "blueprint-caller-bodies" ||
    sources.blueprintFunctionTrace.artifactType !== "blueprint-function-trace"
  ) {
    throw new Error("Blueprint acquisition source identities do not match.");
  }

  const traceSources = [...trace.callerBodies].sort((left, right) =>
    left.fileName < right.fileName ? -1 : left.fileName > right.fileName ? 1 : 0,
  );
  const expectedTargets = [
    ["blueprint-caller-bodies.ai-client-ubergraph.json", eventGraphFunctionName],
    ["blueprint-caller-bodies.movie-customer-entry.json", customerCallerFunctionName],
    ["blueprint-caller-bodies.movie-return.json", selectionFunctionName],
  ] as const;
  if (
    traceSources.length !== expectedTargets.length ||
    traceSources.some(
      (source, index) =>
        source.fileName !== expectedTargets[index]?.[0] ||
        source.targetFunctionName !== expectedTargets[index]?.[1],
    )
  ) {
    throw new Error("Blueprint function trace source set changed.");
  }

  const selectionSource = traceSources[2];
  if (
    selectionSource?.fileName !== sources.blueprintCallerBodies.fileName ||
    selectionSource.sizeBytes !== sources.blueprintCallerBodies.sizeBytes ||
    selectionSource.sha256 !== sources.blueprintCallerBodies.sha256
  ) {
    throw new Error("Blueprint function trace does not reference the supplied caller bodies.");
  }
}

function assertCallSiteCoverage(callSites: BlueprintCallSitesArtifact): void {
  if (
    callSites.target.functionName !== selectionFunctionName ||
    callSites.candidateRule !== "parsed-packages-with-function-exports" ||
    callSites.coverage !== "complete" ||
    callSites.failures.length !== 0 ||
    callSites.totals.failedPackageCount !== 0 ||
    callSites.totals.candidatePackageCount !== callSites.totals.scannedPackageCount ||
    callSites.totals.callSiteCount !== callSites.callSites.length ||
    callSites.totals.callSiteCount !== 2
  ) {
    throw new Error("Movie selector call-site coverage changed.");
  }

  const expected = selectorStatementIndexes.map((statementIndex) => ({
    packagePath,
    className: customerCallerClassName,
    classPath,
    functionName: customerCallerFunctionName,
    functionPath: customerFunctionPath,
    callKind: "local-virtual" as const,
    statementIndex,
  }));
  if (JSON.stringify(callSites.callSites) !== JSON.stringify(expected)) {
    throw new Error("Movie selector call sites changed.");
  }
}

function assertCallerBodyMetadata(callerBodies: BlueprintCallerBodiesArtifact): void {
  if (
    callerBodies.target.functionName !== selectionFunctionName ||
    callerBodies.totals.packageCount !== 1 ||
    callerBodies.totals.classCount !== 1 ||
    callerBodies.totals.functionCount !== 1 ||
    callerBodies.totals.callSiteCount !== 2 ||
    callerBodies.functions.length !== 1
  ) {
    throw new Error("Movie selector caller-body metadata changed.");
  }

  const function_ = callerBodies.functions[0];
  if (
    function_?.packagePath !== packagePath ||
    function_.className !== customerCallerClassName ||
    function_.classPath !== classPath ||
    function_.functionName !== customerCallerFunctionName ||
    function_.functionPath !== customerFunctionPath ||
    JSON.stringify(function_.calls) !==
      JSON.stringify(
        selectorStatementIndexes.map((statementIndex) => ({
          callKind: "local-virtual",
          statementIndex,
        })),
      )
  ) {
    throw new Error("Movie selector caller-body function metadata changed.");
  }
}

function assertTraceStructure(trace: BlueprintFunctionTraceArtifact): void {
  const expectedNames = [
    "ExampleAttachContainer",
    "ExampleAttachChild",
    eventGraphFunctionName,
    "ExampleGeneratePreference",
    customerCallerFunctionName,
    "ReceiveBeginPlay",
    "ExampleUpdateContainerPhysics",
  ];
  if (
    trace.totals.packageCount !== 1 ||
    trace.totals.classCount !== 1 ||
    trace.totals.functionCount !== expectedNames.length ||
    trace.functions.length !== expectedNames.length ||
    JSON.stringify(trace.functions.map((function_) => function_.functionName)) !==
      JSON.stringify(expectedNames)
  ) {
    throw new Error("Blueprint function trace function set changed.");
  }

  const nodes = trace.functions.flatMap((function_) => {
    if (
      function_.packagePath !== packagePath ||
      function_.className !== customerCallerClassName ||
      function_.classPath !== classPath ||
      function_.functionPath !== `${classPath}:${function_.functionName}` ||
      function_.bytecodeExpressionCount <= 0 ||
      function_.nodes.length === 0
    ) {
      throw new Error("Blueprint function trace function identity changed.");
    }
    assertNodeTree(function_);
    return function_.nodes;
  });
  const entrypointCount = nodes.filter(
    (node) =>
      node.call?.functionName.startsWith("ExecuteExampleGraph_") === true &&
      node.call.argumentCount === 1 &&
      node.call.integerArguments.length === 1 &&
      node.call.integerArguments[0]?.position === 0,
  ).length;
  if (
    trace.totals.nodeCount !== nodes.length ||
    trace.totals.callCount !== nodes.filter((node) => node.call !== null).length ||
    trace.totals.branchCount !== nodes.filter((node) => node.jump !== null).length ||
    trace.totals.entrypointCount !== entrypointCount ||
    entrypointCount !== 5
  ) {
    throw new Error("Blueprint function trace totals changed.");
  }
}

function assertSameBuild(
  expected: RentalEvidenceArtifact,
  actual: BlueprintCallSitesArtifact | BlueprintCallerBodiesArtifact | BlueprintFunctionTraceArtifact,
  label: string,
): void {
  if (
    actual.build.manifestSha256 !== expected.build.manifestSha256 ||
    actual.build.steamAppId !== expected.build.steamAppId ||
    actual.build.steamBuildId !== expected.build.steamBuildId
  ) {
    throw new Error(`${label} does not belong to the rental-evidence build.`);
  }
}

function assertSameMappings(
  expected: RentalEvidenceArtifact,
  actual: BlueprintCallSitesArtifact | BlueprintCallerBodiesArtifact | BlueprintFunctionTraceArtifact,
  label: string,
): void {
  if (
    actual.mappings.fileName !== expected.mappings.fileName ||
    actual.mappings.sizeBytes !== expected.mappings.sizeBytes ||
    actual.mappings.sha256 !== expected.mappings.sha256 ||
    actual.mappings.formatVersion !== expected.mappings.formatVersion
  ) {
    throw new Error(`${label} does not use the rental-evidence mappings.`);
  }
}
