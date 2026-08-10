// Generated from src/contracts/acquisition/blueprint-property-references.ts by pnpm contracts:generate. Do not edit.

export type BlueprintPropertyReferencesContract = {
  [k: string]: unknown;
} & {
  artifactType: "blueprint-property-references";
  build: BuildReference;
  staticCensus: InputIdentity;
  mappings: MappingIdentity;
  engine: EngineIdentity;
  extractor: ExtractorIdentity;
  target: Target;
  candidateRule: "parsed-packages-with-function-exports";
  referenceRule: "exact-kismet-property-pointer-name";
  coverage: "complete" | "partial";
  totals: Totals;
  references: Reference[];
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
  propertyName: string;
}
export interface Totals {
  candidatePackageCount: number;
  scannedPackageCount: number;
  failedPackageCount: number;
  classCount: number;
  functionCount: number;
  referenceCount: number;
  readCount: number;
  writeCount: number;
  metadataCount: number;
}
export interface Reference {
  packagePath: string;
  className: NonEmptyString;
  classPath: NonEmptyString;
  functionName: NonEmptyString;
  functionPath: NonEmptyString;
  access: "read" | "write" | "metadata";
  opcode: NonEmptyString;
  pointerField: NonEmptyString;
  statementIndex: number;
}
export interface Failure {
  packagePath: string;
  errorType: string;
}
