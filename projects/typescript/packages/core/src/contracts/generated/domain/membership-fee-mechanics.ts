// Generated from src/contracts/domain/membership-fee-mechanics.ts by pnpm contracts:generate. Do not edit.

export type Sha256 = string;
export type NonEmptyString = string;

export interface MembershipFeeMechanicsContract {
  artifactType: "membership-fee-mechanics";
  build: Build;
  sources: Sources;
  scope: "membership-fee-record";
  evidenceLevel: "decompiled-blueprint";
  runtimeValidation: "not-run";
  storage: Storage;
  feeRecord: FeeRecord;
  addition: Addition;
  removal: Removal;
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
export interface Storage {
  container: "map";
  key: "membership-id";
  value: "fee-record";
  evidence: ClassFieldEvidence;
}
export interface ClassFieldEvidence {
  artifactType: "rental-evidence";
  classPath: NonEmptyString;
  fieldName: NonEmptyString;
}
export interface FeeRecord {
  late: FeeField;
  broken: FeeField;
  rewind: FeeField;
  consoleLate: FeeField;
  consoleBroken: FeeField;
}
export interface FeeField {
  defaultValue: 0;
  evidence: StructFieldEvidence;
}
export interface StructFieldEvidence {
  artifactType: "rental-evidence";
  structPath: NonEmptyString;
  fieldName: NonEmptyString;
}
export interface Addition {
  zeroMembershipId: "no-op";
  mapWrite: "add-or-replace";
  fieldUpdates: {
    late: "stored-plus-incoming";
    broken: "stored-plus-incoming";
    rewind: "stored-plus-incoming";
    consoleLate: "set-zero";
    consoleBroken: "set-zero";
  };
  evidence: FunctionEvidence;
}
export interface FunctionEvidence {
  artifactType: "rental-blueprint-bodies";
  classPath: NonEmptyString;
  functionName: NonEmptyString;
}
export interface Removal {
  zeroMembershipId: "no-op";
  operation: "remove-entry";
  evidence: FunctionEvidence;
}
