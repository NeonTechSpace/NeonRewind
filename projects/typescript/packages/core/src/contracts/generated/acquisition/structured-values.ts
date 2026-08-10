// Generated from src/contracts/acquisition/structured-values.ts by pnpm contracts:generate. Do not edit.

export type Sha256 = string;
export type FileName = string;
export type NonNegativeInteger = number;
export type PackagePath = string;
export type NonEmptyString = string;
export type Counts = {
  name: NonEmptyString;
  count: number;
}[];

export interface StructuredValuesContract {
  artifactType: "structured-values";
  build: BuildReference;
  structuredIndex: StructuredIndexIdentity;
  mappings: MappingIdentity;
  engine: EngineIdentity;
  extractor: ExtractorIdentity;
  totals: Totals;
  dataTables: DataTable[];
  stringTables: StringTable[];
  failures: Failure[];
  failureTypes: Counts;
}
export interface BuildReference {
  manifestSha256: Sha256;
  steamAppId: string;
  steamBuildId: string;
}
export interface StructuredIndexIdentity {
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
  extractedPackageCount: NonNegativeInteger;
  failedPackageCount: NonNegativeInteger;
  dataTableCount: NonNegativeInteger;
  dataTableRowCount: NonNegativeInteger;
  dataTableRowPropertyCount: NonNegativeInteger;
  stringTableCount: NonNegativeInteger;
  stringTableEntryCount: NonNegativeInteger;
  stringTableMetadataCount: NonNegativeInteger;
}
export interface DataTable {
  path: PackagePath;
  name: NonEmptyString;
  type: NonEmptyString;
  rowStruct: string | null;
  rows: DataTableRow[];
}
export interface DataTableRow {
  key: string;
  values: {
    [k: string]: unknown;
  };
}
export interface StringTable {
  path: PackagePath;
  name: NonEmptyString;
  type: NonEmptyString;
  namespace: string;
  entries: StringTableEntry[];
}
export interface StringTableEntry {
  key: string;
  value: string;
  metadata: StringTableMetadata[];
}
export interface StringTableMetadata {
  name: NonEmptyString;
  value: string;
}
export interface Failure {
  path: PackagePath;
  errorType: NonEmptyString;
}
