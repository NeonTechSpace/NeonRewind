import { type } from "arktype";

const $definitionSha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const $definitionNonEmptyString = type("string").atLeastLength(1);
const $definitionFileName = type("string")
  .matching(new RegExp("^[^/\\\\]+$"))
  .atLeastLength(1);
const $definitionBuild = type({
  manifestSha256: $definitionSha256,
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();
const $definitionStaticCensus = type({
  fileName: type.and(
    $definitionFileName,
    type("string").matching(new RegExp("\\.json$")),
  ),
  sizeBytes: type("number.integer").atLeast(1),
  sha256: $definitionSha256,
  "+": "reject",
}).readonly();
const $definitionMappings = type({
  fileName: type.and(
    $definitionFileName,
    type("string").matching(new RegExp("\\.usmap$")),
  ),
  sizeBytes: type("number.integer").atLeast(16),
  sha256: $definitionSha256,
  formatVersion: type.unit(4),
  "+": "reject",
}).readonly();
const $definitionEngine = type({
  version: type.unit("5.4"),
  cue4ParseProfile: type.unit("GAME_UE5_4"),
  source: type.unit("configured"),
  confidence: type.unit("probable"),
  "+": "reject",
}).readonly();
const $definitionExtractor = type({
  name: type.unit("NeonRetroRewind.StaticExtractor"),
  version: $definitionNonEmptyString,
  cue4ParseVersion: $definitionNonEmptyString,
  "+": "reject",
}).readonly();
const $definitionSource = type({
  packagePath: type.unit(
    "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockKind.uasset",
  ),
  objectPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockKind.ExampleUnlockKind",
  ),
  enumName: type.unit("ExampleUnlockKind"),
  cppForm: type.unit("Namespaced"),
  underlyingType: type.unit("int64"),
  "+": "reject",
}).readonly();
const $definitionTotals = type({
  enumeratorCount: type("number.integer").atLeast(1),
  "+": "reject",
}).readonly();
const $definitionEnumerator = type({
  value: type("number.integer").atLeast(0),
  internalName: $definitionNonEmptyString,
  displayName: $definitionNonEmptyString,
  "+": "reject",
}).readonly();

export const GameplayUnlockEnumSchema = type({
  artifactType: type.unit("gameplay-unlock-enum"),
  build: $definitionBuild,
  staticCensus: $definitionStaticCensus,
  mappings: $definitionMappings,
  engine: $definitionEngine,
  extractor: $definitionExtractor,
  source: $definitionSource,
  totals: $definitionTotals,
  enumerators: $definitionEnumerator.array().readonly(),
  "+": "reject",
}).readonly();

export type GameplayUnlockEnum = typeof GameplayUnlockEnumSchema.infer;
