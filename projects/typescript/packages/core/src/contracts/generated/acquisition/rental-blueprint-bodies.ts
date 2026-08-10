// Generated from src/contracts/acquisition/rental-blueprint-bodies.ts by pnpm contracts:generate. Do not edit.

export type Sha256 = string;
export type FileName = string;
export type NonEmptyString = string;

export interface RentalBlueprintBodiesContract {
  artifactType: "rental-blueprint-bodies";
  build: BuildReference;
  rentalEvidence: InputIdentity;
  mappings: MappingIdentity;
  engine: EngineIdentity;
  extractor: ExtractorIdentity;
  totals: Totals;
  /**
   * @minItems 4
   * @maxItems 4
   */
  classes: [BlueprintClass, BlueprintClass, BlueprintClass, BlueprintClass];
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
export interface Totals {
  packageCount: 4;
  classCount: 4;
  functionCount: number;
  bytecodeExpressionCount: number;
  pseudoCodeCharacterCount: number;
}
export interface BlueprintClass {
  packagePath:
    | "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleReturn.uasset"
    | "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleExampleFeeRecord.uasset"
    | "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExamplePayment.uasset"
    | "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.uasset";
  name: NonEmptyString;
  path: NonEmptyString;
  /**
   * @minItems 1
   */
  functions: [Function, ...Function[]];
  pseudoCode: NonEmptyString;
}
export interface Function {
  name: NonEmptyString;
  path: NonEmptyString;
  flags: NonEmptyString;
  bytecodeExpressionCount: number;
}
