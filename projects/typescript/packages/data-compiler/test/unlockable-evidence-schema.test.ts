import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateJsonSchema } from "../src/schema-validation.ts";

const schemaPath = new URL(
  "../../../../game-data-exporter/schemas/acquisition/unlockable-evidence.schema.json",
  import.meta.url,
);

test("accepts the bounded unlockable-system evidence contract", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;

  assert.doesNotThrow(() =>
    validateJsonSchema(createArtifact(), schema, "Unlockable evidence"),
  );
});

test("rejects reordered unlockable-system packages", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();
  [artifact.packages[0], artifact.packages[1]] = [
    artifact.packages[1]!,
    artifact.packages[0]!,
  ];

  assert.throws(
    () => validateJsonSchema(artifact, schema, "Unlockable evidence"),
    /does not match its schema/u,
  );
});

function createArtifact() {
  return {
    artifactType: "unlockable-evidence",
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
      packageCount: 4,
      blueprintClassCount: 3,
      userDefinedStructCount: 1,
      functionCount: 24,
      fieldCount: 30,
      defaultPropertyCount: 7,
      referenceCount: 0,
    },
    packages: [
      blueprintPackage(
        "ExampleGame/Content/ExampleProject/core/blueprint/research/BP_ExampleItem.uasset",
        "BP_ExampleItem_C",
      ),
      blueprintPackage(
        "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockFunctions.uasset",
        "ExampleUnlockFunctions_C",
      ),
      blueprintPackage(
        "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.uasset",
        "ExampleUnlockSystem_C",
      ),
      {
        path: "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockState.uasset",
        blueprintClasses: [],
        userDefinedStructs: [
          {
            name: "ExampleUnlockState",
            path: "/Game/ExampleUnlockState",
            superStructPath: null,
            fields: [],
            defaults: [],
            references: [],
          },
        ],
      },
    ],
  };
}

function blueprintPackage(path: string, name: string) {
  return {
    path,
    blueprintClasses: [
      {
        name,
        path: `/Game/${name}`,
        superclassPath: "/Script/Engine.Actor",
        functions: [],
        fields: [],
        classDefault: {
          name: `Default__${name}`,
          path: `/Game/Default__${name}`,
          properties: [],
          references: [],
        },
      },
    ],
    userDefinedStructs: [],
  };
}
