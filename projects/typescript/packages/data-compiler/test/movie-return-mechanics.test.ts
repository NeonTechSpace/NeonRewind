import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { compileMovieReturnMechanics } from "../src/movie-return-mechanics.ts";
import { validateJsonSchema } from "../src/schema-validation.ts";
import {
  callerClassPath,
  callerFunction,
  createCallerBodies,
  createCallSites,
  movieReturnSources,
} from "./movie-return-fixtures.ts";
import {
  createBlueprintBodies,
  createRentalEvidence,
  rentalClassPath,
} from "./rental-fixtures.ts";

test("compiles movie readiness, weighted selection, and the confirmed customer flow", async () => {
  const mechanics = compileMovieReturnMechanics(
    createRentalEvidence(),
    createBlueprintBodies(),
    createCallSites(),
    createCallerBodies(),
    movieReturnSources,
  );

  assert.equal(mechanics.readiness.transfer, "append-all");
  assert.equal(mechanics.readiness.clearsSource, true);
  assert.equal(mechanics.selection.firstAttempt.defaultProbability.value, 0.8);
  assert.equal(mechanics.selection.firstAttempt.override.probability, 0.95);
  assert.equal(mechanics.selection.additionalAttemptProbability.value, 0.3);
  assert.deepEqual(mechanics.selection.callerSearch, {
    coverage: "all-parsed-blueprint-function-packages",
    candidatePackageCount: 604,
    scannedPackageCount: 604,
    failedPackageCount: 0,
    callerFound: true,
    callSiteCount: 2,
  });
  assert.deepEqual(mechanics.selection.customerFlow, {
    callerClass: "ExampleActor_C",
    callerFunction,
    productPriority: "ready-console-before-movies",
    movieSelectionWhen: "no-ready-console-found",
    selectorCallCount: 2,
    selectorNotFound: "return-without-product",
    selectedMovies: {
      iteration: "all-returned-movies",
      destination: "customer-inventory",
      removesFromCandidateQueue: true,
    },
    evidence: {
      artifactType: "blueprint-caller-bodies",
      classPath: callerClassPath,
      functionName: callerFunction,
      statementIndexes: [465, 519],
    },
  });
  assert.deepEqual(mechanics.selection.evidence, {
    artifactType: "rental-blueprint-bodies",
    classPath: rentalClassPath,
    functionName: "Select Example Items",
  });

  const schemaPath = new URL(
    "../../core/schemas/movie-return-mechanics.v2.schema.json",
    import.meta.url,
  );
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  validateJsonSchema(mechanics, schema, "Movie return mechanics");
});

test("rejects a changed new-day entrypoint", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "ExecuteExampleGraph_ExampleQueueSystem(1792)",
    "ExecuteExampleGraph_ExampleQueueSystem(1793)",
  );

  assert.throws(
    () => compileCurrent({ bodies }),
    /required static evidence/u,
  );
});

test("rejects a changed readiness transfer", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "Array_Append(Example Ready Items, Example Active Items)",
    "Array_Append(Example Active Items, Example Ready Items)",
  );

  assert.throws(
    () => compileCurrent({ bodies }),
    /required static evidence/u,
  );
});

test("rejects a changed first-attempt override", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "? 0.95 : ExampleSymbol_203da61871cf",
    "? 0.75 : ExampleSymbol_203da61871cf",
  );

  assert.throws(
    () => compileCurrent({ bodies }),
    /required static evidence/u,
  );
});

test("rejects selection that no longer adds unique candidates", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "ExampleSymbol_6777d42deb5f = Example Selected Items.Add",
    "ExampleSymbol_560edd151976 = Example Selected Items.Add",
  );

  assert.throws(
    () => compileCurrent({ bodies }),
    /required static evidence/u,
  );
});

test("rejects an invalid configured probability", () => {
  const evidence = createRentalEvidence();
  const property = evidence.packages[0]!.blueprintClasses[0]!.classDefault.properties.find(
    (candidate) => candidate.name === "Example Additional Weight",
  );
  assert.ok(property);
  property.value = 1.2;

  assert.throws(
    () => compileCurrent({ evidence }),
    /number from zero to one/u,
  );
});

test("rejects a caller added inside the covered rental artifact", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode +=
    "\n        Select Example Items(found, items);";

  assert.throws(
    () => compileCurrent({ bodies }),
    /caller coverage changed/u,
  );
});

test("rejects partial caller-search coverage", () => {
  const callSites = createCallSites();
  callSites.coverage = "partial";
  callSites.totals.scannedPackageCount = 603;
  callSites.totals.failedPackageCount = 1;
  callSites.failures.push({ packagePath: "failed.uasset", errorType: "ParseError" });

  assert.throws(() => compileCurrent({ callSites }), /call-site coverage changed/u);
});

test("rejects caller bodies linked to another call-site artifact", () => {
  const callerBodies = createCallerBodies();
  callerBodies.callSites.sha256 = "9".repeat(64);

  assert.throws(
    () => compileCurrent({ callerBodies }),
    /do not reference the supplied call-site artifact/u,
  );
});

test("rejects a changed console-first customer flow", () => {
  const callerBodies = createCallerBodies();
  const function_ = callerBodies.functions[0]!;
  function_.pseudoCode = function_.pseudoCode.replace(
    "Select Example Device(foundConsole, console);",
    "Skip console selection;",
  );
  callerBodies.totals.pseudoCodeCharacterCount = function_.pseudoCode.length;

  assert.throws(() => compileCurrent({ callerBodies }), /required static evidence/u);
});

function compileCurrent(
  overrides: {
    evidence?: ReturnType<typeof createRentalEvidence>;
    bodies?: ReturnType<typeof createBlueprintBodies>;
    callSites?: ReturnType<typeof createCallSites>;
    callerBodies?: ReturnType<typeof createCallerBodies>;
  } = {},
) {
  return compileMovieReturnMechanics(
    overrides.evidence ?? createRentalEvidence(),
    overrides.bodies ?? createBlueprintBodies(),
    overrides.callSites ?? createCallSites(),
    overrides.callerBodies ?? createCallerBodies(),
    movieReturnSources,
  );
}
