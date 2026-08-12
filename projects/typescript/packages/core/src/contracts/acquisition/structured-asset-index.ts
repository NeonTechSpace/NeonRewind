import { type } from "arktype";
import { withUniqueItems, without } from "../contract-constraints.ts";

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
  fileName: $definitionFileName,
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
const $definitionExtractorIdentity = type({
  name: type.unit("NeonRetroRewind.StaticExtractor"),
  version: type("string").atLeastLength(1),
  cue4ParseVersion: type("string").atLeastLength(1),
  "+": "reject",
}).readonly();
const $definitionNonNegativeInteger = type("number.integer").atLeast(0);
const $definitionTotals = type({
  candidatePackageCount: $definitionNonNegativeInteger,
  parsedPackageCount: $definitionNonNegativeInteger,
  failedPackageCount: $definitionNonNegativeInteger,
  exportCount: $definitionNonNegativeInteger,
  exportPropertyCount: $definitionNonNegativeInteger,
  dataAssetCount: $definitionNonNegativeInteger,
  dataTableCount: $definitionNonNegativeInteger,
  dataTableRowCount: $definitionNonNegativeInteger,
  dataTableRowPropertyCount: $definitionNonNegativeInteger,
  stringTableCount: $definitionNonNegativeInteger,
  stringTableEntryCount: $definitionNonNegativeInteger,
  "+": "reject",
}).readonly();
const $definitionAssetRecord = type.and(
  type({
    name: type("string").atLeastLength(1),
    type: type("string").atLeastLength(1),
    kind: type.enumerated("data-asset", "data-table", "string-table"),
    exportPropertyCount: $definitionNonNegativeInteger,
    entryCount: type.or($definitionNonNegativeInteger, type("null")),
    entryPropertyCount: type.or($definitionNonNegativeInteger, type("null")),
    rowStruct: type.or(type("string").atLeastLength(1), type("null")),
    "+": "reject",
  }).readonly(),
  type.or(
    type({ "kind?": type.unit("string-table") })
      .readonly()
      .and(type({ "rowStruct?": type("null") }).readonly()),
    without(
      type("unknown"),
      type({ "kind?": type.unit("string-table") }).readonly(),
    ).and(type("unknown")),
  ),
  type.or(
    type({ "kind?": type.unit("data-asset") })
      .readonly()
      .and(
        type({
          "entryCount?": type("null"),
          "entryPropertyCount?": type("null"),
          "rowStruct?": type("null"),
        }).readonly(),
      ),
    without(
      type("unknown"),
      type({ "kind?": type.unit("data-asset") }).readonly(),
    ).and(type({ "entryCount?": $definitionNonNegativeInteger }).readonly()),
  ),
  type.or(
    type({ "kind?": type.unit("data-table") })
      .readonly()
      .and(
        type({
          "entryPropertyCount?": $definitionNonNegativeInteger,
        }).readonly(),
      ),
    without(
      type("unknown"),
      type({ "kind?": type.unit("data-table") }).readonly(),
    ).and(type({ "entryPropertyCount?": type("null") }).readonly()),
  ),
);
const $definitionPackageRecord = type.and(
  type({
    path: type("string")
      .matching(new RegExp("^[^\\\\]+\\.(uasset|umap)$"))
      .atLeastLength(1),
    status: type.enumerated("parsed", "failed"),
    candidateClasses: withUniqueItems(
      type([
        type.enumerated(
          "CompositeDataTable",
          "CurveTable",
          "DataAsset",
          "DataTable",
          "PrimaryDataAsset",
          "StringTable",
        ),
        "...",
        type
          .enumerated(
            "CompositeDataTable",
            "CurveTable",
            "DataAsset",
            "DataTable",
            "PrimaryDataAsset",
            "StringTable",
          )
          .array(),
      ]).readonly(),
    ),
    exportCount: type.or($definitionNonNegativeInteger, type("null")),
    exportPropertyCount: type.or($definitionNonNegativeInteger, type("null")),
    assets: $definitionAssetRecord.array().readonly(),
    errorType: type.or(type("string").atLeastLength(1), type("null")),
    "+": "reject",
  }).readonly(),
  type.or(
    type({ "status?": type.unit("parsed") })
      .readonly()
      .and(
        type({
          "exportCount?": $definitionNonNegativeInteger,
          "exportPropertyCount?": $definitionNonNegativeInteger,
          "errorType?": type("null"),
        }).readonly(),
      ),
    without(
      type("unknown"),
      type({ "status?": type.unit("parsed") }).readonly(),
    ).and(
      type({
        "exportCount?": type("null"),
        "exportPropertyCount?": type("null"),
        "assets?": type("unknown").array().readonly().atMostLength(0),
        "errorType?": type("string").atLeastLength(1),
      }).readonly(),
    ),
  ),
);
const $definitionCounts = withUniqueItems(
  type({
    name: type("string").atLeastLength(1),
    count: type("number.integer").atLeast(1),
    "+": "reject",
  })
    .readonly()
    .array()
    .readonly(),
);

export const StructuredAssetIndexSchema = type({
  artifactType: type.unit("structured-asset-index"),
  build: $definitionBuildReference,
  staticCensus: $definitionStaticCensusIdentity,
  mappings: $definitionMappingIdentity,
  engine: $definitionEngineIdentity,
  extractor: $definitionExtractorIdentity,
  totals: $definitionTotals,
  packages: $definitionPackageRecord.array().readonly(),
  failureTypes: $definitionCounts,
  "+": "reject",
}).readonly();
export type StructuredAssetIndex = typeof StructuredAssetIndexSchema.infer;
