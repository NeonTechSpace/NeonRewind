import { type } from "arktype";
import { withUniqueItems } from "../contract-constraints.ts";

const $definitionSha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const $definitionBuildReference = type({
  manifestSha256: $definitionSha256,
  "manifestSchemaVersion?": type.unit(1),
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();
const $definitionFileName = type("string")
  .matching(new RegExp("^[^/\\\\]+$"))
  .atLeastLength(1);
const $definitionStructuredIndexIdentity = type({
  fileName: type.and(
    $definitionFileName,
    type("string").matching(new RegExp("\\.json$")),
  ),
  sizeBytes: type("number.integer").atLeast(1),
  sha256: $definitionSha256,
  "schemaVersion?": type.unit(1),
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
  extractedPackageCount: $definitionNonNegativeInteger,
  failedPackageCount: $definitionNonNegativeInteger,
  dataTableCount: $definitionNonNegativeInteger,
  dataTableRowCount: $definitionNonNegativeInteger,
  dataTableRowPropertyCount: $definitionNonNegativeInteger,
  stringTableCount: $definitionNonNegativeInteger,
  stringTableEntryCount: $definitionNonNegativeInteger,
  stringTableMetadataCount: $definitionNonNegativeInteger,
  "+": "reject",
}).readonly();
const $definitionPackagePath = type("string")
  .matching(new RegExp("^[^\\\\]+\\.(uasset|umap)$"))
  .atLeastLength(1);
const $definitionNonEmptyString = type("string").atLeastLength(1);
const $definitionDataTableRow = type({
  key: type("string"),
  values: type({}).readonly(),
  "+": "reject",
}).readonly();
const $definitionDataTable = type({
  path: $definitionPackagePath,
  name: $definitionNonEmptyString,
  type: $definitionNonEmptyString,
  rowStruct: type.or(type("string").atLeastLength(1), type("null")),
  rows: $definitionDataTableRow.array().readonly(),
  "+": "reject",
}).readonly();
const $definitionStringTableMetadata = type({
  name: $definitionNonEmptyString,
  value: type("string"),
  "+": "reject",
}).readonly();
const $definitionStringTableEntry = type({
  key: type("string"),
  value: type("string"),
  metadata: $definitionStringTableMetadata.array().readonly(),
  "+": "reject",
}).readonly();
const $definitionStringTable = type({
  path: $definitionPackagePath,
  name: $definitionNonEmptyString,
  type: $definitionNonEmptyString,
  namespace: type("string"),
  entries: $definitionStringTableEntry.array().readonly(),
  "+": "reject",
}).readonly();
const $definitionFailure = type({
  path: $definitionPackagePath,
  errorType: $definitionNonEmptyString,
  "+": "reject",
}).readonly();
const $definitionCounts = withUniqueItems(
  type({
    name: $definitionNonEmptyString,
    count: type("number.integer").atLeast(1),
    "+": "reject",
  })
    .readonly()
    .array()
    .readonly(),
);

export const StructuredValuesSchema = type({
  artifactType: type.unit("structured-values"),
  "schemaVersion?": type.unit(1),
  build: $definitionBuildReference,
  structuredIndex: $definitionStructuredIndexIdentity,
  mappings: $definitionMappingIdentity,
  engine: $definitionEngineIdentity,
  extractor: $definitionExtractorIdentity,
  totals: $definitionTotals,
  dataTables: $definitionDataTable.array().readonly(),
  stringTables: $definitionStringTable.array().readonly(),
  failures: $definitionFailure.array().readonly(),
  failureTypes: $definitionCounts,
  "+": "reject",
}).readonly();
export type StructuredValues = typeof StructuredValuesSchema.infer;
