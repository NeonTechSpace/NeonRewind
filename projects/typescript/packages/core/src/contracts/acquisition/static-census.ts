import { type } from "arktype";
import { withUniqueItems, without } from "../contract-constraints.ts";

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
const $definitionBuildReference = type({
  manifestSha256: type("string").matching(new RegExp("^[0-9a-f]{64}$")),
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();
const $definitionTotals = type({
  fileCount: type("number.integer").atLeast(0),
  packageCount: type("number.integer").atLeast(0),
  parsedPackageCount: type("number.integer").atLeast(0),
  failedPackageCount: type("number.integer").atLeast(0),
  importCount: type("number.integer").atLeast(0),
  exportCount: type("number.integer").atLeast(0),
  "+": "reject",
}).readonly();
const $definitionVirtualPath = type("string")
  .matching(new RegExp("^[^\\\\]+$"))
  .atLeastLength(1);
const $definitionFileRecord = type({
  path: $definitionVirtualPath,
  sizeBytes: type("number.integer").atLeast(0),
  extension: type("string"),
  kind: type.enumerated("file", "package", "payload"),
  encrypted: type("boolean"),
  "+": "reject",
}).readonly();
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
const $definitionPackageRecord = type.and(
  type({
    path: $definitionVirtualPath,
    status: type.enumerated("parsed", "failed"),
    format: type.or(type("string"), type("null")),
    importCount: type.or(type("number.integer").atLeast(0), type("null")),
    exportCount: type.or(type("number.integer").atLeast(0), type("null")),
    exportClasses: $definitionCounts,
    errorType: type.or(type("string"), type("null")),
    "+": "reject",
  }).readonly(),
  type.or(
    type({ "status?": type.unit("parsed") })
      .readonly()
      .and(
        type({
          "format?": type.enumerated("legacy", "io-store"),
          "importCount?": type("number.integer"),
          "exportCount?": type("number.integer"),
          "errorType?": type("null"),
        }).readonly(),
      ),
    without(
      type("unknown"),
      type({ "status?": type.unit("parsed") }).readonly(),
    ).and(
      type({
        "format?": type("null"),
        "importCount?": type("null"),
        "exportCount?": type("null"),
        "exportClasses?": type("unknown").array().readonly().atMostLength(0),
        "errorType?": type("string").atLeastLength(1),
      }).readonly(),
    ),
  ),
);

export const StaticCensusSchema = type({
  artifactType: type.unit("static-census"),
  build: $definitionBuildReference,
  engine: $definitionEngineIdentity,
  extractor: $definitionExtractorIdentity,
  totals: $definitionTotals,
  files: $definitionFileRecord.array().readonly(),
  packages: $definitionPackageRecord.array().readonly(),
  exportClasses: $definitionCounts,
  failureTypes: $definitionCounts,
  "+": "reject",
}).readonly();
export type StaticCensus = typeof StaticCensusSchema.infer;
