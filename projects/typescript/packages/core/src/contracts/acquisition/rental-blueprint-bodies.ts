import { type } from "arktype";

const $definitionSha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const $definitionBuildReference = type({
  manifestSha256: $definitionSha256,
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();
const $definitionFileName = type("string")
  .matching(new RegExp("^[^/\\\\]+$"))
  .atLeastLength(1);
const $definitionInputIdentity = type({
  fileName: type.and(
    $definitionFileName,
    type("string").matching(new RegExp("\\.json$")),
  ),
  sizeBytes: type("number.integer").atLeast(1),
  sha256: $definitionSha256,
  "+": "reject",
}).readonly();
const $definitionMappingIdentity = type({
  fileName: type.and(
    $definitionFileName,
    type("string").matching(new RegExp("\\.usmap$")),
  ),
  sizeBytes: type("number.integer").atLeast(16),
  sha256: $definitionSha256,
  formatVersion: type.unit(4),
  "+": "reject",
}).readonly();
const $definitionEngineIdentity = type({
  version: type.unit("5.4"),
  cue4ParseProfile: type.unit("GAME_UE5_4"),
  source: type.unit("configured"),
  confidence: type.unit("probable"),
  "+": "reject",
}).readonly();
const $definitionNonEmptyString = type("string").atLeastLength(1);
const $definitionExtractorIdentity = type({
  name: type.unit("NeonRetroRewind.StaticExtractor"),
  version: $definitionNonEmptyString,
  cue4ParseVersion: $definitionNonEmptyString,
  "+": "reject",
}).readonly();
const $definitionTotals = type({
  packageCount: type.unit(4),
  classCount: type.unit(4),
  functionCount: type("number.integer").atLeast(1),
  bytecodeExpressionCount: type("number.integer").atLeast(1),
  pseudoCodeCharacterCount: type("number.integer").atLeast(1),
  "+": "reject",
}).readonly();
const $definitionFunction = type({
  name: $definitionNonEmptyString,
  path: $definitionNonEmptyString,
  flags: $definitionNonEmptyString,
  bytecodeExpressionCount: type("number.integer").atLeast(1),
  "+": "reject",
}).readonly();
const $definitionBlueprintClass = type({
  packagePath: type.enumerated(
    "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleReturn.uasset",
    "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleExampleFeeRecord.uasset",
    "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExamplePayment.uasset",
    "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.uasset",
  ),
  name: $definitionNonEmptyString,
  path: $definitionNonEmptyString,
  functions: type([
    $definitionFunction,
    "...",
    $definitionFunction.array(),
  ]).readonly(),
  pseudoCode: $definitionNonEmptyString,
  "+": "reject",
}).readonly();

export const RentalBlueprintBodiesSchema = type({
  artifactType: type.unit("rental-blueprint-bodies"),
  build: $definitionBuildReference,
  rentalEvidence: $definitionInputIdentity,
  mappings: $definitionMappingIdentity,
  engine: $definitionEngineIdentity,
  extractor: $definitionExtractorIdentity,
  totals: $definitionTotals,
  classes: type([
    $definitionBlueprintClass,
    $definitionBlueprintClass,
    $definitionBlueprintClass,
    $definitionBlueprintClass,
    "...",
    $definitionBlueprintClass.array(),
  ])
    .readonly()
    .atMostLength(4),
  "+": "reject",
}).readonly();
export type RentalBlueprintBodies = typeof RentalBlueprintBodiesSchema.infer;
