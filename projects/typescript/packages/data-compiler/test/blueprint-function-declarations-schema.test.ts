import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { BlueprintFunctionDeclarationsSchema } from "@neonretrorewind/core";

import { validateJsonSchema } from "../src/schema-validation.ts";

const schemaPath = new URL(
  "../../../../game-data-exporter/schemas/acquisition/blueprint-function-declarations.schema.json",
  import.meta.url,
);

test("accepts a complete exact-name scan with no declaration", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();

  assert.doesNotThrow(() =>
    validateJsonSchema(artifact, schema, "Blueprint function declarations"),
  );
  assert.deepEqual(BlueprintFunctionDeclarationsSchema(artifact), artifact);
});

test("accepts a complete scan whose census has no function candidates", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();
  artifact.totals.candidatePackageCount = 0;
  artifact.totals.scannedPackageCount = 0;
  artifact.totals.rawFunctionExportCount = 0;

  assert.doesNotThrow(() =>
    validateJsonSchema(artifact, schema, "Blueprint function declarations"),
  );
  assert.deepEqual(BlueprintFunctionDeclarationsSchema(artifact), artifact);
});

test("rejects a partial scan without a recorded failure", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();
  (artifact as { coverage: string }).coverage = "partial";
  artifact.totals.failedPackageCount = 1;

  assert.throws(
    () => validateJsonSchema(artifact, schema, "Blueprint function declarations"),
    /does not match its schema/u,
  );
  assert.notDeepEqual(BlueprintFunctionDeclarationsSchema(artifact), artifact);
});

test("rejects a nonexact declaration rule", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();
  (artifact as { declarationRule: string }).declarationRule = "case-insensitive-name";

  assert.throws(
    () => validateJsonSchema(artifact, schema, "Blueprint function declarations"),
    /does not match its schema/u,
  );
  assert.notDeepEqual(BlueprintFunctionDeclarationsSchema(artifact), artifact);
});

function createArtifact() {
  return {
    artifactType: "blueprint-function-declarations" as const,
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
      version: "0.0.1",
      cue4ParseVersion: "fixture",
    },
    target: {
      functionName: "Evaluate Example Record",
    },
    candidateRule: "parsed-packages-with-function-exports" as const,
    declarationRule: "exact-raw-function-export-object-name" as const,
    coverage: "complete" as const,
    totals: {
      candidatePackageCount: 604,
      scannedPackageCount: 604,
      failedPackageCount: 0,
      rawFunctionExportCount: 7527,
      matchedDeclarationCount: 0,
    },
    declarations: [],
    failures: [],
  };
}
