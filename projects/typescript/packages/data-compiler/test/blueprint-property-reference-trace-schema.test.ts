import assert from "node:assert/strict";
import test from "node:test";

import { BlueprintPropertyReferenceTraceSchema } from "@neonretrorewind/core";

const classPath =
  "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C";
const functionPath = `${classPath}:Return Example Request`;

test("accepts the bounded Blueprint property-reference trace contract", () => {
  const artifact = createArtifact();

  assert.deepEqual(BlueprintPropertyReferenceTraceSchema.assert(artifact), artifact);
});

test("rejects an unsupported property-reader selection rule", () => {
  const artifact = createArtifact();
  (artifact as { selectionRule: string }).selectionRule = "all-property-references";

  assert.throws(() => BlueprintPropertyReferenceTraceSchema.assert(artifact));
});

test("rejects an empty source target property", () => {
  const artifact = createArtifact();
  artifact.blueprintPropertyReferences.targetPropertyName = "";

  assert.throws(() => BlueprintPropertyReferenceTraceSchema.assert(artifact));
});

function createArtifact() {
  return {
    artifactType: "blueprint-property-reference-trace" as const,
    build: {
      manifestSha256: "a".repeat(64),
      steamAppId: "3552140",
      steamBuildId: "23896268",
    },
    blueprintPropertyReferences: {
      fileName: "blueprint-property-references.new-release-unlock.json",
      sizeBytes: 100,
      sha256: "b".repeat(64),
      targetPropertyName: "ExampleReleaseKind",
    },
    requestedFunctionPaths: [functionPath],
    selectionRule: "explicit-functions-with-read-references" as const,
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
    totals: {
      packageCount: 1,
      classCount: 1,
      functionCount: 1,
      nodeCount: 3,
      callCount: 0,
      branchCount: 0,
      entrypointCount: 0,
    },
    functions: [
      {
        packagePath:
          "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.uasset",
        className: "BTTask_ExampleRequest_C",
        classPath,
        functionName: "Return Example Request",
        functionPath,
        flags: "FUNC_Final | FUNC_BlueprintCallable",
        bytecodeExpressionCount: 1,
        nodes: [
          {
            nodeIndex: 0,
            parentNodeIndex: null,
            edge: "script[0]",
            depth: 0,
            statementIndex: 2287,
            opcode: "EX_Context",
            kind: "context",
            symbol: "ExampleReleaseKind",
            call: null,
            jump: null,
            literal: null,
          },
          {
            nodeIndex: 1,
            parentNodeIndex: 0,
            edge: "ContextExpression",
            depth: 1,
            statementIndex: 2309,
            opcode: "EX_InstanceVariable",
            kind: "variable",
            symbol: "ExampleReleaseKind",
            call: null,
            jump: null,
            literal: null,
          },
          {
            nodeIndex: 2,
            parentNodeIndex: null,
            edge: "script[1]",
            depth: 0,
            statementIndex: 15,
            opcode: "EX_ObjectConst",
            kind: "literal",
            symbol: null,
            call: null,
            jump: null,
            literal: {
              literalType: "object" as const,
              value:
                "ExampleGame/Content/ExampleProject/core/data/ExampleReleaseTable.ExampleReleaseTable",
            },
          },
        ],
      },
    ],
  };
}
