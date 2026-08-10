import assert from "node:assert/strict";
import test from "node:test";

import { ConsoleReturnMechanicsSchema } from "@neonretrorewind/core";

import { compileConsoleReturnMechanics } from "../src/console-return-mechanics.ts";
import {
  createBlueprintBodies,
  createRentalEvidence,
  rentalClassPath,
  rentalSources,
} from "./rental-fixtures.ts";

test("compiles normalized console-return facts with source locators", async () => {
  const mechanics = compileConsoleReturnMechanics(
    createRentalEvidence(),
    createBlueprintBodies(),
    rentalSources,
  );

  assert.equal(mechanics.configuration.rentalDurationDays.value, 2);
  assert.equal(mechanics.eligibility.elapsedDays.operator, "greater-than-or-equal");
  assert.equal(mechanics.eligibility.missingWeatherActorResult, false);
  assert.deepEqual(mechanics.queueTransition, {
    when: "eligible",
    source: "rented",
    destination: "ready-to-return",
    removesFromSource: true,
    evidence: {
      artifactType: "rental-blueprint-bodies",
      classPath: rentalClassPath,
      functionName: "Prepare Example Devices",
    },
  });

  assert.equal(ConsoleReturnMechanicsSchema.allows(mechanics), true);
});

test("rejects changed eligibility bytecode evidence", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    ">= Example Elapsed Periods",
    "> Example Elapsed Periods",
  );

  assert.throws(
    () => compileConsoleReturnMechanics(createRentalEvidence(), bodies, rentalSources),
    /required static evidence/u,
  );
});

test("rejects eligibility evidence found only in another function", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode
    .replace(
      "        >= Example Elapsed Periods\n",
      "",
    )
    .replace(
      "        Example Active Devices.Remove(ExampleSymbol_4bb2d3edf81f)\n",
      [
        "        Example Active Devices.Remove(ExampleSymbol_4bb2d3edf81f)",
        "        >= Example Elapsed Periods",
        "",
      ].join("\n"),
    );

  assert.throws(
    () => compileConsoleReturnMechanics(createRentalEvidence(), bodies, rentalSources),
    /required static evidence/u,
  );
});

test("rejects source artifacts from different builds", () => {
  const bodies = createBlueprintBodies();
  bodies.build.steamBuildId = "different";

  assert.throws(
    () => compileConsoleReturnMechanics(createRentalEvidence(), bodies, rentalSources),
    /same build and mappings/u,
  );
});

test("rejects a non-positive rental duration", () => {
  const evidence = createRentalEvidence();
  evidence.packages[0]!.blueprintClasses[0]!.classDefault.properties[0]!.value = 0;

  assert.throws(
    () => compileConsoleReturnMechanics(evidence, createBlueprintBodies(), rentalSources),
    /positive integer default/u,
  );
});
