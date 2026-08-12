import { type } from "arktype";

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
const $definitionGameDirectory = type({
  absolutePath: type("string").atLeastLength(1),
  "+": "reject",
}).readonly();
const $definitionInstalledFile = type({
  relativePath: type.enumerated("dwmapi.dll", "override.txt"),
  sizeBytes: type("number.integer").atLeast(1),
  sha256: $definitionSha256,
  "+": "reject",
}).readonly();

export const RuntimeHostInstallationSchema = type({
  artifactType: type.unit("runtime-host-installation"),
  stagingManifest: type.and(
    $definitionFileIdentity,
    type({ "fileName?": type.unit("runtime-host-staging.json") }).readonly(),
  ),
  build: $definitionBuild,
  gameDirectory: $definitionGameDirectory,
  installedFiles: type([
    type.and(
      $definitionInstalledFile,
      type({ "relativePath?": type.unit("dwmapi.dll") }).readonly(),
    ),
    type.and(
      $definitionInstalledFile,
      type({ "relativePath?": type.unit("override.txt") }).readonly(),
    ),
  ])
    .readonly()
    .atMostLength(2),
  "+": "reject",
}).readonly();
export type RuntimeHostInstallation =
  typeof RuntimeHostInstallationSchema.infer;
