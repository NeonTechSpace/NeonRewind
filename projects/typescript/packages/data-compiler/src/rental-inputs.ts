export interface RentalBuildReference {
  readonly manifestSha256: string;
  readonly steamAppId: string;
  readonly steamBuildId: string;
}

export interface RentalMappingIdentity {
  readonly fileName: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly formatVersion: 4;
}

export interface RentalDefaultProperty {
  readonly name: string;
  readonly type: string;
  readonly arrayIndex: number;
  readonly value: unknown;
}

export interface RentalField {
  readonly name: string;
  readonly type: string;
  readonly arrayDimension: number;
}

export interface RentalBlueprintClassEvidence {
  readonly name: string;
  readonly path: string;
  readonly fields: readonly RentalField[];
  readonly classDefault: {
    readonly properties: readonly RentalDefaultProperty[];
  };
}

export interface RentalStructEvidence {
  readonly name: string;
  readonly path: string;
  readonly fields: readonly RentalField[];
  readonly defaults: readonly RentalDefaultProperty[];
}

export interface RentalEvidenceArtifact {
  readonly artifactType: "rental-evidence";
  readonly build: RentalBuildReference;
  readonly mappings: RentalMappingIdentity;
  readonly packages: readonly {
    readonly path: string;
    readonly blueprintClasses: readonly RentalBlueprintClassEvidence[];
    readonly userDefinedStructs: readonly RentalStructEvidence[];
  }[];
}

export interface RentalBlueprintFunctionInput {
  readonly name: string;
  readonly path: string;
  readonly flags: string;
  readonly bytecodeExpressionCount: number;
}

export interface RentalBlueprintBodiesArtifact {
  readonly artifactType: "rental-blueprint-bodies";
  readonly build: RentalBuildReference;
  readonly mappings: RentalMappingIdentity;
  readonly classes: readonly {
    readonly packagePath: string;
    readonly name: string;
    readonly path: string;
    readonly functions: readonly RentalBlueprintFunctionInput[];
    readonly pseudoCode: string;
  }[];
}
