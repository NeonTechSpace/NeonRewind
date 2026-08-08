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
      functionName: "ExampleRemoveFee",
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
    "+ ExampleFeeRecord.ExampleField09_0_00000000000000000000000000000000",
    "- ExampleFeeRecord.ExampleField09_0_00000000000000000000000000000000",
  );

  assert.throws(
    () => compileMembershipFeeMechanics(createRentalEvidence(), bodies, rentalSources),
    /required static evidence/u,
  );
});

test("rejects a changed console-fee reset", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "ExampleField06_0_00000000000000000000000000000000 = 0",
    "ExampleField06_0_00000000000000000000000000000000 = 1",
  );

  assert.throws(
    () => compileMembershipFeeMechanics(createRentalEvidence(), bodies, rentalSources),
    /required static evidence/u,
  );
});

test("rejects a changed removal target", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "ExampleFeeMap.Remove(ExampleMemberKey)",
    "Other ExampleFeeRecord.Remove(ExampleMemberKey)",
  );

  assert.throws(
    () => compileMembershipFeeMechanics(createRentalEvidence(), bodies, rentalSources),
    /required static evidence/u,
  );
});

test("rejects a changed zero-membership guard", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "if (!ExampleSymbol_78567b0964f3)",
    "if (ExampleSymbol_78567b0964f3)",
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
