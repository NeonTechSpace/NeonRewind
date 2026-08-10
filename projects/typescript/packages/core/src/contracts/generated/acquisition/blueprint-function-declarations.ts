// Generated from src/contracts/acquisition/blueprint-function-declarations.ts by pnpm contracts:generate. Do not edit.

export type BlueprintFunctionDeclarationsContract = {
  [k: string]: unknown;
} & {
  artifactType: "blueprint-function-declarations";
  build: BuildReference;
  staticCensus: InputIdentity;
  mappings: MappingIdentity;
  engine: EngineIdentity;
  extractor: ExtractorIdentity;
  target: Target;
  candidateRule: "parsed-packages-with-function-exports";
  declarationRule: "exact-raw-function-export-object-name";
  coverage: "complete" | "partial";
  totals: Totals;
  declarations: Declaration[];
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
  rawFunctionExportCount: number;
  matchedDeclarationCount: number;
}
export interface Declaration {
  packagePath: string;
  packageExportIndex: number;
  objectName: NonEmptyString;
  objectPath: NonEmptyString;
  ownerPath: NonEmptyString;
  ownerExportType: NonEmptyString;
  flags: NonEmptyString;
  bytecodeExpressionCount: number | null;
  signature: Signature;
  ownerLinkage: OwnerLinkage;
}
export interface Signature {
  parameterCount: number;
  parameters: Parameter[];
}
export interface Parameter {
  position: number;
  name: NonEmptyString;
  type: NonEmptyString;
  arrayDimension: number;
  flags: NonEmptyString;
}
export interface OwnerLinkage {
  funcMapContainsDeclaration: boolean | null;
  childrenContainsDeclaration: boolean | null;
  superclassPath: string | null;
  interfacePaths: NonEmptyString[];
}
export interface Failure {
  packagePath: string;
  errorType: string;
}
