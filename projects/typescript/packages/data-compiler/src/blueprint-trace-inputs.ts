import type {
  RentalBuildReference,
  RentalMappingIdentity,
} from "./rental-inputs.ts";

export interface BlueprintTraceNodeInput {
  readonly nodeIndex: number;
  readonly parentNodeIndex: number | null;
  readonly edge: string;
  readonly depth: number;
  readonly statementIndex: number;
  readonly opcode: string;
  readonly kind:
    | "call"
    | "branch"
    | "literal"
    | "return"
    | "assignment"
    | "variable"
    | "context"
    | "operation";
  readonly symbol: string | null;
  readonly call: {
    readonly callKind: "virtual" | "local-virtual" | "final" | "local-final";
    readonly functionName: string;
    readonly argumentCount: number;
    readonly integerArguments: readonly {
      readonly position: number;
      readonly value: string;
    }[];
  } | null;
  readonly jump: {
    readonly jumpKind:
      | "unconditional"
      | "conditional-false"
      | "computed"
      | "push-flow"
      | "pop-flow"
      | "pop-flow-if-false"
      | "switch";
    readonly targets: readonly {
      readonly edge: string;
      readonly offset: number;
    }[];
  } | null;
  readonly literal: {
    readonly literalType: "integer" | "number" | "string" | "name" | "boolean" | "null";
    readonly value: string;
  } | null;
}

export interface BlueprintTraceFunctionInput {
  readonly packagePath: string;
  readonly className: string;
  readonly classPath: string;
  readonly functionName: string;
  readonly functionPath: string;
  readonly flags: string;
  readonly bytecodeExpressionCount: number;
  readonly nodes: readonly BlueprintTraceNodeInput[];
}

export interface BlueprintFunctionTraceArtifact {
  readonly artifactType: "blueprint-function-trace";
  readonly schemaVersion: 2;
  readonly build: RentalBuildReference;
  readonly callerBodies: readonly {
    readonly fileName: string;
    readonly sizeBytes: number;
    readonly sha256: string;
    readonly schemaVersion: 1;
    readonly targetFunctionName: string;
  }[];
  readonly mappings: RentalMappingIdentity;
  readonly engine: {
    readonly version: "5.4";
    readonly cue4ParseProfile: "GAME_UE5_4";
    readonly source: "configured";
    readonly confidence: "probable";
  };
  readonly extractor: {
    readonly name: "NeonRetroRewind.StaticExtractor";
    readonly version: string;
    readonly cue4ParseVersion: string;
  };
  readonly totals: {
    readonly packageCount: number;
    readonly classCount: number;
    readonly functionCount: number;
    readonly nodeCount: number;
    readonly callCount: number;
    readonly branchCount: number;
    readonly entrypointCount: number;
  };
  readonly functions: readonly BlueprintTraceFunctionInput[];
}

export interface RentalFunctionTraceArtifact {
  readonly artifactType: "rental-function-trace";
  readonly schemaVersion: 1;
  readonly build: RentalBuildReference;
  readonly rentalBlueprintBodies: {
    readonly fileName: string;
    readonly sizeBytes: number;
    readonly sha256: string;
    readonly schemaVersion: 1;
  };
  readonly requestedFunctionPaths: readonly string[];
  readonly mappings: RentalMappingIdentity;
  readonly engine: BlueprintFunctionTraceArtifact["engine"];
  readonly extractor: BlueprintFunctionTraceArtifact["extractor"];
  readonly totals: BlueprintFunctionTraceArtifact["totals"];
  readonly functions: readonly BlueprintTraceFunctionInput[];
}
