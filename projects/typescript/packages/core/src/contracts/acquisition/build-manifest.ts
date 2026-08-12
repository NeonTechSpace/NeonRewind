import { type } from "arktype";
import { withUniqueItems } from "../contract-constraints.ts";

const $definitionSteamBuild = type({
  appId: type("string").matching(new RegExp("^[0-9]+$")),
  buildId: type("string").matching(new RegExp("^[0-9]+$")),
  name: type("string").atLeastLength(1),
  "+": "reject",
}).readonly();
const $definitionFileIdentity = type({
  fileName: type("string").matching(new RegExp("^[^/\\\\]+$")).atLeastLength(1),
  sizeBytes: type("number.integer").atLeast(0),
  sha256: type("string").matching(new RegExp("^[0-9a-f]{64}$")),
  "+": "reject",
}).readonly();
const $definitionEngineIdentity = type({
  version: type.unit("5.4"),
  cue4ParseProfile: type.unit("GAME_UE5_4"),
  source: type.unit("configured"),
  confidence: type.unit("probable"),
  "+": "reject",
}).readonly();
const $definitionExtractorIdentity = type({
  name: type.unit("NeonRetroRewind.StaticExtractor"),
  version: type("string").atLeastLength(1),
  cue4ParseVersion: type("string").atLeastLength(1),
  "+": "reject",
}).readonly();

export const BuildManifestSchema = type({
  artifactType: type.unit("build-manifest"),
  steam: $definitionSteamBuild,
  reportedGameVersion: type.or(type("string"), type("null")),
  executable: $definitionFileIdentity,
  packages: withUniqueItems(
    type([
      $definitionFileIdentity,
      "...",
      $definitionFileIdentity.array(),
    ]).readonly(),
  ),
  engine: $definitionEngineIdentity,
  extractor: $definitionExtractorIdentity,
  "+": "reject",
}).readonly();
export type BuildManifest = typeof BuildManifestSchema.infer;
