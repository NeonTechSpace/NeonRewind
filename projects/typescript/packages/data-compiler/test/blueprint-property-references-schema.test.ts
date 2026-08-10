import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { BlueprintPropertyReferencesSchema } from "@neonretrorewind/core";

import { validateJsonSchema } from "../src/schema-validation.ts";

const schemaPath = new URL(
  "../../../../game-data-exporter/schemas/acquisition/blueprint-property-references.schema.json",
  import.meta.url,
);

test("accepts the bounded Blueprint property-reference contract", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();

  assert.doesNotThrow(() =>
    validateJsonSchema(artifact, schema, "Blueprint property references"),
  );
  assert.deepEqual(BlueprintPropertyReferencesSchema(artifact), artifact);
});

test("rejects complete coverage with a package failure", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();
  artifact.totals.failedPackageCount = 1;
  artifact.failures.push({
    packagePath: "ExampleGame/Content/Failed.uasset",
    errorType: "ParserException",
  });

  assert.throws(
    () => validateJsonSchema(artifact, schema, "Blueprint property references"),
    /does not match its schema/u,
  );
  assert.notDeepEqual(BlueprintPropertyReferencesSchema(artifact), artifact);
});

test("rejects an unsupported access classification", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();
  artifact.references[0]!.access = "execute";

  assert.throws(
    () => validateJsonSchema(artifact, schema, "Blueprint property references"),
    /does not match its schema/u,
  );
  assert.notDeepEqual(BlueprintPropertyReferencesSchema(artifact), artifact);
});

function createArtifact() {
  return {
    artifactType: "blueprint-property-references" as const,
    build: {
      manifestSha256: "a".repeat(64),
      steamAppId: "3552140",
      steamBuildId: "23896268",
    },
    staticCensus: {
      fileName: "static-census.json",
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
      version: "0.0.1",
      cue4ParseVersion: "fixture",
    },
    target: {
      propertyName: "ExampleReleaseKind",
    },
    candidateRule: "parsed-packages-with-function-exports" as const,
    referenceRule: "exact-kismet-property-pointer-name" as const,
    coverage: "complete" as const,
    totals: {
      candidatePackageCount: 1,
      scannedPackageCount: 1,
      failedPackageCount: 0,
      classCount: 1,
      functionCount: 1,
      referenceCount: 2,
      readCount: 1,
      writeCount: 1,
      metadataCount: 0,
    },
    references: [
      {
        packagePath:
          "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.uasset",
        className: "ExampleUnlockSystem_C",
        classPath:
          "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C",
        functionName: "ExecuteExampleGraph_ExampleUnlockSystem",
        functionPath:
          "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C:ExecuteExampleGraph_ExampleUnlockSystem",
        access: "write",
        opcode: "EX_InstanceVariable",
        pointerField: "Variable",
        statementIndex: 2568,
      },
      {
        packagePath:
          "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.uasset",
        className: "ExampleUnlockSystem_C",
        classPath:
          "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C",
        functionName: "ExecuteExampleGraph_ExampleUnlockSystem",
        functionPath:
          "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C:ExecuteExampleGraph_ExampleUnlockSystem",
        access: "read",
        opcode: "EX_InstanceVariable",
        pointerField: "Variable",
        statementIndex: 3224,
      },
    ],
    failures: [] as Array<{ packagePath: string; errorType: string }>,
  };
}
