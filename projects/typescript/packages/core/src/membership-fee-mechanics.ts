import type {
  BlueprintFunctionEvidence,
  RentalArtifactIdentity,
} from "./console-return-mechanics.ts";

export interface ClassFieldEvidence {
  readonly artifactType: "rental-evidence";
  readonly classPath: string;
  readonly fieldName: string;
}

export interface StructFieldEvidence {
  readonly artifactType: "rental-evidence";
  readonly structPath: string;
  readonly fieldName: string;
}

export interface MembershipFeeFieldDefinition {
  readonly defaultValue: 0;
  readonly evidence: StructFieldEvidence;
}

export interface MembershipFeeMechanics {
  readonly artifactType: "membership-fee-mechanics";
  readonly schemaVersion: 1;
  readonly build: {
    readonly steamAppId: string;
    readonly steamBuildId: string;
  };
  readonly sources: {
    readonly rentalEvidence: RentalArtifactIdentity;
    readonly rentalBlueprintBodies: RentalArtifactIdentity;
  };
  readonly scope: "membership-fee-record";
  readonly evidenceLevel: "decompiled-blueprint";
  readonly runtimeValidation: "not-run";
  readonly storage: {
    readonly container: "map";
    readonly key: "membership-id";
    readonly value: "fee-record";
    readonly evidence: ClassFieldEvidence;
  };
  readonly feeRecord: {
    readonly late: MembershipFeeFieldDefinition;
    readonly broken: MembershipFeeFieldDefinition;
    readonly rewind: MembershipFeeFieldDefinition;
    readonly consoleLate: MembershipFeeFieldDefinition;
    readonly consoleBroken: MembershipFeeFieldDefinition;
  };
  readonly addition: {
    readonly zeroMembershipId: "no-op";
    readonly mapWrite: "add-or-replace";
    readonly fieldUpdates: {
      readonly late: "stored-plus-incoming";
      readonly broken: "stored-plus-incoming";
      readonly rewind: "stored-plus-incoming";
      readonly consoleLate: "set-zero";
      readonly consoleBroken: "set-zero";
    };
    readonly evidence: BlueprintFunctionEvidence;
  };
  readonly removal: {
    readonly zeroMembershipId: "no-op";
    readonly operation: "remove-entry";
    readonly evidence: BlueprintFunctionEvidence;
  };
}
