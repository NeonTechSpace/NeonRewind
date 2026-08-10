// Generated from src/contracts/domain/console-return-mechanics.ts by pnpm contracts:generate. Do not edit.

export type Sha256 = string;
export type NonEmptyString = string;

export interface ConsoleReturnMechanicsContract {
  artifactType: "console-return-mechanics";
  build: Build;
  sources: Sources;
  scope: "console-return";
  evidenceLevel: "decompiled-blueprint";
  runtimeValidation: "not-run";
  configuration: Configuration;
  eligibility: Eligibility;
  queueTransition: QueueTransition;
}
export interface Build {
  steamAppId: string;
  steamBuildId: string;
}
export interface Sources {
  rentalEvidence: SourceIdentity & {
    artifactType: "rental-evidence";
  };
  rentalBlueprintBodies: SourceIdentity & {
    artifactType: "rental-blueprint-bodies";
  };
}
export interface SourceIdentity {
  fileName: string;
  sha256: Sha256;
  sizeBytes: number;
  artifactType: "rental-evidence" | "rental-blueprint-bodies";
}
export interface Configuration {
  rentalDurationDays: {
    value: number;
    evidence: DefaultEvidence;
  };
}
export interface DefaultEvidence {
  artifactType: "rental-evidence";
  classPath: NonEmptyString;
  propertyName: NonEmptyString;
}
export interface Eligibility {
  missingWeatherActorResult: false;
  elapsedDays: {
    currentDay: "weather-days-passed";
    rentalStartDay: "console-rental-start-day";
    operator: "greater-than-or-equal";
    threshold: "rental-duration-days";
  };
  evidence: FunctionEvidence;
}
export interface FunctionEvidence {
  artifactType: "rental-blueprint-bodies";
  classPath: NonEmptyString;
  functionName: NonEmptyString;
}
export interface QueueTransition {
  when: "eligible";
  source: "rented";
  destination: "ready-to-return";
  removesFromSource: true;
  evidence: FunctionEvidence;
}
