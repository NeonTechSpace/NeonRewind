import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { compileMovieReturnMechanics } from "../src/movie-return-mechanics.ts";
import { validateJsonSchema } from "../src/schema-validation.ts";
import {
  createBlueprintBodies,
  createRentalEvidence,
  rentalClassPath,
  rentalSources,
} from "./rental-fixtures.ts";

test("compiles movie readiness and weighted selection without inventing a caller", async () => {
  const mechanics = compileMovieReturnMechanics(
    createRentalEvidence(),
    createBlueprintBodies(),
    rentalSources,
  );

  assert.equal(mechanics.readiness.transfer, "append-all");
  assert.equal(mechanics.readiness.clearsSource, true);
  assert.equal(mechanics.selection.firstAttempt.defaultProbability.value, 0.8);
  assert.equal(mechanics.selection.firstAttempt.override.probability, 0.95);
  assert.equal(mechanics.selection.additionalAttemptProbability.value, 0.3);
  assert.deepEqual(mechanics.selection.callerSearch, {
    coverage: "rental-blueprint-bodies",
    callerFound: false,
  });
  assert.deepEqual(mechanics.selection.evidence, {
    artifactType: "rental-blueprint-bodies",
    classPath: rentalClassPath,
    functionName: "Get Random List Of Cartridges From Rent List",
  });

  const schemaPath = new URL(
    "../../core/schemas/movie-return-mechanics.v1.schema.json",
    import.meta.url,
  );
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  validateJsonSchema(mechanics, schema, "Movie return mechanics");
});

test("rejects a changed new-day entrypoint", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "ExecuteUbergraph_RentSystem(1792)",
    "ExecuteUbergraph_RentSystem(1793)",
  );

  assert.throws(
    () => compileMovieReturnMechanics(createRentalEvidence(), bodies, rentalSources),
    /required static evidence/u,
  );
});

test("rejects a changed readiness transfer", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "Array_Append(Cartridge Base out Ready to Return, Cartridge Base out for Rent)",
    "Array_Append(Cartridge Base out for Rent, Cartridge Base out Ready to Return)",
  );

  assert.throws(
    () => compileMovieReturnMechanics(createRentalEvidence(), bodies, rentalSources),
    /required static evidence/u,
  );
});

test("rejects a changed first-attempt override", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "? 0.95 : CallFunc_SelectFloat_B_ImplicitCast_1",
    "? 0.75 : CallFunc_SelectFloat_B_ImplicitCast_1",
  );

  assert.throws(
    () => compileMovieReturnMechanics(createRentalEvidence(), bodies, rentalSources),
    /required static evidence/u,
  );
});

test("rejects selection that no longer adds unique candidates", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "CallFunc_Array_AddUnique_ReturnValue = List of Cartridge to return.Add",
    "CallFunc_Array_Add_ReturnValue = List of Cartridge to return.Add",
  );

  assert.throws(
    () => compileMovieReturnMechanics(createRentalEvidence(), bodies, rentalSources),
    /required static evidence/u,
  );
});

test("rejects an invalid configured probability", () => {
  const evidence = createRentalEvidence();
  const property = evidence.packages[0]!.blueprintClasses[0]!.classDefault.properties.find(
    (candidate) => candidate.name === "Weight Chance of Returning more Cartridge",
  );
  assert.ok(property);
  property.value = 1.2;

  assert.throws(
    () => compileMovieReturnMechanics(evidence, createBlueprintBodies(), rentalSources),
    /number from zero to one/u,
  );
});

test("rejects a caller added inside the covered rental artifact", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode +=
    "\n        Get Random List Of Cartridges From Rent List(found, items);";

  assert.throws(
    () => compileMovieReturnMechanics(createRentalEvidence(), bodies, rentalSources),
    /caller coverage changed/u,
  );
});
