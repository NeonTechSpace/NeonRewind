// Generated from src/contracts/acquisition/static-census.ts by pnpm contracts:generate. Do not edit.

export type VirtualPath = string;
export type PackageRecord = {
  [k: string]: unknown;
} & {
  path: VirtualPath;
  status: "parsed" | "failed";
  format: string | null;
  importCount: number | null;
  exportCount: number | null;
  exportClasses: Counts;
  errorType: string | null;
};
export type Counts = {
  name: string;
  count: number;
}[];

export interface StaticCensusContract {
  artifactType: "static-census";
  build: BuildReference;
  engine: EngineIdentity;
  extractor: ExtractorIdentity;
  totals: Totals;
  files: FileRecord[];
  packages: PackageRecord[];
  exportClasses: Counts;
  failureTypes: Counts;
}
export interface BuildReference {
  manifestSha256: string;
  steamAppId: string;
  steamBuildId: string;
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
  fileCount: number;
  packageCount: number;
  parsedPackageCount: number;
  failedPackageCount: number;
  importCount: number;
  exportCount: number;
}
export interface FileRecord {
  path: VirtualPath;
  sizeBytes: number;
  extension: string;
  kind: "file" | "package" | "payload";
  encrypted: boolean;
}
