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
const $definitionStaticCensusIdentity = type({
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
const $definitionNonNegativeInteger = type("number.integer").atLeast(0);
const $definitionTotals = type({
  packageCount: type.unit(2),
  blueprintClassCount: type.unit(1),
  userDefinedStructCount: type.unit(1),
  functionCount: $definitionNonNegativeInteger,
  fieldCount: $definitionNonNegativeInteger,
  defaultPropertyCount: $definitionNonNegativeInteger,
  referenceCount: $definitionNonNegativeInteger,
  "+": "reject",
}).readonly();
const $definitionNullableString = type.or(
  type("string").atLeastLength(1),
  type("null"),
);
const $definitionStringArray = $definitionNonEmptyString.array().readonly();
const $definitionFields = type({
  name: $definitionNonEmptyString,
  type: $definitionNonEmptyString,
  arrayDimension: type("number.integer").atLeast(1),
  "+": "reject",
})
  .readonly()
  .array()
  .readonly();
const $definitionDefaults = type({
  name: $definitionNonEmptyString,
  type: $definitionNonEmptyString,
  arrayIndex: type("number.integer").atLeast(0),
  value: type("unknown"),
  "+": "reject",
})
  .readonly()
  .array()
  .readonly();
const $definitionReferences = type({
  propertyPath: $definitionNonEmptyString,
  kind: type.enumerated("delegate", "hard", "interface", "soft"),
  objectPath: $definitionNonEmptyString,
  "+": "reject",
})
  .readonly()
  .array()
  .readonly();
const $definitionClassDefault = type({
  name: $definitionNonEmptyString,
  path: $definitionNonEmptyString,
  properties: $definitionDefaults,
  references: $definitionReferences,
  "+": "reject",
}).readonly();
const $definitionBlueprintClass = type({
  name: $definitionNonEmptyString,
  path: $definitionNonEmptyString,
  superclassPath: $definitionNullableString,
  functions: $definitionStringArray,
  fields: $definitionFields,
  classDefault: $definitionClassDefault,
  "+": "reject",
}).readonly();
const $definitionUserDefinedStruct = type({
  name: $definitionNonEmptyString,
  path: $definitionNonEmptyString,
  superStructPath: $definitionNullableString,
  fields: $definitionFields,
  defaults: $definitionDefaults,
  references: $definitionReferences,
  "+": "reject",
}).readonly();
const $definitionPackage = type({
  path: type.enumerated(
    "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleMetric.uasset",
    "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleMetric_Save.uasset",
  ),
  blueprintClasses: $definitionBlueprintClass
    .array()
    .readonly()
    .atMostLength(1),
  userDefinedStructs: $definitionUserDefinedStruct
    .array()
    .readonly()
    .atMostLength(1),
  "+": "reject",
}).readonly();

export const StatisticEvidenceSchema = type({
  artifactType: type.unit("statistic-evidence"),
  build: $definitionBuildReference,
  staticCensus: $definitionStaticCensusIdentity,
  mappings: $definitionMappingIdentity,
  engine: $definitionEngineIdentity,
  extractor: $definitionExtractorIdentity,
  totals: $definitionTotals,
  packages: type([
    type.and(
      $definitionPackage,
      type({
        "path?": type.unit(
          "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleMetric.uasset",
        ),
        "blueprintClasses?": type([
          type("unknown"),
          "...",
          type("unknown").array(),
        ]).readonly(),
        "userDefinedStructs?": type("unknown")
          .array()
          .readonly()
          .atMostLength(0),
      }).readonly(),
    ),
    type.and(
      $definitionPackage,
      type({
        "path?": type.unit(
          "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleMetric_Save.uasset",
        ),
        "blueprintClasses?": type("unknown").array().readonly().atMostLength(0),
        "userDefinedStructs?": type([
          type("unknown"),
          "...",
          type("unknown").array(),
        ]).readonly(),
      }).readonly(),
    ),
  ])
    .readonly()
    .atMostLength(2),
  "+": "reject",
}).readonly();
export type StatisticEvidence = typeof StatisticEvidenceSchema.infer;
