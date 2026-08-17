import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MarketEvidenceSchema,
  MarketEvidenceTargetProfileSchema,
} from "@neonretrorewind/core";

import { validateJsonSchema } from "./json-schema-validation.ts";

test("accepts the Market target profile through both public contracts", async () => {
  const schemaPath = new URL(
    "../../../../game-data-exporter/schemas/config/market-evidence-target-profile.schema.json",
    import.meta.url,
  );
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const profile = createProfile();

  assert.deepEqual(schema, MarketEvidenceTargetProfileSchema.toJsonSchema());
  assert.equal(MarketEvidenceTargetProfileSchema.allows(profile), true);
  validateJsonSchema(profile, schema, "Market-evidence target profile");
});

test("accepts bounded Market manager and save evidence", () => {
  assert.doesNotThrow(() => MarketEvidenceSchema.assert(createArtifact()));
});

test("rejects reordered Market package roles", () => {
  const artifact = createArtifact();
  [artifact.packages[0], artifact.packages[1]] = [
    artifact.packages[1]!,
    artifact.packages[0]!,
  ];

  assert.throws(() => MarketEvidenceSchema.assert(artifact));
});

test("rejects a Market manager package without its Blueprint class", () => {
  const artifact = createArtifact();
  artifact.packages[0]!.blueprintClasses = [];

  assert.throws(() => MarketEvidenceSchema.assert(artifact));
});

test("rejects Market totals that do not match the package evidence", () => {
  const artifact = createArtifact();
  artifact.totals.functionCount += 1;

  assert.throws(() => MarketEvidenceSchema.assert(artifact));
});

function createProfile() {
  return {
    profileType: "market-evidence-target-profile",
    build: {
      manifestSha256: "a".repeat(64),
      steamAppId: "1000000",
      steamBuildId: "20000001",
    },
    mappings: {
      fileName: "mappings.usmap",
      sizeBytes: 100,
      sha256: "b".repeat(64),
      formatVersion: 4,
    },
    engine: {
      version: "5.4",
      cue4ParseProfile: "GAME_UE5_4",
      source: "configured",
      confidence: "probable",
    },
    targets: {
      manager: {
        packagePath:
          "ExampleGame/Content/ExampleProject/core/blueprint/ExampleMarket.uasset",
      },
      save: {
        packagePath:
          "ExampleGame/Content/ExampleProject/core/blueprint/ExampleMarketSave.uasset",
      },
    },
  } as const;
}

function createArtifact() {
  return {
    artifactType: "market-evidence" as const,
    build: {
      manifestSha256: "a".repeat(64),
      steamAppId: "1000000",
      steamBuildId: "20000001",
    },
    staticCensus: {
      fileName: "static-census.json",
      sizeBytes: 100,
      sha256: "c".repeat(64),
    },
    mappings: {
      fileName: "mappings.usmap",
      sizeBytes: 100,
      sha256: "b".repeat(64),
      formatVersion: 4 as const,
    },
    engine: {
      version: "5.4" as const,
      cue4ParseProfile: "GAME_UE5_4" as const,
      source: "configured" as const,
      confidence: "probable" as const,
    },
    targetProfile: {
      fileName: "market-evidence-target-profile.json",
      sizeBytes: 200,
      sha256: "d".repeat(64),
      profileType: "market-evidence-target-profile" as const,
    },
    extractor: {
      name: "NeonRetroRewind.StaticExtractor" as const,
      version: "0.0.8",
      cue4ParseVersion: "fixture",
    },
    totals: {
      packageCount: 2 as const,
      blueprintClassCount: 1 as const,
      userDefinedStructCount: 1 as const,
      functionCount: 2,
      fieldCount: 0,
      defaultPropertyCount: 0,
      referenceCount: 0,
    },
    packages: [
      {
        role: "market-manager" as const,
        path: "ExampleGame/Content/ExampleProject/core/blueprint/ExampleMarket.uasset",
        blueprintClasses: [
          {
            name: "ExampleMarket_C",
            path: "/Game/ExampleMarket.ExampleMarket_C",
            superclassPath: "/Script/Engine.Actor",
            functions: ["Load", "Order Example Product"],
            fields: [],
            classDefault: {
              name: "Default__ExampleMarket_C",
              path: "/Game/ExampleMarket.Default__ExampleMarket_C",
              properties: [],
              references: [],
            },
          },
        ],
        userDefinedStructs: [],
      },
      {
        role: "market-save" as const,
        path:
          "ExampleGame/Content/ExampleProject/core/blueprint/ExampleMarketSave.uasset",
        blueprintClasses: [],
        userDefinedStructs: [
          {
            name: "ExampleMarketSave",
            path: "/Game/ExampleMarketSave.ExampleMarketSave",
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
