import type {
  MembershipFeeFieldDefinition,
  MembershipFeeMechanics,
} from "@neonretrorewind/core";
import { MembershipFeeMechanicsSchema } from "@neonretrorewind/core";

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
  "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleFeeRecord.uasset";
const feeStructName = "ExampleFeeRecord";
const feeMapField = "ExampleFeeMap";
const feeMapType =
  "Map<Int, Struct<ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleFeeRecord.ExampleFeeRecord>>";
const addFunction = "ExampleAddFee";
const removeFunction = "ExampleRemoveFee";

const feeFieldNames = {
  late: "ExampleField09_0_00000000000000000000000000000000",
  broken: "ExampleField04_0_00000000000000000000000000000000",
  rewind: "ExampleField13_0_00000000000000000000000000000000",
  consoleLate: "ExampleField06_0_00000000000000000000000000000000",
  consoleBroken: "ExampleField05_0_00000000000000000000000000000000",
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
    "ExampleMemberKey !== 0",
    "if (!ExampleSymbol_78567b0964f3)\n            return;",
    "Map_Find(ExampleFeeMap, ExampleMemberKey, ExampleSymbol_c49af706dd70)",
    `${feeFieldNames.late} + ExampleFeeRecord.${feeFieldNames.late}`,
    `${feeFieldNames.broken} + ExampleFeeRecord.${feeFieldNames.broken}`,
    `${feeFieldNames.rewind} + ExampleFeeRecord.${feeFieldNames.rewind}`,
    `ExampleConstructExampleFeeRecord.${feeFieldNames.late} = ExampleSymbol_fbf99360b7d0`,
    `ExampleConstructExampleFeeRecord.${feeFieldNames.broken} = ExampleSymbol_984af5b2d439`,
    `ExampleConstructExampleFeeRecord.${feeFieldNames.rewind} = ExampleSymbol_68a76c00e78c`,
    `ExampleConstructExampleFeeRecord.${feeFieldNames.consoleLate} = 0`,
    `ExampleConstructExampleFeeRecord.${feeFieldNames.consoleBroken} = 0`,
    "Map_Add(ExampleFeeMap, ExampleMemberKey, ExampleConstructExampleFeeRecord)",
  ]);
  assertBlueprintFunction(bodyClass, removeFunction, [
    "ExampleMemberKey !== 0",
    "if (!ExampleSymbol_78567b0964f3)\n            return;",
    "ExampleFeeMap.Remove(ExampleMemberKey)",
  ]);

  return MembershipFeeMechanicsSchema.assert({
    artifactType: "membership-fee-mechanics",
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
  });
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
