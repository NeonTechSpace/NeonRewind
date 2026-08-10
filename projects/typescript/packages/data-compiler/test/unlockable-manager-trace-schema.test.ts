import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateJsonSchema } from "../src/schema-validation.ts";

const schemaPath = new URL(
  "../../../../game-data-exporter/schemas/acquisition/unlockable-manager-trace.schema.json",
  import.meta.url,
);
const classPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C";
const functionPath = `${classPath}:ExecuteExampleGraph_ExampleUnlockSystem`;

test("accepts the bounded unlockable manager trace contract", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  assert.doesNotThrow(() =>
    validateJsonSchema(createArtifact(), schema, "Unlockable manager trace"),
  );
});

test("rejects a changed manager trace target", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();
  artifact.requestedFunctionPaths[0] = `${classPath}:TryApplyExample`;

  assert.throws(
    () => validateJsonSchema(artifact, schema, "Unlockable manager trace"),
    /does not match its schema/u,
  );
});

test("rejects a manager function that does not match the request", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();
  artifact.functions[0]!.functionName = "TryApplyExample";
  artifact.functions[0]!.functionPath = `${classPath}:TryApplyExample`;

  assert.throws(
    () => validateJsonSchema(artifact, schema, "Unlockable manager trace"),
    /does not match its schema/u,
  );
});

function createArtifact() {
  return {
    artifactType: "unlockable-manager-trace",
    build: {
      manifestSha256: "a".repeat(64),
      steamAppId: "3552140",
      steamBuildId: "23896268",
    },
    unlockableImplementationSites: {
      fileName: "unlockable-implementation-sites.json",
      sizeBytes: 100,
      sha256: "b".repeat(64),
    },
    requestedFunctionPaths: [functionPath],
    mappings: {
      fileName: "mappings.usmap",
      sizeBytes: 100,
      sha256: "c".repeat(64),
      formatVersion: 4,
    },
    engine: {
      version: "5.4",
      cue4ParseProfile: "GAME_UE5_4",
      source: "configured",
      confidence: "probable",
    },
    extractor: {
      name: "NeonRetroRewind.StaticExtractor",
      version: "0.0.1",
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
        packagePath:
          "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.uasset",
        className: "ExampleUnlockSystem_C",
        classPath,
        functionName: "ExecuteExampleGraph_ExampleUnlockSystem",
        functionPath,
        flags: "FUNC_Final | FUNC_UbergraphFunction | FUNC_HasDefaults",
        bytecodeExpressionCount: 1,
        nodes: [
          {
            nodeIndex: 0,
            parentNodeIndex: null,
            edge: "root",
            depth: 0,
            statementIndex: 0,
            opcode: "EX_Return",
            kind: "return",
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
