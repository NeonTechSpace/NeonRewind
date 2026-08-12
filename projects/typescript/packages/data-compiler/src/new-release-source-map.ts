import type { NewReleaseMechanics } from "@neonretrorewind/core";

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
import {
  assertMarketEntrypoints,
  assertSourceMapRestore,
  assertSourceMapScope,
} from "./new-release-source-map-input.ts";

const marketClassPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C";
const eventGraphFunctionName = "ExecuteExampleGraph_ExampleManager";
const generationFunctionName = "ExampleGenerateRecord";
const dataTableObjectPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/data/ExampleScheduleTable.ExampleScheduleTable";
const sourceMapSymbol = "Example Source Map";
const posterMapSymbol = "Example Poster Map";
const productSkuSymbol = "ExampleField15_0_00000000000000000000000000000000";

export function compileNewReleaseSourceMapLifecycle(
  marketEntryTrace: BlueprintFunctionTraceArtifact,
  sourceMapTrace: BlueprintPropertyReferenceTraceArtifact,
): NewReleaseMechanics["sourceMapLifecycle"] {
  assertMarketEntrypoints(marketEntryTrace);
  assertSourceMapScope(sourceMapTrace);

  const eventGraph = findTraceFunction(
    sourceMapTrace.functions,
    eventGraphFunctionName,
  );
  const generation = findTraceFunction(
    sourceMapTrace.functions,
    generationFunctionName,
  );
  assertTraceNodeTree(eventGraph);
  assertTraceNodeTree(generation);
  assertSourceMapRestore(eventGraph);
  assertGeneration(generation);
  assertCleanup(generation);

  return {
    collection: sourceMapSymbol,
    posterCollection: posterMapSymbol,
    restore: {
      trigger: "load",
      source: "Example Save Source Map",
      effect: "replace-source-map",
    },
    generation: {
      trigger: "generate-new-released-movie",
      dataTableObjectPath,
      rowDiscovery: "data-table-row-names",
      rowLookup: "data-table-row-by-name",
      unlockPool: "rows-with-genre-present-in-movie-genres-unlock",
      selection: "random-unlock-pool-item",
      duplicateHandling: "remove-selected-item-and-retry",
      additions: {
        sourceMap: "selected-film-product-sku-to-new-release-film",
        posterMap: "selected-film-product-sku-to-new-release-film",
      },
    },
    cleanup: {
      iteration: "source-map-values",
      condition: "second-hand-available",
      removalKey: "iterated-value-product-sku",
    },
    evidence: {
      kind: "kismet-analysis",
      confidence: "direct",
      classPath: marketClassPath,
      loadFunction: "ExampleLoad",
      eventGraphFunction: eventGraphFunctionName,
      generationFunction: generationFunctionName,
      statementIndexes: {
        loadWrapperCall: 18,
        restoreAssignment: 2886,
        dataTableAssignment: 5,
        rowNames: 535,
        rowLookup: 843,
        genreLookup: 930,
        addUnlockPool: 3559,
        randomPoolItem: 1241,
        findExisting: 1337,
        duplicateBranch: 1383,
        removeDuplicateFromPool: 1429,
        addSourceMap: 2129,
        addPosterMap: 2842,
        enumerateSourceValues: 2978,
        secondHandBranch: 3254,
        removeSecondHand: 3364,
        cleanupLoopBack: 3498,
      },
    },
  };
}

function assertGeneration(generation: BlueprintTraceFunctionInput): void {
  assertTraceRootNode(generation, 5, "EX_LetObj");
  const tableAssignment = findTraceNode(generation, 5);
  assertNode(
    generation,
    6,
    tableAssignment,
    "Variable",
    "variable",
    "new Release Data table",
  );
  assertObjectPath(generation, 15, tableAssignment, "Assignment", dataTableObjectPath);

  const rowNames = findTraceCall(
    generation,
    535,
    "GetDataTableRowNames",
    "final",
    2,
  );
  assertNode(
    generation,
    544,
    rowNames,
    "Parameters[0]",
    "variable",
    "new Release Data table",
  );
  assertNode(
    generation,
    553,
    rowNames,
    "Parameters[1]",
    "variable",
    "ExampleSymbol_db9f9613b85f",
  );

  const rowLookup = findTraceCall(
    generation,
    843,
    "GetDataTableRowFromName",
    "final",
    3,
  );
  assertObjectPath(generation, 852, rowLookup, "Parameters[0]", dataTableObjectPath);
  assertNode(
    generation,
    861,
    rowLookup,
    "Parameters[1]",
    "variable",
    "ExampleSymbol_38f1ea380eae",
  );
  assertNode(
    generation,
    870,
    rowLookup,
    "Parameters[2]",
    "variable",
    "ExampleSymbol_b0106fce9ba0",
  );

  const genreLookup = findTraceCall(
    generation,
    930,
    "Array_Find",
    "final",
    2,
  );
  const unlockedGenres = findTraceNode(generation, 939);
  assertParent(unlockedGenres, genreLookup, "Parameters[0]");
  if (unlockedGenres.symbol !== "Example Enabled Categories") {
    throw new Error("New-release genre collection changed.");
  }
  assertNode(
    generation,
    961,
    unlockedGenres,
    "ContextExpression",
    "variable",
    "Example Enabled Categories",
  );
  const genre = findTraceNode(generation, 970);
  assertParent(genre, genreLookup, "Parameters[1]");
  if (genre.symbol !== "ExampleField08_0_00000000000000000000000000000000") {
    throw new Error("New-release source row genre changed.");
  }
  assertNode(
    generation,
    979,
    genre,
    "StructExpression",
    "variable",
    "ExampleSymbol_b0106fce9ba0",
  );
  const missingGenre = findTraceCall(
    generation,
    999,
    "EqualEqual_IntInt",
    "final",
    2,
  );
  assertLiteral(generation, 1017, missingGenre, "Parameters[1]", "integer", "-1");
  const genreBranch = assertTraceJump(
    generation,
    1023,
    "conditional-false",
    "codeOffset",
    3519,
  );
  assertNode(
    generation,
    1028,
    genreBranch,
    "BooleanExpression",
    "variable",
    "ExampleSymbol_df2629fe7327",
  );
  assertTraceRootNode(generation, 3519, "EX_Let");
  const addUnlockPoolAssignment = findTraceNode(generation, 3519);
  if (
    addUnlockPoolAssignment.kind !== "assignment" ||
    addUnlockPoolAssignment.symbol !== "ExampleSymbol_560edd151976"
  ) {
    throw new Error("New-release unlock-pool assignment changed.");
  }
  const addUnlockPoolContext = assertNode(
    generation,
    3537,
    addUnlockPoolAssignment,
    "Assignment",
    "context",
    "ExampleSymbol_560edd151976",
  );
  const addUnlockPool = findTraceCall(
    generation,
    3559,
    "Array_Add",
    "final",
    2,
  );
  assertParent(addUnlockPool, addUnlockPoolContext, "ContextExpression");
  assertNode(
    generation,
    3568,
    addUnlockPool,
    "Parameters[0]",
    "variable",
    "ExampleAddCandidate",
  );
  assertNode(
    generation,
    3577,
    addUnlockPool,
    "Parameters[1]",
    "variable",
    "ExampleSymbol_b0106fce9ba0",
  );

  const randomPoolItem = findTraceCall(
    generation,
    1241,
    "Array_Random",
    "final",
    3,
  );
  assertNode(
    generation,
    1250,
    randomPoolItem,
    "Parameters[0]",
    "variable",
    "ExampleAddCandidate",
  );

  const findExisting = findTraceCall(generation, 1337, "Map_Find", "final", 3);
  assertNode(
    generation,
    1346,
    findExisting,
    "Parameters[0]",
    "variable",
    sourceMapSymbol,
  );
  assertSelectedFilmSku(generation, findExisting, 1355, 1364);
  assertTraceJump(generation, 1383, "conditional-false", "codeOffset", 1462);
  const removeDuplicate = findTraceCall(
    generation,
    1429,
    "Array_RemoveItem",
    "final",
    2,
  );
  assertNode(
    generation,
    1438,
    removeDuplicate,
    "Parameters[0]",
    "variable",
    "ExampleAddCandidate",
  );
  assertNode(
    generation,
    1447,
    removeDuplicate,
    "Parameters[1]",
    "variable",
    "ExampleCurrentCandidate",
  );
  assertTraceJump(generation, 1457, "unconditional", "codeOffset", 1112);

  assertMapAdd(generation, 2129, 2138, 2147, 2156, 2165, sourceMapSymbol);
  assertMapAdd(generation, 2842, 2851, 2860, 2869, 2878, posterMapSymbol);
}

function assertCleanup(generation: BlueprintTraceFunctionInput): void {
  const values = findTraceCall(generation, 2978, "Map_Values", "final", 2);
  assertNode(
    generation,
    2987,
    values,
    "Parameters[0]",
    "variable",
    sourceMapSymbol,
  );
  assertNode(
    generation,
    2996,
    values,
    "Parameters[1]",
    "variable",
    "ExampleSymbol_5c9e16b9b19d",
  );

  const secondHandBranch = assertTraceJump(
    generation,
    3254,
    "pop-flow-if-false",
  );
  const secondHand = findTraceNode(generation, 3255);
  assertParent(secondHand, secondHandBranch, "BooleanExpression");
  if (
    secondHand.symbol !==
      "ExampleField14_0_00000000000000000000000000000000"
  ) {
    throw new Error("New-release source-map cleanup condition changed.");
  }

  const remove = findTraceCall(generation, 3364, "Map_Remove", "final", 2);
  assertNode(
    generation,
    3373,
    remove,
    "Parameters[0]",
    "variable",
    sourceMapSymbol,
  );
  const sku = findTraceNode(generation, 3382);
  assertParent(sku, remove, "Parameters[1]");
  if (sku.symbol !== productSkuSymbol) {
    throw new Error("New-release source-map removal key changed.");
  }
  const boxData = assertNestedContext(
    generation,
    3391,
    sku,
    "ExampleField03_0_00000000000000000000000000000000",
  );
  const baseStructure = assertNestedContext(
    generation,
    3400,
    boxData,
    "ExampleField02_0_00000000000000000000000000000000",
  );
  const product = assertNestedContext(
    generation,
    3409,
    baseStructure,
    "ExampleField11_0_00000000000000000000000000000000",
  );
  assertNode(
    generation,
    3418,
    product,
    "StructExpression",
    "variable",
    "ExampleSymbol_4bb2d3edf81f",
  );
  assertTraceJump(generation, 3498, "unconditional", "codeOffset", 3052);
}

function assertNestedContext(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  parent: BlueprintTraceNodeInput,
  symbol: string,
): BlueprintTraceNodeInput {
  return assertNode(
    function_,
    statementIndex,
    parent,
    "StructExpression",
    "context",
    symbol,
  );
}

function assertMapAdd(
  function_: BlueprintTraceFunctionInput,
  callStatement: number,
  mapStatement: number,
  skuStatement: number,
  filmStatement: number,
  valueStatement: number,
  collection: string,
): void {
  const add = findTraceCall(function_, callStatement, "Map_Add", "final", 3);
  assertNode(function_, mapStatement, add, "Parameters[0]", "variable", collection);
  assertSelectedFilmSku(function_, add, skuStatement, filmStatement);
  assertNode(
    function_,
    valueStatement,
    add,
    "Parameters[2]",
    "variable",
    "ExampleSymbol_5ac47990d176 Input Record",
  );
}

function assertSelectedFilmSku(
  function_: BlueprintTraceFunctionInput,
  parent: BlueprintTraceNodeInput,
  skuStatement: number,
  filmStatement: number,
): void {
  const sku = findTraceNode(function_, skuStatement);
  assertParent(sku, parent, "Parameters[1]");
  if (sku.symbol !== productSkuSymbol) {
    throw new Error("New-release selected film SKU changed.");
  }
  assertNode(
    function_,
    filmStatement,
    sku,
    "StructExpression",
    "variable",
    "ExampleCurrentCandidate",
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
  assertParent(node, parent, edge);
  if (node.kind !== kind || node.symbol !== symbol) {
    throw new Error(`New-release source-map node changed at statement ${statementIndex}.`);
  }
  return node;
}

function assertObjectPath(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  parent: BlueprintTraceNodeInput,
  edge: string,
  path: string,
): void {
  const node = findTraceNode(function_, statementIndex);
  assertParent(node, parent, edge);
  if (
    node.opcode !== "EX_ObjectConst" ||
    node.literal?.literalType !== "object" ||
    node.literal.value !== path
  ) {
    throw new Error(`New-release object identity changed at statement ${statementIndex}.`);
  }
}

function assertLiteral(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  parent: BlueprintTraceNodeInput,
  edge: string,
  literalType: NonNullable<BlueprintTraceNodeInput["literal"]>["literalType"],
  value: string,
): void {
  const node = findTraceNode(function_, statementIndex);
  assertParent(node, parent, edge);
  if (node.literal?.literalType !== literalType || node.literal.value !== value) {
    throw new Error(`New-release literal changed at statement ${statementIndex}.`);
  }
}

function assertParent(
  node: BlueprintTraceNodeInput,
  parent: BlueprintTraceNodeInput,
  edge: string,
): void {
  if (node.parentNodeIndex !== parent.nodeIndex || node.edge !== edge) {
    throw new Error(`New-release source-map edge changed at statement ${node.statementIndex}.`);
  }
}
