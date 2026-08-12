import { type } from "arktype";
import { withExactlyOneOf } from "../contract-constraints.ts";

const $definitionSha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const $definitionFileIdentity = type({
  fileName: type("string").matching(new RegExp("^[^/\\\\]+$")).atLeastLength(1),
  sizeBytes: type("number.integer").atLeast(1),
  sha256: $definitionSha256,
  "+": "reject",
}).readonly();
const $definitionBuild = type({
  steamAppId: type.unit("3552140"),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  buildManifest: $definitionFileIdentity,
  executable: $definitionFileIdentity,
  "+": "reject",
}).readonly();
const $definitionRuntimeHost = type({
  name: type.unit("UE4SS"),
  version: type.unit("3.0.1-1018-g662df915"),
  archive: type.and(
    $definitionFileIdentity,
    type({
      "sha256?": type.unit(
        "caa0f9a6c2ca372c2be5042668b2e86d1cc3bf45fa069a689552314d97f9ee9e",
      ),
    }).readonly(),
  ),
  "+": "reject",
}).readonly();
const $definitionProbe = type({
  name: type.unit("NeonRetroRewindMovieReturnProbe"),
  version: type("string").matching(new RegExp("^[0-9]+\\.[0-9]+\\.[0-9]+$")),
  source: type.and(
    $definitionFileIdentity,
    type({
      "fileName?": type.unit("main.lua"),
      "sizeBytes?": type.unit(15068),
      "sha256?": type.unit(
        "5c8f29dfe42d5e2f7b8ba866d8df1bfd3c5620101f6253f697e3c1111f20657a",
      ),
    }).readonly(),
  ),
  diagnosticRelativePath: type.unit(
    "diagnostics/movie-return-compatibility-probe.json",
  ),
  "+": "reject",
}).readonly();
const $definitionCollector = type({
  name: type.unit("NeonRetroRewindMovieReturnCollector"),
  version: type.unit("0.1.7"),
  binary: type.and(
    $definitionFileIdentity,
    type({ "fileName?": type.unit("main.dll") }).readonly(),
  ),
  config: type.and(
    $definitionFileIdentity,
    type({ "fileName?": type.unit("config.json") }).readonly(),
  ),
  observationSchema: type.and(
    $definitionFileIdentity,
    type({
      "fileName?": type.unit("movie-return-observation.schema.json"),
    }).readonly(),
  ),
  targetMechanics: type({
    fileName: type.unit("movie-return-mechanics.json"),
    sizeBytes: type("number.integer").atLeast(1),
    sha256: $definitionSha256,
    artifactType: type.unit("movie-return-mechanics"),
    "+": "reject",
  }).readonly(),
  observationOutputRootAbsolutePath: type("string").atLeastLength(1),
  "+": "reject",
}).readonly();
const $definitionGameDirectory = type({
  absolutePath: type("string").atLeastLength(1),
  "+": "reject",
}).readonly();
const $definitionProposedFile = type({
  relativePath: type.enumerated("dwmapi.dll", "override.txt"),
  sourceRelativePath: type.enumerated(
    "install/dwmapi.dll",
    "install/override.txt",
  ),
  sizeBytes: type("number.integer").atLeast(1),
  sha256: $definitionSha256,
  "+": "reject",
}).readonly();

export const RuntimeHostStagingSchema = type.and(
  type({
    artifactType: type.unit("runtime-host-staging"),
    build: $definitionBuild,
    runtimeHost: $definitionRuntimeHost,
    "probe?": $definitionProbe,
    "collector?": $definitionCollector,
    gameDirectory: $definitionGameDirectory,
    proposedFiles: type([
      type.and(
        $definitionProposedFile,
        type({
          "relativePath?": type.unit("dwmapi.dll"),
          "sourceRelativePath?": type.unit("install/dwmapi.dll"),
        }).readonly(),
      ),
      type.and(
        $definitionProposedFile,
        type({
          "relativePath?": type.unit("override.txt"),
          "sourceRelativePath?": type.unit("install/override.txt"),
        }).readonly(),
      ),
    ])
      .readonly()
      .atMostLength(2),
    "+": "reject",
  }).readonly(),
  withExactlyOneOf(
    type.or(
      type({ probe: $definitionProbe, "collector?": type("never") }).readonly(),
      type({
        "probe?": type("never"),
        collector: $definitionCollector,
      }).readonly(),
    ),
    [
      type({ probe: $definitionProbe, "collector?": type("never") }).readonly(),
      type({
        "probe?": type("never"),
        collector: $definitionCollector,
      }).readonly(),
    ],
  ),
);
export type RuntimeHostStaging = typeof RuntimeHostStagingSchema.infer;
