import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateJsonSchema } from "../src/schema-validation.ts";

const schemaPath = new URL(
  "../../../../game-data-exporter/schemas/acquisition/unlockable-implementation-sites.schema.json",
  import.meta.url,
);

const managerClass =
  "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C";

test("accepts a complete unlockable implementation-site discovery", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;

  assert.doesNotThrow(() =>
    validateJsonSchema(createArtifact(), schema, "Unlockable implementation sites"),
  );
});

test("accepts an empty override as a discovered implementation site", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();
  const baseClass = artifact.baseClassPath;
  const classPath = "ExampleGame/Content/Fixture.Fixture_C";
  artifact.totals.derivedClassCount = 1;
  artifact.totals.overrideCount = 1;
  artifact.derivedClasses.push({
    packagePath: "ExampleGame/Content/Fixture.uasset",
    className: "Fixture_C",
    classPath,
    superclassPath: baseClass,
    inheritancePath: [baseClass, classPath],
  });
  artifact.overrides.push({
    packagePath: "ExampleGame/Content/Fixture.uasset",
    className: "Fixture_C",
    classPath,
    functionName: "ApplyExample",
    functionPath: `${classPath}:ApplyExample`,
    flags: "FUNC_BlueprintEvent",
    bytecodeExpressionCount: 0,
  });

  assert.doesNotThrow(() =>
    validateJsonSchema(artifact, schema, "Unlockable implementation sites"),
  );
});

test("rejects a changed manager event-graph target", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();
  artifact.managerEventGraphs[0]!.functionName = "ExecuteExampleGraph_Other";

  assert.throws(
    () =>
      validateJsonSchema(
        artifact,
        schema,
        "Unlockable implementation sites",
      ),
    /does not match its schema/u,
  );
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
    () =>
      validateJsonSchema(
        artifact,
        schema,
        "Unlockable implementation sites",
      ),
    /does not match its schema/u,
  );
});

test("rejects reordered unlock hook targets", async () => {
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const artifact = createArtifact();
  [artifact.targetFunctionNames[0], artifact.targetFunctionNames[1]] = [
    artifact.targetFunctionNames[1]!,
    artifact.targetFunctionNames[0]!,
  ];

  assert.throws(
    () =>
      validateJsonSchema(
        artifact,
        schema,
        "Unlockable implementation sites",
      ),
    /does not match its schema/u,
  );
});

function createArtifact() {
  return {
    artifactType: "unlockable-implementation-sites",
    build: {
      manifestSha256: "a".repeat(64),
      steamAppId: "3552140",
      steamBuildId: "23896268",
    },
    staticCensus: inputIdentity("static-census.json", "b"),
    unlockableEvidence: inputIdentity("unlockable-evidence.json", "c"),
    unlockableFunctionTrace: inputIdentity(
      "unlockable-function-trace.json",
      "d",
    ),
    mappings: {
      fileName: "mappings.usmap",
      sizeBytes: 100,
      sha256: "e".repeat(64),
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
    baseClassPath:
      "ExampleGame/Content/ExampleProject/core/blueprint/research/BP_ExampleItem.BP_ExampleItem_C",
    targetFunctionNames: [
      "CanApplyExample",
      "IsExampleEligible",
      "ApplyExample",
      "TryApplyExample",
    ],
    candidateRule: "parsed-packages-with-generated-blueprint-class-exports",
    coverage: "complete",
    totals: {
      candidatePackageCount: 10,
      scannedPackageCount: 10,
      failedPackageCount: 0,
      classCount: 10,
      functionCount: 20,
      blueprintInheritanceLinkCount: 2,
      derivedClassCount: 0,
      overrideCount: 0,
      managerEventGraphCount: 1,
      callSiteCount: 0,
    },
    derivedClasses: [] as Array<{
      packagePath: string;
      className: string;
      classPath: string;
      superclassPath: string;
      inheritancePath: string[];
    }>,
    overrides: [] as Array<{
      packagePath: string;
      className: string;
      classPath: string;
      functionName: string;
      functionPath: string;
      flags: string;
      bytecodeExpressionCount: number;
    }>,
    managerEventGraphs: [
      {
        packagePath:
          "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.uasset",
        className: "ExampleUnlockSystem_C",
        classPath: managerClass,
        functionName: "ExecuteExampleGraph_ExampleUnlockSystem",
        functionPath: `${managerClass}:ExecuteExampleGraph_ExampleUnlockSystem`,
        flags: "FUNC_Final",
        bytecodeExpressionCount: 10,
      },
    ],
    callSites: [],
    failures: [] as Array<{ packagePath: string; errorType: string }>,
  };
}

function inputIdentity(fileName: string, hashCharacter: string) {
  return {
    fileName,
    sizeBytes: 100,
    sha256: hashCharacter.repeat(64),
  };
}
