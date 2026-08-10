import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateJsonSchema } from "../src/schema-validation.ts";

const schemaPath = new URL(
  "../../../../game-data-exporter/schemas/acquisition/unlockable-function-trace.schema.json",
  import.meta.url,
);

const itemBaseClass =
  "ExampleGame/Content/ExampleProject/core/blueprint/research/BP_ExampleItem.BP_ExampleItem_C";
const systemClass =
  "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C";
const functionPaths = [
  `${itemBaseClass}:IsExampleEligible`,
  `${itemBaseClass}:ApplyExample`,
  `${systemClass}:CanApplyExample`,
  `${systemClass}:TryApplyExample`,
];

test("accepts the bounded unlockable function trace contract", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;

  assert.doesNotThrow(() =>
    validateJsonSchema(createArtifact(), schema, "Unlockable function trace"),
  );
});

test("rejects a changed unlockable trace target", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();
  artifact.functions[3]!.functionPath = `${systemClass}:IsExampleApplied`;

  assert.throws(
    () => validateJsonSchema(artifact, schema, "Unlockable function trace"),
    /does not match its schema/u,
  );
});

test("rejects reordered unlockable trace requests", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();
  [artifact.requestedFunctionPaths[0], artifact.requestedFunctionPaths[1]] = [
    artifact.requestedFunctionPaths[1]!,
    artifact.requestedFunctionPaths[0]!,
  ];

  assert.throws(
    () => validateJsonSchema(artifact, schema, "Unlockable function trace"),
    /does not match its schema/u,
  );
});

function createArtifact() {
  return {
    artifactType: "unlockable-function-trace",
    build: {
      manifestSha256: "a".repeat(64),
      steamAppId: "3552140",
      steamBuildId: "23896268",
    },
    unlockableEvidence: {
      fileName: "unlockable-evidence.json",
      sizeBytes: 100,
      sha256: "b".repeat(64),
    },
    requestedFunctionPaths: [...functionPaths],
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
      packageCount: 2,
      classCount: 2,
      functionCount: 4,
      nodeCount: 4,
      callCount: 0,
      branchCount: 0,
      entrypointCount: 0,
    },
    functions: [
      tracedFunction(itemBaseClass, "IsExampleEligible"),
      tracedFunction(itemBaseClass, "ApplyExample"),
      tracedFunction(systemClass, "CanApplyExample"),
      tracedFunction(systemClass, "TryApplyExample"),
    ],
  };
}

function tracedFunction(classPath: string, functionName: string) {
  const className = classPath.slice(classPath.lastIndexOf(".") + 1);
  const packagePath = `${classPath.slice(0, classPath.lastIndexOf("."))}.uasset`;
  return {
    packagePath,
    className,
    classPath,
    functionName,
    functionPath: `${classPath}:${functionName}`,
    flags: "FUNC_Public | FUNC_BlueprintCallable",
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
  };
}
