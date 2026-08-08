import type {
  MembershipFeeFieldDefinition,
  MembershipFeeMechanics,
} from "@neonrewind/core";

import type {
  RentalBlueprintBodiesArtifact,
  RentalEvidenceArtifact,
  RentalStructEvidence,
} from "./rental-inputs.ts";
import {
  assertBlueprintFunction,
  assertRentalInputIdentity,
  findOne,
  findRentalBodyClass,
  findRentalEvidenceClass,
  type RentalMechanicSources,
} from "./rental-mechanic-evidence.ts";

const feeStructPackagePath =
  "RetroRewind/Content/VideoStore/core/blueprint/RentSystem/Fees.uasset";
const feeStructName = "Fees";
const feeMapField = "Fees Membeship";
const feeMapType =
  "Map<Int, Struct<RetroRewind/Content/VideoStore/core/blueprint/RentSystem/Fees.Fees>>";
const addFunction = "Add Fees to Membership";
const removeFunction = "Remove Fees to Membership";

const feeFieldNames = {
  late: "Late_3_6BD289B444BB8B56E87D128D260C2549",
  broken: "Broken_5_C1FEAF1341F90006475B01B94B5079AE",
  rewind: "Rewind_7_B80C9AFF4A03C0C5B9222088CEEB2842",
  consoleLate: "ConsoleLate_10_1326E6A34C65237C35667B88D7C972DA",
  consoleBroken: "ConsoleBroken_12_B4793D3A40BF8BDC91FD35B4105F1693",
} as const;

export type MembershipFeeSources = RentalMechanicSources;

export function compileMembershipFeeMechanics(
  rentalEvidence: RentalEvidenceArtifact,
  blueprintBodies: RentalBlueprintBodiesArtifact,
  sources: MembershipFeeSources,
): MembershipFeeMechanics {
  assertRentalInputIdentity(rentalEvidence, blueprintBodies, sources);
  const evidenceClass = findRentalEvidenceClass(rentalEvidence);
  const bodyClass = findRentalBodyClass(blueprintBodies);
  if (bodyClass.path !== evidenceClass.path) {
    throw new Error("Rental class paths differ between the two source artifacts.");
  }

  const storageField = findOne(
    evidenceClass.fields,
    (field) => field.name === feeMapField,
    `field ${feeMapField}`,
  );
  if (storageField.type !== feeMapType || storageField.arrayDimension !== 1) {
    throw new Error("Membership fee storage is not the expected membership-ID map.");
  }

  const feeStruct = findFeeStruct(rentalEvidence);
  if (feeStruct.fields.length !== 5 || feeStruct.defaults.length !== 5) {
    throw new Error("Fee record no longer has exactly five fields and defaults.");
  }
  const feeRecord = {
    late: createFeeField(feeStruct, feeFieldNames.late),
    broken: createFeeField(feeStruct, feeFieldNames.broken),
    rewind: createFeeField(feeStruct, feeFieldNames.rewind),
    consoleLate: createFeeField(feeStruct, feeFieldNames.consoleLate),
    consoleBroken: createFeeField(feeStruct, feeFieldNames.consoleBroken),
  };

  assertBlueprintFunction(bodyClass, addFunction, [
    "Membership ID !== 0",
    "if (!CallFunc_NotEqual_IntInt_ReturnValue)\n            return;",
    "Map_Find(Fees Membeship, Membership ID, CallFunc_Map_Find_Value)",
    `${feeFieldNames.late} + Fees.${feeFieldNames.late}`,
    `${feeFieldNames.broken} + Fees.${feeFieldNames.broken}`,
    `${feeFieldNames.rewind} + Fees.${feeFieldNames.rewind}`,
    `K2Node_MakeStruct_Fees.${feeFieldNames.late} = CallFunc_Add_IntInt_ReturnValue`,
    `K2Node_MakeStruct_Fees.${feeFieldNames.broken} = CallFunc_Add_IntInt_ReturnValue_2`,
    `K2Node_MakeStruct_Fees.${feeFieldNames.rewind} = CallFunc_Add_IntInt_ReturnValue_1`,
    `K2Node_MakeStruct_Fees.${feeFieldNames.consoleLate} = 0`,
    `K2Node_MakeStruct_Fees.${feeFieldNames.consoleBroken} = 0`,
    "Map_Add(Fees Membeship, Membership ID, K2Node_MakeStruct_Fees)",
  ]);
  assertBlueprintFunction(bodyClass, removeFunction, [
    "Membership ID !== 0",
    "if (!CallFunc_NotEqual_IntInt_ReturnValue)\n            return;",
    "Fees Membeship.Remove(Membership ID)",
  ]);

  return {
    artifactType: "membership-fee-mechanics",
    schemaVersion: 1,
    build: {
      steamAppId: rentalEvidence.build.steamAppId,
      steamBuildId: rentalEvidence.build.steamBuildId,
    },
    sources,
    scope: "membership-fee-record",
    evidenceLevel: "decompiled-blueprint",
    runtimeValidation: "not-run",
    storage: {
      container: "map",
      key: "membership-id",
      value: "fee-record",
      evidence: {
        artifactType: "rental-evidence",
        classPath: evidenceClass.path,
        fieldName: storageField.name,
      },
    },
    feeRecord,
    addition: {
      zeroMembershipId: "no-op",
      mapWrite: "add-or-replace",
      fieldUpdates: {
        late: "stored-plus-incoming",
        broken: "stored-plus-incoming",
        rewind: "stored-plus-incoming",
        consoleLate: "set-zero",
        consoleBroken: "set-zero",
      },
      evidence: {
        artifactType: "rental-blueprint-bodies",
        classPath: bodyClass.path,
        functionName: addFunction,
      },
    },
    removal: {
      zeroMembershipId: "no-op",
      operation: "remove-entry",
      evidence: {
        artifactType: "rental-blueprint-bodies",
        classPath: bodyClass.path,
        functionName: removeFunction,
      },
    },
  };
}

function findFeeStruct(input: RentalEvidenceArtifact): RentalStructEvidence {
  const package_ = findOne(
    input.packages,
    (candidate) => candidate.path === feeStructPackagePath,
    `package ${feeStructPackagePath}`,
  );
  return findOne(
    package_.userDefinedStructs,
    (candidate) => candidate.name === feeStructName,
    `struct ${feeStructName}`,
  );
}

function createFeeField(
  feeStruct: RentalStructEvidence,
  name: string,
): MembershipFeeFieldDefinition {
  const field = findOne(feeStruct.fields, (candidate) => candidate.name === name, `field ${name}`);
  const default_ = findOne(
    feeStruct.defaults,
    (candidate) => candidate.name === name,
    `default ${name}`,
  );
  if (
    field.type !== "Int" ||
    field.arrayDimension !== 1 ||
    default_.type !== "IntProperty" ||
    default_.arrayIndex !== 0 ||
    default_.value !== 0
  ) {
    throw new Error(`Fee field ${name} is not a scalar integer with default zero.`);
  }
  return {
    defaultValue: 0,
    evidence: {
      artifactType: "rental-evidence",
      structPath: feeStruct.path,
      fieldName: field.name,
    },
  };
}
