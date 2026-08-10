import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { BlueprintCallCandidateTraceSchema } from "@neonretrorewind/core";

import { validateJsonSchema } from "../src/schema-validation.ts";

const schemaPath = new URL(
  "../../../../game-data-exporter/schemas/acquisition/blueprint-call-candidate-trace.schema.json",
  import.meta.url,
);
const classPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C";

test("accepts an explicitly unproven call-candidate trace", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();

  assert.doesNotThrow(() =>
    validateJsonSchema(artifact, schema, "Blueprint call-candidate trace"),
  );
  assert.deepEqual(BlueprintCallCandidateTraceSchema(artifact), artifact);
});

test("rejects a claimed candidate relationship", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();
  (artifact.candidate as { relationship: string }).relationship = "equivalent";

  assert.throws(
    () => validateJsonSchema(artifact, schema, "Blueprint call-candidate trace"),
    /does not match its schema/u,
  );
  assert.notDeepEqual(BlueprintCallCandidateTraceSchema(artifact), artifact);
});

test("rejects an untyped candidate parameter", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();
  artifact.candidate.signature.parameters[0]!.type = "";

  assert.throws(
    () => validateJsonSchema(artifact, schema, "Blueprint call-candidate trace"),
    /does not match its schema/u,
  );
  assert.notDeepEqual(BlueprintCallCandidateTraceSchema(artifact), artifact);
});

function createArtifact() {
  const candidatePath = `${classPath}:Evaluate Example Schedule`;
  return {
    artifactType: "blueprint-call-candidate-trace" as const,
    build: {
      manifestSha256: "a".repeat(64),
      steamAppId: "3552140",
      steamBuildId: "23896268",
    },
    sourceTrace: {
      fileName: "blueprint-property-reference-trace.new-release-candidates.json",
      sizeBytes: 100,
      sha256: "b".repeat(64),
      artifactType: "blueprint-property-reference-trace" as const,
      targetPropertyName: "New Release Movie",
    },
    recordedCall: {
      callerFunctionPath: `${classPath}:Filter Example Schedule`,
      statementIndex: 152,
      opcode: "EX_LocalVirtualFunction",
      call: {
        callKind: "local-virtual" as const,
        functionName: "Evaluate Example Record",
        argumentCount: 4,
        integerArguments: [],
      },
    },
    candidate: {
      selectionRule: "explicit-same-class-function-path" as const,
      relationship: "unproven" as const,
      argumentCountMatchesParameterCount: false,
      signature: {
        parameterCount: 1,
        parameters: [
          {
            position: 0,
            name: "New Release is releasing today",
            type: "Bool",
            arrayDimension: 1,
            flags: "Parm, OutParm",
          },
        ],
      },
      function: {
        packagePath: "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.uasset",
        className: "ExampleManager_C",
        classPath,
        functionName: "Evaluate Example Schedule",
        functionPath: candidatePath,
        flags: "FUNC_Public, FUNC_BlueprintCallable",
        bytecodeExpressionCount: 1,
        nodes: [
          {
            nodeIndex: 0,
            parentNodeIndex: null,
            edge: "script[0]",
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
  };
}
