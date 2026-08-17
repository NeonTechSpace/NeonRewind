import assert from "node:assert/strict";
import test from "node:test";

import { BlueprintSelectedFunctionTraceSchema } from "@neonretrorewind/core";

test("accepts an exact selected-function trace with derived totals", () => {
  const artifact = createArtifact();

  assert.deepEqual(BlueprintSelectedFunctionTraceSchema.assert(artifact), artifact);
});

test("accepts a selected function from a cooked map package", () => {
  const artifact = createArtifact();
  const [functionTrace] = artifact.functions;
  assert.ok(functionTrace);
  functionTrace.packagePath = "ExampleGame/Content/ExampleLevel.umap";

  assert.deepEqual(BlueprintSelectedFunctionTraceSchema.assert(artifact), artifact);
});

test("rejects a function that was not requested", () => {
  const artifact = createArtifact();
  artifact.requestedFunctionPaths[0] = "ExampleAsset_C:Another Function";

  assert.throws(() => BlueprintSelectedFunctionTraceSchema.assert(artifact));
});

test("rejects totals that do not match the typed trace", () => {
  const artifact = createArtifact();
  artifact.totals.callCount = 1;

  assert.throws(() => BlueprintSelectedFunctionTraceSchema.assert(artifact));
});

test("rejects a selection rule that does not require an exact inventory path", () => {
  const artifact = createArtifact();
  (artifact as { selectionRule: string }).selectionRule = "function-name-contains";

  assert.throws(() => BlueprintSelectedFunctionTraceSchema.assert(artifact));
});

function createArtifact() {
  return {
    artifactType: "blueprint-selected-function-trace" as const,
    build: {
      manifestSha256: "a".repeat(64),
      steamAppId: "3552140",
      steamBuildId: "23896268",
    },
    functionInventory: {
      fileName: "blueprint-function-inventory.json",
      sizeBytes: 100,
      sha256: "b".repeat(64),
      artifactType: "blueprint-function-inventory" as const,
      inventoryRule: "all-raw-function-exports" as const,
    },
    selectionRule: "exact-inventory-function-path" as const,
    requestedFunctionPaths: ["ExampleAsset_C:Calculate Example Value"],
    mappings: {
      fileName: "mappings.usmap",
      sizeBytes: 100,
      sha256: "c".repeat(64),
      formatVersion: 4 as const,
    },
    engine: {
      version: "5.4" as const,
      cue4ParseProfile: "GAME_UE5_4" as const,
      source: "configured" as const,
      confidence: "probable" as const,
    },
    extractor: {
      name: "NeonRetroRewind.StaticExtractor" as const,
      version: "0.0.11",
      cue4ParseVersion: "fixture",
    },
    totals: {
      packageCount: 1,
      classCount: 1,
      functionCount: 1,
      nodeCount: 1,
      callCount: 0,
      branchCount: 0,
      entrypointCount: 0,
    },
    functions: [
      {
        packagePath: "ExampleGame/Content/ExampleAsset.uasset",
        className: "ExampleAsset_C",
        classPath: "ExampleAsset_C",
        functionName: "Calculate Example Value",
        functionPath: "ExampleAsset_C:Calculate Example Value",
        flags: "Final, Public",
        bytecodeExpressionCount: 1,
        nodes: [
          {
            nodeIndex: 0,
            parentNodeIndex: null,
            edge: "Root",
            depth: 0,
            statementIndex: 0,
            opcode: "EX_Return",
            kind: "return" as const,
            symbol: null,
            call: null,
            jump: null,
            literal: null,
          },
        ],
      },
    ],
  };
}
