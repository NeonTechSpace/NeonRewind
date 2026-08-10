// Generated from src/contracts/acquisition/unlockable-implementation-sites.ts by pnpm contracts:generate. Do not edit.

export type UnlockableImplementationSitesContract = {
  [k: string]: unknown;
} & {
  artifactType: "unlockable-implementation-sites";
  build: BuildReference;
  staticCensus: InputIdentity;
  unlockableEvidence: InputIdentity;
  unlockableFunctionTrace: InputIdentity;
  mappings: MappingIdentity;
  engine: EngineIdentity;
  extractor: ExtractorIdentity;
  baseClassPath: "ExampleGame/Content/ExampleProject/core/blueprint/research/BP_ExampleItem.BP_ExampleItem_C";
  /**
   * @minItems 4
   * @maxItems 4
   */
  targetFunctionNames: ["CanApplyExample", "IsExampleEligible", "ApplyExample", "TryApplyExample"];
  candidateRule: "parsed-packages-with-generated-blueprint-class-exports";
  coverage: "complete" | "partial";
  totals: Totals;
  derivedClasses: DerivedClass[];
  overrides: (FunctionSite & {
    functionName: "IsExampleEligible" | "ApplyExample";
  })[];
  /**
   * @minItems 1
   * @maxItems 1
   */
  managerEventGraphs: [
    FunctionSite & {
      packagePath: "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.uasset";
      className: "ExampleUnlockSystem_C";
      classPath: "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C";
      functionName: "ExecuteExampleGraph_ExampleUnlockSystem";
      functionPath: "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C:ExecuteExampleGraph_ExampleUnlockSystem";
      bytecodeExpressionCount: number;
    }
  ];
  callSites: CallSite[];
  failures: Failure[];
};
export type Sha256 = string;
export type NonEmptyString = string;
export type PackagePath = string;

export interface BuildReference {
  manifestSha256: Sha256;
  steamAppId: string;
  steamBuildId: string;
}
export interface InputIdentity {
  fileName: string;
  sizeBytes: number;
  sha256: Sha256;
}
export interface MappingIdentity {
  fileName: string;
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
  candidatePackageCount: number;
  scannedPackageCount: number;
  failedPackageCount: number;
  classCount: number;
  functionCount: number;
  blueprintInheritanceLinkCount: number;
  derivedClassCount: number;
  overrideCount: number;
  managerEventGraphCount: 1;
  callSiteCount: number;
}
export interface DerivedClass {
  packagePath: PackagePath;
  className: NonEmptyString;
  classPath: NonEmptyString;
  superclassPath: NonEmptyString;
  /**
   * @minItems 2
   */
  inheritancePath: [NonEmptyString, NonEmptyString, ...NonEmptyString[]];
}
export interface FunctionSite {
  packagePath: PackagePath;
  className: NonEmptyString;
  classPath: NonEmptyString;
  functionName: NonEmptyString;
  functionPath: NonEmptyString;
  flags: NonEmptyString;
  bytecodeExpressionCount: number;
}
export interface CallSite {
  targetFunctionName: "CanApplyExample" | "IsExampleEligible" | "ApplyExample" | "TryApplyExample";
  packagePath: PackagePath;
  className: NonEmptyString;
  classPath: NonEmptyString;
  functionName: NonEmptyString;
  functionPath: NonEmptyString;
  callKind: "virtual" | "local-virtual" | "final" | "local-final";
  statementIndex: number;
}
export interface Failure {
  packagePath: PackagePath;
  errorType: string;
}
