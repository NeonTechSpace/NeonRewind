// Generated from src/contracts/acquisition/blueprint-call-sites.ts by pnpm contracts:generate. Do not edit.

export type BlueprintCallSitesContract = {
  [k: string]: unknown;
} & {
  artifactType: "blueprint-call-sites";
  build: BuildReference;
  staticCensus: InputIdentity;
  mappings: MappingIdentity;
  engine: EngineIdentity;
  extractor: ExtractorIdentity;
  target: Target;
  candidateRule: "parsed-packages-with-function-exports";
  coverage: "complete" | "partial";
  totals: Totals;
  callSites: CallSite[];
  failures: Failure[];
};
export type Sha256 = string;
export type FileName = string;
export type NonEmptyString = string;

export interface BuildReference {
  manifestSha256: Sha256;
  steamAppId: string;
  steamBuildId: string;
}
export interface InputIdentity {
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
  version: NonEmptyString;
  cue4ParseVersion: NonEmptyString;
}
export interface Target {
  functionName: string;
}
export interface Totals {
  candidatePackageCount: number;
  scannedPackageCount: number;
  failedPackageCount: number;
  classCount: number;
  functionCount: number;
  callSiteCount: number;
}
export interface CallSite {
  packagePath: string;
  className: NonEmptyString;
  classPath: NonEmptyString;
  functionName: NonEmptyString;
  functionPath: NonEmptyString;
  callKind: "virtual" | "local-virtual" | "final" | "local-final";
  statementIndex: number;
}
export interface Failure {
  packagePath: string;
  errorType: string;
}
