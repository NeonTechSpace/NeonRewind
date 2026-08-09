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
  createFunctionTrace,
  movieReturnSources,
} from "./movie-return-fixtures.ts";
import { createRentalFunctionTrace } from "./movie-rental-trace-fixture.ts";
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
    createFunctionTrace(),
    createRentalFunctionTrace(),
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
      artifactType: "blueprint-function-trace",
      classPath: callerClassPath,
      entryFunction: "ReceiveBeginPlay",
      entryPoint: 68,
      eventGraphFunction: "ExecuteExampleGraph_ExampleActor",
      customerFunction: callerFunction,
      statementIndexes: {
        eventGraphEntry: 68,
        customerCall: 49,
        consoleSelectionCall: 230,
        consoleFailureBranch: 262,
        consoleFailureTarget: 399,
        selectorCalls: [465, 519],
        selectorFailureBranch: 551,
        loopHeader: 607,
        loopCondition: 704,
        inventoryAdd: 941,
        readyQueueRemoval: 987,
        loopExit: 1456,
        loopBack: 1541,
      },
    },
  });
  assert.deepEqual(mechanics.readiness.evidence, {
    artifactType: "rental-function-trace",
    classPath: rentalClassPath,
    newDayFunction: "Example Period Event",
    readinessFunction: "Prepare Example Items",
    eventGraphFunction: "ExecuteExampleGraph_ExampleQueueSystem",
    statementIndexes: {
      newDayCall: 18,
      newDayEntry: 1792,
      movieReadinessCall: 1803,
      consoleReadinessCall: 1817,
      readinessCall: 0,
      readinessEntry: 2592,
      transfer: 1854,
      clearSource: 1904,
    },
  });
  assert.deepEqual(mechanics.selection.evidence, {
    artifactType: "rental-function-trace",
    classPath: rentalClassPath,
    functionName: "Select Example Items",
    statementIndexes: {
      limitLength: 40,
      limitComparison: 69,
      limitBranch: 93,
      rentedLength: 190,
      rentedMinimum: 219,
      firstProbability: 290,
      selectedLength: 367,
      firstAttemptCondition: 396,
      additionalProbability: 467,
      weightedDecision: 543,
      weightedFailure: 562,
      candidateChoice: 598,
      candidateValidity: 645,
      missingCandidate: 669,
      selectedChoice: 705,
      addUnique: 782,
      retry: 810,
      resultLength: 855,
      resultCondition: 884,
      emptyResult: 908,
    },
  });

  const schemaPath = new URL(
    "../../core/schemas/movie-return-mechanics.schema.json",
    import.meta.url,
  );
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  validateJsonSchema(mechanics, schema, "Movie return mechanics");
});

test("does not parse rental Blueprint pseudocode", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    "Array_Append(Example Ready Items, Example Active Items)",
    "No readable readiness body remains.",
  );

  assert.doesNotThrow(() => compileCurrent({ bodies }));
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
    /source identities do not match/u,
  );
});

test("does not parse customer-flow pseudocode", () => {
  const callerBodies = createCallerBodies();
  const function_ = callerBodies.functions[0]!;
  function_.pseudoCode = function_.pseudoCode.replace(
    "Select Example Device(foundConsole, console);",
    "Skip console selection;",
  );
  callerBodies.totals.pseudoCodeCharacterCount = function_.pseudoCode.length;

  assert.doesNotThrow(() => compileCurrent({ callerBodies }));
});

test("rejects a changed typed console-result branch", () => {
  const functionTrace = createFunctionTrace();
  const customer = functionTrace.functions.find(
    (function_) => function_.functionName === callerFunction,
  );
  const branchResult = customer?.nodes.find(
    (node) => node.statementIndex === 267,
  );
  assert.ok(branchResult);
  branchResult.symbol = "another result";

  assert.throws(
    () => compileCurrent({ functionTrace }),
    /trace symbol changed/u,
  );
});

test("rejects a changed typed BeginPlay entrypoint", () => {
  const functionTrace = createFunctionTrace();
  const beginPlay = functionTrace.functions.find(
    (function_) => function_.functionName === "ReceiveBeginPlay",
  );
  const entryNode = beginPlay?.nodes[0];
  assert.ok(entryNode?.call);
  entryNode.call = {
    ...entryNode.call,
    integerArguments: [{ position: 0, value: "69" }],
  };

  assert.throws(
    () => compileCurrent({ functionTrace }),
    /BeginPlay entry changed/u,
  );
});

test("rejects a changed typed event-graph route", () => {
  const functionTrace = createFunctionTrace();
  const eventGraph = functionTrace.functions.find(
    (function_) => function_.functionName === "ExecuteExampleGraph_ExampleActor",
  );
  const entryJump = eventGraph?.nodes.find((node) => node.statementIndex === 68);
  assert.ok(entryJump?.jump);
  entryJump.jump = {
    ...entryJump.jump,
    targets: [{ edge: "codeOffset", offset: 11 }],
  };

  assert.throws(
    () => compileCurrent({ functionTrace }),
    /trace branch changed/u,
  );
});

test("rejects a changed typed selector-result branch", () => {
  const functionTrace = createFunctionTrace();
  const customer = functionTrace.functions.find(
    (function_) => function_.functionName === callerFunction,
  );
  const selectorResult = customer?.nodes.find((node) => node.statementIndex === 552);
  assert.ok(selectorResult);
  selectorResult.symbol = "another selector result";

  assert.throws(
    () => compileCurrent({ functionTrace }),
    /trace symbol changed/u,
  );
});

test("rejects a changed typed movie loop", () => {
  const functionTrace = createFunctionTrace();
  const customer = functionTrace.functions.find(
    (function_) => function_.functionName === callerFunction,
  );
  const loopBack = customer?.nodes.find((node) => node.statementIndex === 1541);
  assert.ok(loopBack?.jump);
  loopBack.jump = {
    ...loopBack.jump,
    targets: [{ edge: "codeOffset", offset: 608 }],
  };

  assert.throws(
    () => compileCurrent({ functionTrace }),
    /trace branch changed/u,
  );
});

test("rejects changed typed ready-queue removal", () => {
  const functionTrace = createFunctionTrace();
  const customer = functionTrace.functions.find(
    (function_) => function_.functionName === callerFunction,
  );
  const removal = customer?.nodes.find((node) => node.statementIndex === 987);
  assert.ok(removal?.call);
  removal.call = { ...removal.call, functionName: "Keep Product Ready" };

  assert.throws(
    () => compileCurrent({ functionTrace }),
    /trace call changed/u,
  );
});

test("rejects a function trace linked to another caller-body artifact", () => {
  const functionTrace = createFunctionTrace();
  functionTrace.callerBodies[2]!.sha256 = "0".repeat(64);

  assert.throws(
    () => compileCurrent({ functionTrace }),
    /does not reference the supplied caller bodies/u,
  );
});

function compileCurrent(
  overrides: {
    evidence?: ReturnType<typeof createRentalEvidence>;
    bodies?: ReturnType<typeof createBlueprintBodies>;
    callSites?: ReturnType<typeof createCallSites>;
    callerBodies?: ReturnType<typeof createCallerBodies>;
    functionTrace?: ReturnType<typeof createFunctionTrace>;
    rentalFunctionTrace?: ReturnType<typeof createRentalFunctionTrace>;
  } = {},
) {
  return compileMovieReturnMechanics(
    overrides.evidence ?? createRentalEvidence(),
    overrides.bodies ?? createBlueprintBodies(),
    overrides.callSites ?? createCallSites(),
    overrides.callerBodies ?? createCallerBodies(),
    overrides.functionTrace ?? createFunctionTrace(),
    overrides.rentalFunctionTrace ?? createRentalFunctionTrace(),
    movieReturnSources,
  );
}
