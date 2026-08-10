// Generated from src/contracts/acquisition/rental-evidence.ts by pnpm contracts:generate. Do not edit.

export type Sha256 = string;
export type FileName = string;
export type NonEmptyString = string;
export type NonNegativeInteger = number;
export type NullableString = string | null;
export type StringArray = NonEmptyString[];
export type Fields = {
  name: NonEmptyString;
  type: NonEmptyString;
  arrayDimension: number;
}[];
export type Defaults = {
  name: NonEmptyString;
  type: NonEmptyString;
  arrayIndex: number;
  value: unknown;
}[];
export type References = {
  propertyPath: NonEmptyString;
  kind: "delegate" | "hard" | "interface" | "soft";
  objectPath: NonEmptyString;
}[];

export interface RentalEvidenceContract {
  artifactType: "rental-evidence";
  build: BuildReference;
  staticCensus: StaticCensusIdentity;
  mappings: MappingIdentity;
  engine: EngineIdentity;
  extractor: ExtractorIdentity;
  totals: Totals;
  /**
   * @minItems 6
   * @maxItems 6
   */
  packages: [Package, Package, Package, Package, Package, Package];
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
  version: NonEmptyString;
  cue4ParseVersion: NonEmptyString;
}
export interface Totals {
  packageCount: 6;
  blueprintClassCount: 4;
  userDefinedStructCount: 2;
  functionCount: NonNegativeInteger;
  fieldCount: NonNegativeInteger;
  defaultPropertyCount: NonNegativeInteger;
  referenceCount: NonNegativeInteger;
}
export interface Package {
  path:
    | "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleReturn.uasset"
    | "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleExampleFeeRecord.uasset"
    | "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExamplePayment.uasset"
    | "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleFeeRecord.uasset"
    | "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.uasset"
    | "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueStruct.uasset";
  /**
   * @maxItems 1
   */
  blueprintClasses: [] | [BlueprintClass];
  /**
   * @maxItems 1
   */
  userDefinedStructs: [] | [UserDefinedStruct];
}
export interface BlueprintClass {
  name: NonEmptyString;
  path: NonEmptyString;
  superclassPath: NullableString;
  functions: StringArray;
  fields: Fields;
  classDefault: ClassDefault;
}
export interface ClassDefault {
  name: NonEmptyString;
  path: NonEmptyString;
  properties: Defaults;
  references: References;
}
export interface UserDefinedStruct {
  name: NonEmptyString;
  path: NonEmptyString;
  superStructPath: NullableString;
  fields: Fields;
  defaults: Defaults;
  references: References;
}
