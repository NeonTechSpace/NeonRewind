// Generated from src/contracts/acquisition/blueprint-caller-bodies.ts by pnpm contracts:generate. Do not edit.

export type Sha256 = string;
export type FileName = string;
export type NonEmptyString = string;

export interface BlueprintCallerBodiesContract {
  artifactType: "blueprint-caller-bodies";
  build: BuildReference;
  callSites: InputIdentity;
  mappings: MappingIdentity;
  engine: EngineIdentity;
  extractor: ExtractorIdentity;
  target: Target;
  totals: Totals;
  /**
   * @minItems 1
   */
  functions: [Function, ...Function[]];
}
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
  packageCount: number;
  classCount: number;
  functionCount: number;
  callSiteCount: number;
  pseudoCodeCharacterCount: number;
}
export interface Function {
  packagePath: string;
  className: NonEmptyString;
  classPath: NonEmptyString;
  functionName: NonEmptyString;
  functionPath: NonEmptyString;
  flags: NonEmptyString;
  bytecodeExpressionCount: number;
  /**
   * @minItems 1
   */
  calls: [Call, ...Call[]];
  pseudoCode: NonEmptyString;
}
export interface Call {
  callKind: "virtual" | "local-virtual" | "final" | "local-final";
  statementIndex: number;
}
