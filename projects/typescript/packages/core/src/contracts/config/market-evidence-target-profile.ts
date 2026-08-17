import { type } from "arktype";

const sha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const positiveInteger = type("number.integer").atLeast(1);
const packagePath = type("string")
  .matching(new RegExp("\\.uasset$"))
  .atLeastLength(8);

const build = type({
  manifestSha256: sha256,
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();

const mappings = type({
  fileName: type("string")
    .matching(new RegExp("^[^/\\\\]+\\.usmap$"))
    .atLeastLength(7),
  sizeBytes: positiveInteger,
  sha256,
  formatVersion: type.unit(4),
  "+": "reject",
}).readonly();

const engine = type({
  version: type.unit("5.4"),
  cue4ParseProfile: type.unit("GAME_UE5_4"),
  source: type.unit("configured"),
  confidence: type.unit("probable"),
  "+": "reject",
}).readonly();

const target = type({
  packagePath,
  "+": "reject",
}).readonly();

export const MarketEvidenceTargetProfileSchema = type({
  profileType: type.unit("market-evidence-target-profile"),
  build,
  mappings,
  engine,
  targets: type({
    manager: target,
    save: target,
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

export type MarketEvidenceTargetProfile =
  typeof MarketEvidenceTargetProfileSchema.infer;
