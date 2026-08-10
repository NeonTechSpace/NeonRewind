// Generated from src/contracts/acquisition/structured-asset-index.ts by pnpm contracts:generate. Do not edit.

export type Sha256 = string;
export type FileName = string;
export type NonNegativeInteger = number;
export type PackageRecord = {
  [k: string]: unknown;
} & {
  path: string;
  status: "parsed" | "failed";
  /**
   * @minItems 1
   */
  candidateClasses: [
    "CompositeDataTable" | "CurveTable" | "DataAsset" | "DataTable" | "PrimaryDataAsset" | "StringTable",
    ...("CompositeDataTable" | "CurveTable" | "DataAsset" | "DataTable" | "PrimaryDataAsset" | "StringTable")[]
  ];
  exportCount: NonNegativeInteger | null;
  exportPropertyCount: NonNegativeInteger | null;
  assets: AssetRecord[];
  errorType: string | null;
};
export type AssetRecord = {
  [k: string]: unknown;
} & {
  name: string;
  type: string;
  kind: "data-asset" | "data-table" | "string-table";
  exportPropertyCount: NonNegativeInteger;
  entryCount: NonNegativeInteger | null;
  entryPropertyCount: NonNegativeInteger | null;
  rowStruct: string | null;
};
export type Counts = {
  name: string;
  count: number;
}[];

export interface StructuredAssetIndexContract {
  artifactType: "structured-asset-index";
  build: BuildReference;
  staticCensus: StaticCensusIdentity;
  mappings: MappingIdentity;
  engine: EngineIdentity;
  extractor: ExtractorIdentity;
  totals: Totals;
  packages: PackageRecord[];
  failureTypes: Counts;
}
export interface BuildReference {
  manifestSha256: Sha256;
  steamAppId: string;
  steamBuildId: string;
}
export interface StaticCensusIdentity {
  fileName: FileName;
  sizeBytes: number;
  sha256: Sha256;
}
export interface MappingIdentity {
  fileName: FileName;
  sizeBytes: number;
  sha256: Sha256;
  formatVersion: 4;
}
export interface EngineIdentity {
  version: "5.4";
  cue4ParseProfile: "GAME_UE5_4";
  source: "configured";
  confidence: "probable";
}
export interface ExtractorIdentity {
  name: "NeonRetroRewind.StaticExtractor";
  version: string;
  cue4ParseVersion: string;
}
export interface Totals {
  candidatePackageCount: NonNegativeInteger;
  parsedPackageCount: NonNegativeInteger;
  failedPackageCount: NonNegativeInteger;
  exportCount: NonNegativeInteger;
  exportPropertyCount: NonNegativeInteger;
  dataAssetCount: NonNegativeInteger;
  dataTableCount: NonNegativeInteger;
  dataTableRowCount: NonNegativeInteger;
  dataTableRowPropertyCount: NonNegativeInteger;
  stringTableCount: NonNegativeInteger;
  stringTableEntryCount: NonNegativeInteger;
}
