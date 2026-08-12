import { type } from "arktype";
import { withUniqueItems } from "../contract-constraints.ts";

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
const $definitionTarget = type({
  functionName: type("string")
    .matching(new RegExp("^[^\\u0000-\\u001f\\u007f-\\u009f]+$"))
    .atLeastLength(1)
    .atMostLength(256),
  "+": "reject",
}).readonly();
const $definitionTotals = type({
  packageCount: type("number.integer").atLeast(1),
  classCount: type("number.integer").atLeast(1),
  functionCount: type("number.integer").atLeast(1),
  callSiteCount: type("number.integer").atLeast(1),
  pseudoCodeCharacterCount: type("number.integer").atLeast(1),
  "+": "reject",
}).readonly();
const $definitionCall = type({
  callKind: type.enumerated("virtual", "local-virtual", "final", "local-final"),
  statementIndex: type("number.integer").atLeast(0),
  "+": "reject",
}).readonly();
const $definitionFunction = type({
  packagePath: type("string")
    .matching(new RegExp("\\.uasset$"))
    .atLeastLength(1),
  className: $definitionNonEmptyString,
  classPath: $definitionNonEmptyString,
  functionName: $definitionNonEmptyString,
  functionPath: $definitionNonEmptyString,
  flags: $definitionNonEmptyString,
  bytecodeExpressionCount: type("number.integer").atLeast(1),
  calls: withUniqueItems(
    type([$definitionCall, "...", $definitionCall.array()]).readonly(),
  ),
  pseudoCode: $definitionNonEmptyString,
  "+": "reject",
}).readonly();

export const BlueprintCallerBodiesSchema = type({
  artifactType: type.unit("blueprint-caller-bodies"),
  build: $definitionBuildReference,
  callSites: $definitionInputIdentity,
  mappings: $definitionMappingIdentity,
  engine: $definitionEngineIdentity,
  extractor: $definitionExtractorIdentity,
  target: $definitionTarget,
  totals: $definitionTotals,
  functions: withUniqueItems(
    type([$definitionFunction, "...", $definitionFunction.array()]).readonly(),
  ),
  "+": "reject",
}).readonly();
export type BlueprintCallerBodies = typeof BlueprintCallerBodiesSchema.infer;
