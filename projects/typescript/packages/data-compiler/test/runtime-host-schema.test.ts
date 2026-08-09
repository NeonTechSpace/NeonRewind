import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateJsonSchema } from "../src/schema-validation.ts";

const runtimeSchemaRoot = new URL(
  "../../../../game-data-exporter/schemas/runtime/",
  import.meta.url,
);

test("accepts the current probe staging identity", async () => {
  const schema = await readSchema("runtime-host-staging.schema.json");
  const manifest = createStagingManifest();
  manifest.probe = {
    name: "NeonRetroRewindMovieReturnProbe",
    version: "0.0.4",
    source: file(
      "main.lua",
      15068,
      "5c8f29dfe42d5e2f7b8ba866d8df1bfd3c5620101f6253f697e3c1111f20657a",
    ),
    diagnosticRelativePath: "diagnostics/movie-return-compatibility-probe.json",
  };

  assert.doesNotThrow(() =>
    validateJsonSchema(manifest, schema, "Runtime-host staging manifest"),
  );
});

test("accepts a collector staging identity and rejects mixed payloads", async () => {
  const schema = await readSchema("runtime-host-staging.schema.json");
  const manifest = createStagingManifest();
  manifest.collector = createCollectorIdentity();

  assert.doesNotThrow(() =>
    validateJsonSchema(manifest, schema, "Runtime-host staging manifest"),
  );

  manifest.probe = {
    name: "NeonRetroRewindMovieReturnProbe",
    version: "0.0.4",
    source: file(
      "main.lua",
      15068,
      "5c8f29dfe42d5e2f7b8ba866d8df1bfd3c5620101f6253f697e3c1111f20657a",
    ),
    diagnosticRelativePath: "diagnostics/movie-return-compatibility-probe.json",
  };
  assert.throws(
    () => validateJsonSchema(manifest, schema, "Runtime-host staging manifest"),
    /does not match its schema/u,
  );
});

test("accepts the generated collector config contract", async () => {
  const schema = await readSchema("movie-return-runtime-collector-config.schema.json");
  const config = {
    artifactType: "movie-return-runtime-collector-config",
    build: {
      steamAppId: "3552140",
      steamBuildId: "23896268",
    },
    targetMechanics: createCollectorIdentity().targetMechanics,
    collector: {
      name: "NeonRetroRewind.MovieReturnRuntimeCollector",
      version: "0.1.7",
    },
    runtimeHost: {
      name: "UE4SS",
      version: "3.0.1-1018-g662df915",
    },
    observationSchema: {
      ...file("movie-return-observation.schema.json", 100, "c"),
      stagedRelativePath:
        "mods/NeonRetroRewindMovieReturnCollector/movie-return-observation.schema.json",
    },
    observationOutputRootAbsolutePath: "M:/NeonRetroRewind/.local/runtime",
  };

  assert.doesNotThrow(() =>
    validateJsonSchema(config, schema, "Runtime collector config"),
  );
});

async function readSchema(fileName: string): Promise<object> {
  return JSON.parse(await readFile(new URL(fileName, runtimeSchemaRoot), "utf8")) as object;
}

function createStagingManifest(): {
  artifactType: string;
  build: object;
  runtimeHost: object;
  probe?: object;
  collector?: ReturnType<typeof createCollectorIdentity>;
  gameDirectory: object;
  proposedFiles: object[];
} {
  return {
    artifactType: "runtime-host-staging",
    build: {
      steamAppId: "3552140",
      steamBuildId: "23896268",
      buildManifest: file("build-manifest.json", 100, "a"),
      executable: file("RetroRewind-Win64-Shipping.exe", 100, "b"),
    },
    runtimeHost: {
      name: "UE4SS",
      version: "3.0.1-1018-g662df915",
      archive: file(
        "zDEV-UE4SS.zip",
        100,
        "caa0f9a6c2ca372c2be5042668b2e86d1cc3bf45fa069a689552314d97f9ee9e",
      ),
    },
    gameDirectory: {
      absolutePath: "M:/Steam/RetroRewind/Binaries/Win64",
    },
    proposedFiles: [
      {
        relativePath: "dwmapi.dll",
        sourceRelativePath: "install/dwmapi.dll",
        sizeBytes: 100,
        sha256: "d".repeat(64),
      },
      {
        relativePath: "override.txt",
        sourceRelativePath: "install/override.txt",
        sizeBytes: 100,
        sha256: "e".repeat(64),
      },
    ],
  };
}

function createCollectorIdentity() {
  return {
    name: "NeonRetroRewindMovieReturnCollector",
    version: "0.1.7",
    binary: file("main.dll", 100, "a"),
    config: file("config.json", 100, "b"),
    observationSchema: file("movie-return-observation.schema.json", 100, "c"),
    targetMechanics: {
      ...file("movie-return-mechanics.json", 100, "d"),
      artifactType: "movie-return-mechanics",
    },
    observationOutputRootAbsolutePath: "M:/NeonRetroRewind/.local/runtime",
  };
}

function file(fileName: string, sizeBytes: number, sha256: string) {
  return {
    fileName,
    sizeBytes,
    sha256: sha256.length === 64 ? sha256 : sha256.repeat(64),
  };
}
