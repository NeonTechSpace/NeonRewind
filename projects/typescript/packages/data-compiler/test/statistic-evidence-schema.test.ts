import assert from "node:assert/strict";
import test from "node:test";

import { StatisticEvidenceSchema } from "@neonretrorewind/core";

test("accepts the bounded statistic evidence contract", () => {
  assert.doesNotThrow(() => StatisticEvidenceSchema.assert(createArtifact()));
});

test("rejects reordered statistic packages", () => {
  const artifact = createArtifact();
  [artifact.packages[0], artifact.packages[1]] = [
    artifact.packages[1]!,
    artifact.packages[0]!,
  ];

  assert.throws(() => StatisticEvidenceSchema.assert(artifact));
});

test("rejects a missing statistic Blueprint class", () => {
  const artifact = createArtifact();
  artifact.packages[0]!.blueprintClasses = [];

  assert.throws(() => StatisticEvidenceSchema.assert(artifact));
});

function createArtifact() {
  return {
    artifactType: "statistic-evidence",
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
      version: "0.0.3",
      cue4ParseVersion: "fixture",
    },
    totals: {
      packageCount: 2,
      blueprintClassCount: 1,
      userDefinedStructCount: 1,
      functionCount: 22,
      fieldCount: 30,
      defaultPropertyCount: 7,
      referenceCount: 0,
    },
    packages: [
      {
        path: "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleMetric.uasset",
        blueprintClasses: [
          {
            name: "ExampleMetric_C",
            path: "/Game/ExampleMetric.ExampleMetric_C",
            superclassPath: "/Script/Engine.Actor",
            functions: [],
            fields: [],
            classDefault: {
              name: "Default__ExampleMetric_C",
              path: "/Game/ExampleMetric.Default__ExampleMetric_C",
              properties: [],
              references: [],
            },
          },
        ],
        userDefinedStructs: [],
      },
      {
        path: "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleMetric_Save.uasset",
        blueprintClasses: [],
        userDefinedStructs: [
          {
            name: "ExampleMetricState",
            path: "/Game/ExampleMetric_Save.ExampleMetricState",
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
