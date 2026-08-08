export interface RentalArtifactIdentity {
  readonly fileName: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly artifactType: "rental-evidence" | "rental-blueprint-bodies";
  readonly schemaVersion: 1;
}

export interface DefaultPropertyEvidence {
  readonly artifactType: "rental-evidence";
  readonly classPath: string;
  readonly propertyName: string;
}

export interface BlueprintFunctionEvidence {
  readonly artifactType: "rental-blueprint-bodies";
  readonly classPath: string;
  readonly functionName: string;
}

export interface ConsoleReturnMechanics {
  readonly artifactType: "console-return-mechanics";
  readonly schemaVersion: 1;
  readonly build: {
    readonly steamAppId: string;
    readonly steamBuildId: string;
  };
  readonly sources: {
    readonly rentalEvidence: RentalArtifactIdentity;
    readonly rentalBlueprintBodies: RentalArtifactIdentity;
  };
  readonly scope: "console-return";
  readonly evidenceLevel: "decompiled-blueprint";
  readonly runtimeValidation: "not-run";
  readonly configuration: {
    readonly rentalDurationDays: {
      readonly value: number;
      readonly evidence: DefaultPropertyEvidence;
    };
  };
  readonly eligibility: {
    readonly missingWeatherActorResult: false;
    readonly elapsedDays: {
      readonly currentDay: "weather-days-passed";
      readonly rentalStartDay: "console-rental-start-day";
      readonly operator: "greater-than-or-equal";
      readonly threshold: "rental-duration-days";
    };
    readonly evidence: BlueprintFunctionEvidence;
  };
  readonly queueTransition: {
    readonly when: "eligible";
    readonly source: "rented";
    readonly destination: "ready-to-return";
    readonly removesFromSource: true;
    readonly evidence: BlueprintFunctionEvidence;
  };
}
