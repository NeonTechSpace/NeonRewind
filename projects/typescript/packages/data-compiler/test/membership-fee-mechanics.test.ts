import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { compileMembershipFeeMechanics } from "../src/membership-fee-mechanics.ts";
import { validateJsonSchema } from "../src/schema-validation.ts";
import {
  createBlueprintBodies,
  createRentalEvidence,
  rentalClassPath,
  rentalSources,
} from "./rental-fixtures.ts";

test("compiles normalized membership-fee mutations with source locators", async () => {
  const mechanics = compileMembershipFeeMechanics(
    createRentalEvidence(),
    createBlueprintBodies(),
    rentalSources,
  );

  assert.equal(mechanics.storage.key, "membership-id");
  assert.equal(mechanics.addition.zeroMembershipId, "no-op");
  assert.deepEqual(mechanics.addition.fieldUpdates, {
    late: "stored-plus-incoming",
    broken: "stored-plus-incoming",
    rewind: "stored-plus-incoming",
    consoleLate: "set-zero",
    consoleBroken: "set-zero",
  });
  assert.deepEqual(mechanics.removal, {
    zeroMembershipId: "no-op",
    operation: "remove-entry",
    evidence: {
      artifactType: "rental-blueprint-bodies",
      classPath: rentalClassPath,
      functionName: "Remove Fees to Membership",
    },
  });

  const schemaPath = new URL(
    "../../core/schemas/membership-fee-mechanics.v1.schema.json",
    import.meta.url,
  );
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  validateJsonSchema(mechanics, schema, "Membership fee mechanics");
});

test("rejects a changed fee accumulation expression", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "+ Fees.Late_3_6BD289B444BB8B56E87D128D260C2549",
    "- Fees.Late_3_6BD289B444BB8B56E87D128D260C2549",
  );

  assert.throws(
    () => compileMembershipFeeMechanics(createRentalEvidence(), bodies, rentalSources),
    /required static evidence/u,
  );
});

test("rejects a changed console-fee reset", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "ConsoleLate_10_1326E6A34C65237C35667B88D7C972DA = 0",
    "ConsoleLate_10_1326E6A34C65237C35667B88D7C972DA = 1",
  );

  assert.throws(
    () => compileMembershipFeeMechanics(createRentalEvidence(), bodies, rentalSources),
    /required static evidence/u,
  );
});

test("rejects a changed removal target", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "Fees Membeship.Remove(Membership ID)",
    "Other Fees.Remove(Membership ID)",
  );

  assert.throws(
    () => compileMembershipFeeMechanics(createRentalEvidence(), bodies, rentalSources),
    /required static evidence/u,
  );
});

test("rejects a changed zero-membership guard", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "if (!CallFunc_NotEqual_IntInt_ReturnValue)",
    "if (CallFunc_NotEqual_IntInt_ReturnValue)",
  );

  assert.throws(
    () => compileMembershipFeeMechanics(createRentalEvidence(), bodies, rentalSources),
    /required static evidence/u,
  );
});

test("rejects a nonzero fee-record default", () => {
  const evidence = createRentalEvidence();
  evidence.packages[1]!.userDefinedStructs[0]!.defaults[0]!.value = 1;

  assert.throws(
    () => compileMembershipFeeMechanics(evidence, createBlueprintBodies(), rentalSources),
    /scalar integer with default zero/u,
  );
});

test("rejects an unclassified fee-record field", () => {
  const evidence = createRentalEvidence();
  evidence.packages[1]!.userDefinedStructs[0]!.fields.push({
    name: "FutureFee",
    type: "Int",
    arrayDimension: 1,
  });
  evidence.packages[1]!.userDefinedStructs[0]!.defaults.push({
    name: "FutureFee",
    type: "IntProperty",
    arrayIndex: 0,
    value: 0,
  });

  assert.throws(
    () => compileMembershipFeeMechanics(evidence, createBlueprintBodies(), rentalSources),
    /exactly five fields and defaults/u,
  );
});
