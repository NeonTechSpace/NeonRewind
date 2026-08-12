import assert from "node:assert/strict";
import test from "node:test";

import { BlueprintCallTargetTraceSchema } from "@neonretrorewind/core";

const marketClassPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C";
const filmDataClassPath =
  "ExampleGame/Content/ExampleProject/core/data/ExampleRecord.ExampleRecord_C";

test("accepts an exactly bound call-target trace", () => {
  const artifact = createArtifact();

  assert.deepEqual(BlueprintCallTargetTraceSchema.assert(artifact), artifact);
});

test("rejects an unproven target relationship", () => {
  const artifact = createArtifact();
  (artifact.binding as { relationship: string }).relationship = "unproven";

  assert.throws(() => BlueprintCallTargetTraceSchema.assert(artifact));
});

test("rejects a receiver that does not match the declaration owner", () => {
  const artifact = createArtifact();
  (
    artifact.binding as { receiverClassMatchesDeclarationOwner: boolean }
  ).receiverClassMatchesDeclarationOwner = false;

  assert.throws(() => BlueprintCallTargetTraceSchema.assert(artifact));
});

function createArtifact() {
  const callerPath = `${marketClassPath}:Filter Example Schedule`;
  const targetPath = `${filmDataClassPath}:Evaluate Example Record`;
  const signature = {
    parameterCount: 4,
    parameters: [
      createParameter(0, "__WorldContext", "ObjectProperty"),
      createParameter(1, "Film Data", "ExampleRecord_C"),
      createParameter(2, "is New", "BoolProperty"),
      createParameter(3, "is New Day Left", "IntProperty"),
    ],
  };

  return {
    artifactType: "blueprint-call-target-trace" as const,
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
    declarations: {
      fileName: "blueprint-function-declarations.return-if-film-is-new.json",
      sizeBytes: 200,
      sha256: "c".repeat(64),
      artifactType: "blueprint-function-declarations" as const,
      targetFunctionName: "Evaluate Example Record",
      declarationRule: "exact-raw-function-export-object-name" as const,
    },
    recordedCall: {
      callerFunctionPath: callerPath,
      statementIndex: 152,
      opcode: "EX_LocalVirtualFunction",
      call: {
        callKind: "local-virtual" as const,
        functionName: "Evaluate Example Record",
        argumentCount: 4,
        integerArguments: [],
      },
    },
    binding: {
      bindingRule: "exact-context-object-class-and-declaration" as const,
      relationship: "verified" as const,
      receiverClassMatchesDeclarationOwner: true as const,
      argumentCountMatchesParameterCount: true as const,
      receiver: {
        contextStatementIndex: 130,
        contextOpcode: "EX_Context" as const,
        callEdge: "ContextExpression" as const,
        receiverStatementIndex: 131,
        receiverOpcode: "EX_ObjectConst" as const,
        receiverEdge: "ObjectExpression" as const,
        objectName: "Default__ExampleRecord_C",
        objectPath:
          "ExampleGame/Content/ExampleProject/core/data/ExampleRecord.Default__ExampleRecord_C",
        classPath: filmDataClassPath,
        exportType: "ExampleRecord_C",
      },
      declaration: {
        packagePath:
          "ExampleGame/Content/ExampleProject/core/data/ExampleRecord.uasset",
        packageExportIndex: 14,
        objectPath: targetPath,
        ownerPath: filmDataClassPath,
        signature,
      },
      function: {
        packagePath:
          "ExampleGame/Content/ExampleProject/core/data/ExampleRecord.uasset",
        className: "ExampleRecord_C",
        classPath: filmDataClassPath,
        functionName: "Evaluate Example Record",
        functionPath: targetPath,
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
      sha256: "d".repeat(64),
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

function createParameter(position: number, name: string, type: string) {
  return {
    position,
    name,
    type,
    arrayDimension: 1,
    flags: position >= 2 ? "Parm, OutParm" : "Parm",
  };
}
