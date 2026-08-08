import assert from "node:assert/strict";
import test from "node:test";

import { compileMovieReturnMechanics } from "../src/movie-return-mechanics.ts";
import { createRentalFunctionTrace } from "./movie-rental-trace-fixture.ts";
import {
  createCallerBodies,
  createCallSites,
  createFunctionTrace,
  movieReturnSources,
} from "./movie-return-fixtures.ts";
import { createBlueprintBodies, createRentalEvidence } from "./rental-fixtures.ts";

test("rejects a changed typed rental new-day entrypoint", () => {
  const trace = createRentalFunctionTrace();
  const entry = findNode(trace, "Example Period Event", 18);
  assert.ok(entry.call);
  entry.call.integerArguments = [{ position: 0, value: "1793" }];

  assert.throws(() => compileCurrent(trace), /entry changed/u);
});

test("rejects a changed typed readiness transfer", () => {
  const trace = createRentalFunctionTrace();
  const append = findNode(trace, "ExecuteExampleGraph_ExampleQueueSystem", 1854);
  const destination = findChild(trace, "ExecuteExampleGraph_ExampleQueueSystem", append.nodeIndex, "Parameters[0]");
  destination.symbol = "Example Active Items";

  assert.throws(() => compileCurrent(trace), /trace symbol changed/u);
});

test("rejects a changed typed first-attempt override", () => {
  const trace = createRentalFunctionTrace();
  const select = findNode(trace, "Select Example Items", 290);
  const probability = findChild(
    trace,
    "Select Example Items",
    select.nodeIndex,
    "Parameters[0]",
  );
  assert.ok(probability.literal);
  probability.literal.value = "0.75";

  assert.throws(() => compileCurrent(trace), /trace literal changed/u);
});

test("rejects typed selection that no longer adds unique candidates", () => {
  const trace = createRentalFunctionTrace();
  const addUnique = findNode(trace, "Select Example Items", 782);
  assert.ok(addUnique.call);
  addUnique.call.functionName = "Array_Add";

  assert.throws(() => compileCurrent(trace), /trace call changed/u);
});

test("rejects a changed typed weighted-failure route", () => {
  const trace = createRentalFunctionTrace();
  const branch = findNode(trace, "Select Example Items", 562);
  assert.ok(branch.jump);
  branch.jump.targets = [{ edge: "codeOffset", offset: 816 }];

  assert.throws(() => compileCurrent(trace), /trace branch changed/u);
});

test("rejects a changed typed empty-result assignment", () => {
  const trace = createRentalFunctionTrace();
  const assignment = findNode(trace, "Select Example Items", 976);
  const empty = findChild(
    trace,
    "Select Example Items",
    assignment.nodeIndex,
    "Assignment",
  );
  empty.opcode = "EX_LocalVariable";

  assert.throws(() => compileCurrent(trace), /trace operation changed/u);
});

test("rejects a rental trace linked to another Blueprint-body artifact", () => {
  const trace = createRentalFunctionTrace();
  trace.rentalBlueprintBodies.sha256 = "0".repeat(64);

  assert.throws(
    () => compileCurrent(trace),
    /does not reference the supplied rental Blueprint bodies/u,
  );
});

function compileCurrent(trace: ReturnType<typeof createRentalFunctionTrace>) {
  return compileMovieReturnMechanics(
    createRentalEvidence(),
    createBlueprintBodies(),
    createCallSites(),
    createCallerBodies(),
    createFunctionTrace(),
    trace,
    movieReturnSources,
  );
}

function findNode(
  trace: ReturnType<typeof createRentalFunctionTrace>,
  functionName: string,
  statementIndex: number,
) {
  const function_ = trace.functions.find((candidate) => candidate.functionName === functionName);
  assert.ok(function_);
  const node = function_.nodes.find((candidate) => candidate.statementIndex === statementIndex);
  assert.ok(node);
  return node;
}

function findChild(
  trace: ReturnType<typeof createRentalFunctionTrace>,
  functionName: string,
  parentNodeIndex: number,
  edge: string,
) {
  const function_ = trace.functions.find((candidate) => candidate.functionName === functionName);
  assert.ok(function_);
  const node = function_.nodes.find(
    (candidate) => candidate.parentNodeIndex === parentNodeIndex && candidate.edge === edge,
  );
  assert.ok(node);
  return node;
}
