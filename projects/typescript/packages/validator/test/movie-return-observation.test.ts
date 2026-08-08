import assert from "node:assert/strict";
import test from "node:test";

import {
  validateMovieReturnObservation,
  type CustomerReturnObservationEvent,
  type MovieReference,
  type MovieReturnObservation,
  type ReadinessObservationEvent,
  type SelectionObservationEvent,
} from "../src/index.ts";

test("passes a complete observation with matching state transitions", () => {
  const report = validateMovieReturnObservation(createObservation());

  assert.deepEqual(report, {
    outcome: "passed",
    checkedEventCount: 3,
    issues: [],
  });
});

test("marks an aborted partial observation incomplete", () => {
  const observation = createObservation();
  observation.run.status = "aborted";
  observation.run.statusReason = "user-stopped";
  observation.events = observation.events.slice(0, 1);

  const report = validateMovieReturnObservation(observation);

  assert.equal(report.outcome, "incomplete");
  assert.deepEqual(issueCodes(report), ["run-not-complete"]);
});

test("rejects a complete observation with a missing event kind", () => {
  const observation = createObservation();
  observation.events = observation.events.filter(
    (event) => event.eventType !== "selection-observed",
  );

  const report = validateMovieReturnObservation(observation);

  assert.equal(report.outcome, "mismatch");
  assert.ok(issueCodes(report).includes("complete-run-missing-event"));
});

test("rejects nonconsecutive event sequence numbers", () => {
  const observation = createObservation();
  selection(observation).sequence = 4;

  const report = validateMovieReturnObservation(observation);

  assert.equal(report.outcome, "mismatch");
  assert.ok(issueCodes(report).includes("event-sequence-changed"));
});

test("rejects an event timestamp outside the run", () => {
  const observation = createObservation();
  readiness(observation).observedAtUtc = "2026-08-08T11:59:59.000Z";

  const report = validateMovieReturnObservation(observation);

  assert.equal(report.outcome, "mismatch");
  assert.ok(issueCodes(report).includes("event-time-before-run"));
});

test("rejects readiness processing with an empty rented queue", () => {
  const observation = createObservation();
  readiness(observation).preState.rentedMovies = [];

  const report = validateMovieReturnObservation(observation);

  assert.equal(report.outcome, "mismatch");
  assert.ok(issueCodes(report).includes("readiness-source-empty"));
});

test("rejects a readiness result that retains rented movies", () => {
  const observation = createObservation();
  readiness(observation).postState.rentedMovies = [movie("movie-0001")];

  const report = validateMovieReturnObservation(observation);

  assert.equal(report.outcome, "mismatch");
  assert.ok(issueCodes(report).includes("readiness-source-not-cleared"));
});

test("rejects a readiness result that loses a transferred movie", () => {
  const observation = createObservation();
  readiness(observation).postState.readyMovies = [];

  const report = validateMovieReturnObservation(observation);

  assert.equal(report.outcome, "mismatch");
  assert.ok(issueCodes(report).includes("readiness-destination-mismatch"));
});

test("rejects a selection outside the ready queue", () => {
  const observation = createObservation();
  selection(observation).result.selectedMovies = [movie("movie-9999")];

  const report = validateMovieReturnObservation(observation);

  assert.equal(report.outcome, "mismatch");
  assert.ok(issueCodes(report).includes("selection-outside-ready-queue"));
});

test("rejects a successful customer return with the wrong ready queue", () => {
  const observation = createObservation();
  customerReturn(observation).postState.readyMovies = [movie("movie-0001")];

  const report = validateMovieReturnObservation(observation);

  assert.equal(report.outcome, "mismatch");
  assert.ok(issueCodes(report).includes("customer-ready-queue-mismatch"));
});

test("rejects a successful customer return with the wrong inventory", () => {
  const observation = createObservation();
  customerReturn(observation).postState.customerInventoryMovies = [];

  const report = validateMovieReturnObservation(observation);

  assert.equal(report.outcome, "mismatch");
  assert.ok(issueCodes(report).includes("customer-inventory-mismatch"));
});

test("rejects state mutation after a failed customer selection", () => {
  const observation = createObservation();
  const event = customerReturn(observation);
  event.result = { found: false, selectedMovies: [] };
  event.postState.readyMovies = [];

  const report = validateMovieReturnObservation(observation);

  assert.equal(report.outcome, "mismatch");
  assert.ok(issueCodes(report).includes("customer-ready-queue-mismatch"));
});

function issueCodes(
  report: ReturnType<typeof validateMovieReturnObservation>,
): readonly string[] {
  return report.issues.map((issue) => issue.code);
}

function createObservation(): MutableObservation {
  return {
    artifactType: "movie-return-runtime-observation",
    schemaVersion: 1,
    build: {
      steamAppId: "3552140",
      steamBuildId: "23896268",
    },
    targetMechanics: {
      fileName: "movie-return-mechanics.v4.json",
      sizeBytes: 1234,
      sha256: "a".repeat(64),
      artifactType: "movie-return-mechanics",
      schemaVersion: 4,
    },
    collector: {
      name: "NeonRetroRewind.MovieReturnRuntimeCollector",
      version: "0.1.0",
      runtimeHost: {
        name: "test-host",
        version: "1.0.0",
      },
    },
    run: {
      runId: "20260808T120000Z-0123abcd",
      startedAtUtc: "2026-08-08T12:00:00.000Z",
      finishedAtUtc: "2026-08-08T12:05:00.000Z",
      status: "complete",
      statusReason: null,
    },
    events: [
      {
        sequence: 1,
        eventType: "readiness-observed",
        observedAtUtc: "2026-08-08T12:01:00.000Z",
        classPath: "/Game/ExampleQueueSystem.ExampleQueueSystem_C",
        objectPath: "/Game/Map.PersistentLevel.ExampleQueueSystem_C_0",
        functionPath: "/Game/ExampleQueueSystem.ExampleQueueSystem_C:Prepare Example Items",
        preState: {
          rentedMovies: [movie("movie-0001")],
          readyMovies: [],
        },
        postState: {
          rentedMovies: [],
          readyMovies: [movie("movie-0001")],
        },
      },
      {
        sequence: 2,
        eventType: "selection-observed",
        observedAtUtc: "2026-08-08T12:02:00.000Z",
        classPath: "/Game/ExampleQueueSystem.ExampleQueueSystem_C",
        objectPath: "/Game/Map.PersistentLevel.ExampleQueueSystem_C_0",
        functionPath:
          "/Game/ExampleQueueSystem.ExampleQueueSystem_C:Select Example Items",
        preState: {
          rentedMovies: [],
          readyMovies: [movie("movie-0001")],
        },
        result: {
          found: true,
          selectedMovies: [movie("movie-0001")],
        },
      },
      {
        sequence: 3,
        eventType: "customer-return-observed",
        observedAtUtc: "2026-08-08T12:03:00.000Z",
        classPath: "/Game/ExampleActor.ExampleActor_C",
        objectPath: "/Game/Map.PersistentLevel.ExampleActor_C_0",
        functionPath:
          "/Game/ExampleActor.ExampleActor_C:Initialize Example Return",
        preState: {
          readyMovies: [movie("movie-0001")],
          customerInventoryMovies: [],
        },
        result: {
          found: true,
          selectedMovies: [movie("movie-0001")],
        },
        postState: {
          readyMovies: [],
          customerInventoryMovies: [movie("movie-0001")],
        },
      },
    ],
  };
}

type MutableObservation = {
  -readonly [Key in keyof MovieReturnObservation]: Mutable<
    MovieReturnObservation[Key]
  >;
};

type Mutable<Value> = Value extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : Value extends object
    ? { -readonly [Key in keyof Value]: Mutable<Value[Key]> }
    : Value;

function readiness(observation: MutableObservation): Mutable<ReadinessObservationEvent> {
  const event = observation.events.find(
    (candidate) => candidate.eventType === "readiness-observed",
  );
  if (event?.eventType !== "readiness-observed") {
    throw new Error("Fixture readiness event is missing.");
  }
  return event;
}

function selection(observation: MutableObservation): Mutable<SelectionObservationEvent> {
  const event = observation.events.find(
    (candidate) => candidate.eventType === "selection-observed",
  );
  if (event?.eventType !== "selection-observed") {
    throw new Error("Fixture selection event is missing.");
  }
  return event;
}

function customerReturn(
  observation: MutableObservation,
): Mutable<CustomerReturnObservationEvent> {
  const event = observation.events.find(
    (candidate) => candidate.eventType === "customer-return-observed",
  );
  if (event?.eventType !== "customer-return-observed") {
    throw new Error("Fixture customer-return event is missing.");
  }
  return event;
}

function movie(value: string): MovieReference {
  return {
    referenceType: "run-local",
    value,
  };
}
