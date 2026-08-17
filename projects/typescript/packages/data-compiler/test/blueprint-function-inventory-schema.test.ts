import assert from "node:assert/strict";
import test from "node:test";

import { BlueprintFunctionInventorySchema } from "@neonretrorewind/core";

test("accepts a complete inventory whose totals match its functions", () => {
  const artifact = createArtifact();

  assert.deepEqual(BlueprintFunctionInventorySchema.assert(artifact), artifact);
});

test("accepts a Blueprint function declared in a cooked map package", () => {
  const artifact = createArtifact();
  const [functionDeclaration] = artifact.functions;
  assert.ok(functionDeclaration);
  functionDeclaration.packagePath = "ExampleGame/Content/ExampleLevel.umap";

  assert.deepEqual(BlueprintFunctionInventorySchema.assert(artifact), artifact);
});

test("rejects an inventory that did not retain every raw function", () => {
  const artifact = createArtifact();
  artifact.totals.inventoriedFunctionCount = 0;

  assert.throws(() => BlueprintFunctionInventorySchema.assert(artifact));
});

test("rejects a partial inventory without its package failure", () => {
  const artifact = createArtifact();
  (artifact as { coverage: string }).coverage = "partial";
  artifact.totals.scannedPackageCount = 0;
  artifact.totals.failedPackageCount = 1;

  assert.throws(() => BlueprintFunctionInventorySchema.assert(artifact));
});

test("rejects a filtered inventory rule", () => {
  const artifact = createArtifact();
  (artifact as { inventoryRule: string }).inventoryRule = "name-contains-income";

  assert.throws(() => BlueprintFunctionInventorySchema.assert(artifact));
});

function createArtifact() {
  return {
    artifactType: "blueprint-function-inventory" as const,
    build: {
      manifestSha256: "a".repeat(64),
      steamAppId: "3552140",
      steamBuildId: "23896268",
    },
    staticCensus: {
      fileName: "static-census.v1.json",
      sizeBytes: 100,
      sha256: "b".repeat(64),
    },
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
      version: "0.0.10",
      cue4ParseVersion: "fixture",
    },
    candidateRule: "parsed-packages-with-function-exports" as const,
    inventoryRule: "all-raw-function-exports" as const,
    coverage: "complete" as const,
    totals: {
      candidatePackageCount: 1,
      scannedPackageCount: 1,
      failedPackageCount: 0,
      rawFunctionExportCount: 1,
      inventoriedFunctionCount: 1,
    },
    functions: [
      {
        packagePath: "ExampleGame/Content/ExampleAsset.uasset",
        packageExportIndex: 2,
        objectName: "Calculate Example Value",
        objectPath: "ExampleAsset_C:Calculate Example Value",
        ownerPath: "ExampleAsset_C",
        ownerExportType: "BlueprintGeneratedClass",
        flags: "Final, Public",
        bytecodeExpressionCount: 4,
        signature: {
          parameterCount: 1,
          parameters: [
            {
              position: 0,
              name: "ReturnValue",
              type: "int32",
              arrayDimension: 1,
              flags: "Parm, OutParm, ReturnParm",
            },
          ],
        },
        ownerLinkage: {
          funcMapContainsDeclaration: true,
          childrenContainsDeclaration: true,
          superclassPath: "/Script/Engine.Actor",
          interfacePaths: [],
        },
      },
    ],
    failures: [],
  };
}
