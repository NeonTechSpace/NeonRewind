import type {
  RentalReadinessTraceEvidence,
  RentalSelectionTraceEvidence,
} from "@neonretrorewind/core";

import {
  assertTraceCall,
  assertTraceJump,
  assertTraceLiteralChild,
  assertTraceNodeTree,
  assertTraceOpcodeChild,
  assertTraceRootNode,
  assertTraceSymbolChild,
  findTraceCall,
  findTraceFunction,
  findTraceNode,
} from "./blueprint-trace-assertions.ts";
import type {
  BlueprintTraceFunctionInput,
  BlueprintTraceNodeInput,
  RentalFunctionTraceArtifact,
} from "./blueprint-trace-inputs.ts";
import type { MovieReturnSources } from "./movie-return-mechanics.ts";
import type { RentalEvidenceArtifact } from "./rental-inputs.ts";

const packagePath =
  "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.uasset";
const className = "ExampleQueueSystem_C";
const classPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.ExampleQueueSystem_C";
const newDayFunction = "Example Period Event";
const readinessFunction = "Prepare Example Items";
const eventGraphFunction = "ExecuteExampleGraph_ExampleQueueSystem";
const selectionFunction = "Select Example Items";
const selectedList = "Example Selected Items";
const rentedQueue = "Example Active Items";
const readyQueue = "Example Ready Items";
const foundResult = "Find a product";
const itemsResult = "Item founded";

export interface MovieRentalTraceEvidence {
  readonly readiness: RentalReadinessTraceEvidence;
  readonly selection: RentalSelectionTraceEvidence;
}

export function assertMovieRentalTrace(
  rentalEvidence: RentalEvidenceArtifact,
  trace: RentalFunctionTraceArtifact,
  sources: MovieReturnSources,
): MovieRentalTraceEvidence {
  assertInputIdentity(rentalEvidence, trace, sources);
  assertTraceStructure(trace);

  const newDay = findTraceFunction(trace.functions, newDayFunction);
  const readiness = findTraceFunction(trace.functions, readinessFunction);
  const eventGraph = findTraceFunction(trace.functions, eventGraphFunction);
  const selection = findTraceFunction(trace.functions, selectionFunction);

  assertReadinessFlow(newDay, readiness, eventGraph);
  assertSelectionFlow(selection);

  return {
    readiness: {
      artifactType: "rental-function-trace",
      classPath,
      newDayFunction,
      readinessFunction,
      eventGraphFunction,
      statementIndexes: {
        newDayCall: 18,
        newDayEntry: 1792,
        movieReadinessCall: 1803,
        consoleReadinessCall: 1817,
        readinessCall: 0,
        readinessEntry: 2592,
        transfer: 1854,
        clearSource: 1904,
      },
    },
    selection: {
      artifactType: "rental-function-trace",
      classPath,
      functionName: selectionFunction,
      statementIndexes: {
        limitLength: 40,
        limitComparison: 69,
        limitBranch: 93,
        rentedLength: 190,
        rentedMinimum: 219,
        firstProbability: 290,
        selectedLength: 367,
        firstAttemptCondition: 396,
        additionalProbability: 467,
        weightedDecision: 543,
        weightedFailure: 562,
        candidateChoice: 598,
        candidateValidity: 645,
        missingCandidate: 669,
        selectedChoice: 705,
        addUnique: 782,
        retry: 810,
        resultLength: 855,
        resultCondition: 884,
        emptyResult: 908,
      },
    },
  };
}

function assertReadinessFlow(
  newDay: BlueprintTraceFunctionInput,
  readiness: BlueprintTraceFunctionInput,
  eventGraph: BlueprintTraceFunctionInput,
): void {
  assertEntrypoint(newDay, 18, 1792);
  assertTraceRootNode(newDay, 33, "EX_Return");
  assertEntrypoint(readiness, 0, 2592);
  assertTraceRootNode(readiness, 15, "EX_Return");

  const newDayState = findTraceNode(eventGraph, 1792);
  assertTraceRootNode(eventGraph, 1792, "EX_LetBool");
  assertTraceSymbolChild(
    newDayState,
    eventGraph,
    "Variable",
    "Simulated New Day Event when SaveGame is Load",
  );
  assertTraceLiteralChild(newDayState, eventGraph, "Assignment", "boolean", "true");
  assertTraceCall(eventGraph, 1803, readinessFunction, "local-virtual", 0);
  assertTraceCall(eventGraph, 1817, "Prepare Example Devices", "local-virtual", 0);
  assertTraceJump(eventGraph, 1831, "pop-flow");
  assertTraceJump(eventGraph, 2592, "unconditional", "codeOffset", 1832);

  assertTraceRootNode(eventGraph, 1832, "EX_Context");
  const transfer = findTraceCall(eventGraph, 1854, "Array_Append", "final", 2);
  assertTraceSymbolChild(transfer, eventGraph, "Parameters[0]", readyQueue);
  assertTraceSymbolChild(transfer, eventGraph, "Parameters[1]", rentedQueue);
  assertTraceRootNode(eventGraph, 1882, "EX_Context");
  const clear = findTraceCall(eventGraph, 1904, "Array_Clear", "final", 1);
  assertTraceSymbolChild(clear, eventGraph, "Parameters[0]", rentedQueue);

  if (
    eventGraph.nodes.some(
      (node) =>
        node.parentNodeIndex === null &&
        node.statementIndex >= 1792 &&
        node.statementIndex < 1831 &&
        node.jump !== null,
    ) ||
    eventGraph.nodes.some(
      (node) =>
        node.parentNodeIndex === null &&
        node.statementIndex >= 1832 &&
        node.statementIndex < 1923 &&
        node.jump !== null,
    )
  ) {
    throw new Error("Rental function trace readiness flow gained an intervening branch.");
  }
}

function assertSelectionFlow(selection: BlueprintTraceFunctionInput): void {
  const limitLength = findTraceCall(selection, 40, "Array_Length", "final", 1);
  assertTraceSymbolChild(limitLength, selection, "Parameters[0]", selectedList);
  const limitComparison = findTraceCall(selection, 69, "GreaterEqual_IntInt", "final", 2);
  assertTraceSymbolChild(
    limitComparison,
    selection,
    "Parameters[0]",
    "ExampleSymbol_be9a3b9c9802",
  );
  assertTraceLiteralChild(limitComparison, selection, "Parameters[1]", "integer", "4");
  const limitBranch = assertTraceJump(
    selection,
    93,
    "conditional-false",
    "codeOffset",
    150,
  );
  assertTraceSymbolChild(
    limitBranch,
    selection,
    "BooleanExpression",
    "ExampleSymbol_6f13bbd8ae3a",
  );
  assertBooleanAssignment(selection, 107, foundResult, "true");
  assertSymbolAssignment(selection, 118, itemsResult, selectedList);
  assertTraceJump(selection, 145, "unconditional", "codeOffset", 1056);

  const rentedLength = findTraceCall(selection, 190, "Array_Length", "final", 1);
  assertTraceSymbolChild(rentedLength, selection, "Parameters[0]", rentedQueue);
  const rentedMinimum = findTraceCall(selection, 219, "GreaterEqual_IntInt", "final", 2);
  assertTraceSymbolChild(
    rentedMinimum,
    selection,
    "Parameters[0]",
    "ExampleSymbol_5546bd5cfb37",
  );
  assertTraceLiteralChild(rentedMinimum, selection, "Parameters[1]", "integer", "3");
  assertCastAssignment(
    selection,
    243,
    "ExampleSymbol_203da61871cf",
    261,
    263,
    "Example Initial Weight",
  );
  const firstProbability = findTraceCall(selection, 290, "SelectFloat", "final", 3);
  assertTraceLiteralChild(firstProbability, selection, "Parameters[0]", "number", "0.95");
  assertTraceSymbolChild(
    firstProbability,
    selection,
    "Parameters[1]",
    "ExampleSymbol_203da61871cf",
  );
  assertTraceSymbolChild(
    firstProbability,
    selection,
    "Parameters[2]",
    "ExampleSymbol_bb52aec4341e",
  );

  const selectedLength = findTraceCall(selection, 367, "Array_Length", "final", 1);
  assertTraceSymbolChild(selectedLength, selection, "Parameters[0]", selectedList);
  const firstAttempt = findTraceCall(selection, 396, "LessEqual_IntInt", "final", 2);
  assertTraceSymbolChild(
    firstAttempt,
    selection,
    "Parameters[0]",
    "ExampleSymbol_f5d2e88dd6b7",
  );
  assertTraceLiteralChild(firstAttempt, selection, "Parameters[1]", "integer", "0");
  assertCastAssignment(
    selection,
    420,
    "ExampleSymbol_b1c3be1965a7",
    438,
    440,
    "Example Additional Weight",
  );
  const additionalProbability = findTraceCall(selection, 467, "SelectFloat", "final", 3);
  assertTraceSymbolChild(
    additionalProbability,
    selection,
    "Parameters[0]",
    "ExampleSymbol_5bd531b809d6",
  );
  assertTraceSymbolChild(
    additionalProbability,
    selection,
    "Parameters[1]",
    "ExampleSymbol_b1c3be1965a7",
  );
  assertTraceSymbolChild(
    additionalProbability,
    selection,
    "Parameters[2]",
    "ExampleSymbol_a3f5a084342d",
  );

  assertCastAssignment(
    selection,
    504,
    "ExampleSymbol_4e61d6d250fc",
    522,
    524,
    "ExampleSymbol_a648c3a2c8fa",
  );
  const weightedDecision = findTraceCall(
    selection,
    543,
    "RandomBoolWithWeight",
    "final",
    1,
  );
  assertTraceSymbolChild(
    weightedDecision,
    selection,
    "Parameters[0]",
    "ExampleSymbol_4e61d6d250fc",
  );
  const weightedFailure = assertTraceJump(
    selection,
    562,
    "conditional-false",
    "codeOffset",
    815,
  );
  assertTraceSymbolChild(
    weightedFailure,
    selection,
    "BooleanExpression",
    "ExampleSymbol_df2cd757b8a8",
  );

  assertCandidateChoice(selection, 598);
  const candidateValidity = findTraceCall(selection, 645, "NotEqual_IntInt", "final", 2);
  assertTraceSymbolChild(
    candidateValidity,
    selection,
    "Parameters[0]",
    "ExampleSymbol_0ab7d40dbb1d",
  );
  assertTraceLiteralChild(candidateValidity, selection, "Parameters[1]", "integer", "-1");
  const missingCandidate = assertTraceJump(
    selection,
    669,
    "conditional-false",
    "codeOffset",
    1013,
  );
  assertTraceSymbolChild(
    missingCandidate,
    selection,
    "BooleanExpression",
    "ExampleSymbol_78567b0964f3",
  );
  assertCandidateChoice(selection, 705);
  const addUnique = findTraceCall(selection, 782, "Array_AddUnique", "final", 2);
  assertTraceSymbolChild(addUnique, selection, "Parameters[0]", selectedList);
  assertTraceSymbolChild(
    addUnique,
    selection,
    "Parameters[1]",
    "ExampleSymbol_0e79e7bf84f2",
  );
  assertTraceJump(selection, 810, "unconditional", "codeOffset", 0);

  const resultLength = findTraceCall(selection, 855, "Array_Length", "final", 1);
  assertTraceSymbolChild(resultLength, selection, "Parameters[0]", selectedList);
  const resultCondition = findTraceCall(selection, 884, "Greater_IntInt", "final", 2);
  assertTraceSymbolChild(
    resultCondition,
    selection,
    "Parameters[0]",
    "ExampleSymbol_5b49cd8b7a54",
  );
  assertTraceLiteralChild(resultCondition, selection, "Parameters[1]", "integer", "0");
  const emptyResult = assertTraceJump(
    selection,
    908,
    "conditional-false",
    "codeOffset",
    965,
  );
  assertTraceSymbolChild(
    emptyResult,
    selection,
    "BooleanExpression",
    "ExampleSymbol_b752835dd3cc",
  );
  assertBooleanAssignment(selection, 922, foundResult, "true");
  assertSymbolAssignment(selection, 933, itemsResult, selectedList);
  assertTraceJump(selection, 960, "unconditional", "codeOffset", 1056);
  assertBooleanAssignment(selection, 965, foundResult, "false");
  assertEmptyArrayAssignment(selection, 976, itemsResult);
  assertTraceJump(selection, 1008, "unconditional", "codeOffset", 1056);
  assertBooleanAssignment(selection, 1013, foundResult, "false");
  assertEmptyArrayAssignment(selection, 1024, itemsResult);
  assertTraceRootNode(selection, 1056, "EX_Return");
}

function assertEntrypoint(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  entryPoint: number,
): void {
  const call = findTraceCall(
    function_,
    statementIndex,
    eventGraphFunction,
    "local-final",
    1,
  );
  if (
    JSON.stringify(call.call?.integerArguments) !==
    JSON.stringify([{ position: 0, value: String(entryPoint) }])
  ) {
    throw new Error(`Rental function trace entry changed at statement ${statementIndex}.`);
  }
}

function assertCandidateChoice(
  selection: BlueprintTraceFunctionInput,
  statementIndex: number,
): void {
  const choice = findTraceCall(selection, statementIndex, "Array_Random", "final", 3);
  assertTraceSymbolChild(choice, selection, "Parameters[0]", readyQueue);
  assertTraceSymbolChild(
    choice,
    selection,
    "Parameters[1]",
    "ExampleSymbol_0e79e7bf84f2",
  );
  assertTraceSymbolChild(
    choice,
    selection,
    "Parameters[2]",
    "ExampleSymbol_0ab7d40dbb1d",
  );
}

function assertBooleanAssignment(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  variable: string,
  value: "true" | "false",
): void {
  const assignment = findTraceNode(function_, statementIndex);
  assertTraceRootNode(function_, statementIndex, "EX_LetBool");
  assertTraceSymbolChild(assignment, function_, "Variable", variable);
  assertTraceLiteralChild(assignment, function_, "Assignment", "boolean", value);
}

function assertSymbolAssignment(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  variable: string,
  value: string,
): void {
  const assignment = findTraceNode(function_, statementIndex);
  assertTraceRootNode(function_, statementIndex, "EX_Let");
  assertTraceSymbolChild(assignment, function_, "Variable", variable);
  assertTraceSymbolChild(assignment, function_, "Assignment", value);
}

function assertEmptyArrayAssignment(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  variable: string,
): void {
  const assignment = findTraceNode(function_, statementIndex);
  assertTraceRootNode(function_, statementIndex, "EX_Let");
  assertTraceSymbolChild(assignment, function_, "Variable", variable);
  assertTraceOpcodeChild(assignment, function_, "Assignment", "EX_ArrayConst");
}

function assertCastAssignment(
  function_: BlueprintTraceFunctionInput,
  assignmentStatementIndex: number,
  assignmentSymbol: string,
  castStatementIndex: number,
  targetStatementIndex: number,
  symbol: string,
): void {
  assertTraceRootNode(function_, assignmentStatementIndex, "EX_Let");
  const assignment = findTraceNode(function_, assignmentStatementIndex);
  assertTraceSymbolChild(assignment, function_, "Variable", assignmentSymbol);
  assertTraceOpcodeChild(assignment, function_, "Assignment", "EX_Cast");
  const cast = findTraceNode(function_, castStatementIndex);
  const target = findTraceNode(function_, targetStatementIndex);
  if (
    cast.parentNodeIndex !== assignment.nodeIndex ||
    cast.edge !== "Assignment" ||
    target.parentNodeIndex !== cast.nodeIndex ||
    target.edge !== "Target" ||
    target.symbol !== symbol
  ) {
    throw new Error(`Rental function trace cast changed at statement ${castStatementIndex}.`);
  }
}

function assertInputIdentity(
  rentalEvidence: RentalEvidenceArtifact,
  trace: RentalFunctionTraceArtifact,
  sources: MovieReturnSources,
): void {
  if (trace.artifactType !== "rental-function-trace") {
    throw new Error("Expected a rental-function-trace artifact.");
  }
  if (
    trace.build.manifestSha256 !== rentalEvidence.build.manifestSha256 ||
    trace.build.steamAppId !== rentalEvidence.build.steamAppId ||
    trace.build.steamBuildId !== rentalEvidence.build.steamBuildId ||
    trace.mappings.fileName !== rentalEvidence.mappings.fileName ||
    trace.mappings.sizeBytes !== rentalEvidence.mappings.sizeBytes ||
    trace.mappings.sha256 !== rentalEvidence.mappings.sha256 ||
    trace.mappings.formatVersion !== rentalEvidence.mappings.formatVersion
  ) {
    throw new Error("Rental function trace does not use the rental-evidence build and mappings.");
  }
  if (
    trace.rentalBlueprintBodies.fileName !== sources.rentalBlueprintBodies.fileName ||
    trace.rentalBlueprintBodies.sizeBytes !== sources.rentalBlueprintBodies.sizeBytes ||
    trace.rentalBlueprintBodies.sha256 !== sources.rentalBlueprintBodies.sha256 ||
    sources.rentalFunctionTrace.artifactType !== "rental-function-trace"
  ) {
    throw new Error("Rental function trace does not reference the supplied rental Blueprint bodies.");
  }
}

function assertTraceStructure(trace: RentalFunctionTraceArtifact): void {
  const expected = [
    [eventGraphFunction, 108],
    [readinessFunction, 3],
    [selectionFunction, 36],
    [newDayFunction, 4],
  ] as const;
  const expectedPaths = expected.map(([name]) => `${classPath}:${name}`);
  if (
    JSON.stringify(trace.requestedFunctionPaths) !== JSON.stringify(expectedPaths) ||
    trace.functions.length !== expected.length ||
    JSON.stringify(trace.functions.map((function_) => function_.functionName)) !==
      JSON.stringify(expected.map(([name]) => name))
  ) {
    throw new Error("Rental function trace function set changed.");
  }

  const nodes = trace.functions.flatMap((function_, index) => {
    if (
      function_.packagePath !== packagePath ||
      function_.className !== className ||
      function_.classPath !== classPath ||
      function_.functionPath !== `${classPath}:${function_.functionName}` ||
      function_.bytecodeExpressionCount !== expected[index]?.[1] ||
      function_.nodes.length === 0
    ) {
      throw new Error("Rental function trace function identity changed.");
    }
    assertTraceNodeTree(function_);
    return function_.nodes;
  });
  const entrypointCount = nodes.filter(
    (node) =>
      node.call?.functionName === eventGraphFunction &&
      node.call.argumentCount === 1 &&
      node.call.integerArguments.length === 1 &&
      node.call.integerArguments[0]?.position === 0,
  ).length;
  if (
    trace.totals.packageCount !== 1 ||
    trace.totals.classCount !== 1 ||
    trace.totals.functionCount !== expected.length ||
    trace.totals.nodeCount !== nodes.length ||
    trace.totals.callCount !== nodes.filter((node) => node.call !== null).length ||
    trace.totals.branchCount !== nodes.filter((node) => node.jump !== null).length ||
    trace.totals.entrypointCount !== entrypointCount ||
    entrypointCount !== 2
  ) {
    throw new Error("Rental function trace totals changed.");
  }
}
