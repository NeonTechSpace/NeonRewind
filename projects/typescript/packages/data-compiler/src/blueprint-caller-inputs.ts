import type {
  RentalBuildReference,
  RentalMappingIdentity,
} from "./rental-inputs.ts";

export interface BlueprintCallSiteInput {
  readonly packagePath: string;
  readonly className: string;
  readonly classPath: string;
  readonly functionName: string;
  readonly functionPath: string;
  readonly callKind: "virtual" | "local-virtual" | "final" | "local-final";
  readonly statementIndex: number;
}

export interface BlueprintCallSitesArtifact {
  readonly artifactType: "blueprint-call-sites";
  readonly build: RentalBuildReference;
  readonly staticCensus: {
    readonly fileName: string;
    readonly sizeBytes: number;
    readonly sha256: string;
  };
  readonly mappings: RentalMappingIdentity;
  readonly target: {
    readonly functionName: string;
  };
  readonly candidateRule: "parsed-packages-with-function-exports";
  readonly coverage: "complete" | "partial";
  readonly totals: {
    readonly candidatePackageCount: number;
    readonly scannedPackageCount: number;
    readonly failedPackageCount: number;
    readonly classCount: number;
    readonly functionCount: number;
    readonly callSiteCount: number;
  };
  readonly callSites: readonly BlueprintCallSiteInput[];
  readonly failures: readonly {
    readonly packagePath: string;
    readonly errorType: string;
  }[];
}

export interface BlueprintCallerBodiesArtifact {
  readonly artifactType: "blueprint-caller-bodies";
  readonly build: RentalBuildReference;
  readonly callSites: {
    readonly fileName: string;
    readonly sizeBytes: number;
    readonly sha256: string;
  };
  readonly mappings: RentalMappingIdentity;
  readonly target: {
    readonly functionName: string;
  };
  readonly totals: {
    readonly packageCount: number;
    readonly classCount: number;
    readonly functionCount: number;
    readonly callSiteCount: number;
    readonly pseudoCodeCharacterCount: number;
  };
  readonly functions: readonly {
    readonly packagePath: string;
    readonly className: string;
    readonly classPath: string;
    readonly functionName: string;
    readonly functionPath: string;
    readonly flags: string;
    readonly bytecodeExpressionCount: number;
    readonly calls: readonly {
      readonly callKind: "virtual" | "local-virtual" | "final" | "local-final";
      readonly statementIndex: number;
    }[];
    readonly pseudoCode: string;
  }[];
}
