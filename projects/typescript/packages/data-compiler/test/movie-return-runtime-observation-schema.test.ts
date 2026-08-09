import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateJsonSchema } from "../src/schema-validation.ts";

const schemaUrl = new URL(
  "../../../../game-data-exporter/schemas/runtime/movie-return-observation.schema.json",
  import.meta.url,
);
const schemaPromise = readFile(schemaUrl, "utf8").then(
  (contents) => JSON.parse(contents) as object,
);

test("accepts a bounded complete movie-return observation", async () => {
  const schema = await schemaPromise;

  assert.doesNotThrow(() =>
    validateJsonSchema(createObservation(), schema, "Movie-return runtime observation"),
  );
});

test("rejects private top-level data outside the observation allowlist", async () => {
  await assertRejected((observation) => {
    (observation as Record<string, unknown>).saveDump = { playerName: "private" };
  });
});

test("rejects private event data outside the event allowlist", async () => {
  await assertRejected((observation) => {
    (observation.events[0] as unknown as Record<string, unknown>).playerName = "private";
  });
});

test("rejects a complete run without every required observation kind", async () => {
  await assertRejected((observation) => {
    observation.events = observation.events.filter(
      (event) => event.eventType !== "customer-return-observed",
    );
  });
});

test("allows an aborted run to retain a partial event sequence", async () => {
  const schema = await schemaPromise;
  const observation = createObservation();
  observation.run.status = "aborted";
  observation.run.statusReason = "user-stopped";
  observation.events = observation.events.slice(0, 1);

  assert.doesNotThrow(() =>
    validateJsonSchema(observation, schema, "Movie-return runtime observation"),
  );
});

test("rejects a completed run with a failure reason", async () => {
  await assertRejected((observation) => {
    observation.run.statusReason = "unknown";
  });
});

test("accepts selected movies when the selector reports not found", async () => {
  const schema = await schemaPromise;
  const observation = createObservation();
  const result = observation.events[1]?.result;
  if (result === undefined) {
    throw new Error("Fixture selection result is missing.");
  }
  result.found = false;

  assert.doesNotThrow(() =>
    validateJsonSchema(observation, schema, "Movie-return runtime observation"),
  );
});

test("accepts more than four selected movies as bounded runtime evidence", async () => {
  const schema = await schemaPromise;
  const observation = createObservation();
  const result = observation.events[1]?.result;
  if (result === undefined) {
    throw new Error("Fixture selection result is missing.");
  }
  result.selectedMovies = captured(
    movie("movie-0001"),
    movie("movie-0002"),
    movie("movie-0003"),
    movie("movie-0004"),
    movie("movie-0005"),
  );

  assert.doesNotThrow(() =>
    validateJsonSchema(observation, schema, "Movie-return runtime observation"),
  );
});

test("accepts duplicate selected movies as bounded runtime evidence", async () => {
  const schema = await schemaPromise;
  const observation = createObservation();
  const result = observation.events[1]?.result;
  if (result === undefined) {
    throw new Error("Fixture selection result is missing.");
  }
  result.selectedMovies = captured(movie("movie-0001"), movie("movie-0001"));

  assert.doesNotThrow(() =>
    validateJsonSchema(observation, schema, "Movie-return runtime observation"),
  );
});

test("accepts an explicitly truncated collection", async () => {
  const schema = await schemaPromise;
  const observation = createObservation();
  const state = observation.events[1]?.preState;
  if (state === undefined) {
    throw new Error("Fixture selection pre-state is missing.");
  }
  state.readyMovies = {
    totalCount: 257,
    truncated: true,
    movies: [movie("movie-0001")],
  };

  assert.doesNotThrow(() =>
    validateJsonSchema(observation, schema, "Movie-return runtime observation"),
  );
});

test("accepts exactly 256 captured movie references", async () => {
  const schema = await schemaPromise;
  const observation = createObservation();
  const state = observation.events[1]?.preState;
  if (state === undefined) {
    throw new Error("Fixture selection pre-state is missing.");
  }
  state.readyMovies = captured(
    ...Array.from({ length: 256 }, (_, index) =>
      movie(`movie-${index.toString().padStart(4, "0")}`),
    ),
  );

  assert.doesNotThrow(() =>
    validateJsonSchema(observation, schema, "Movie-return runtime observation"),
  );
});

test("rejects more than 256 captured movie references", async () => {
  await assertRejected((observation) => {
    const state = observation.events[1]?.preState;
    if (state === undefined) {
      throw new Error("Fixture selection pre-state is missing.");
    }
    state.readyMovies = captured(
      ...Array.from({ length: 257 }, (_, index) =>
        movie(`movie-${index.toString().padStart(4, "0")}`),
      ),
    );
  });
});

test("rejects selected collections outside the structural capture bound", async () => {
  await assertRejected((observation) => {
    const result = observation.events[1]?.result;
    if (result === undefined) {
      throw new Error("Fixture selection result is missing.");
    }
    result.selectedMovies = captured(
      ...Array.from({ length: 257 }, (_, index) =>
        movie(`movie-${index.toString().padStart(4, "0")}`),
      ),
    );
  });
});

test("rejects a malformed target artifact hash", async () => {
  await assertRejected((observation) => {
    observation.targetMechanics.sha256 = "not-a-hash";
  });
});

async function assertRejected(
  mutate: (observation: ReturnType<typeof createObservation>) => void,
): Promise<void> {
  const schema = await schemaPromise;
  const observation = createObservation();
  mutate(observation);

  assert.throws(
    () => validateJsonSchema(observation, schema, "Movie-return runtime observation"),
    /does not match its schema/u,
  );
}

function createObservation() {
  return {
    artifactType: "movie-return-runtime-observation",
    build: {
      steamAppId: "3552140",
      steamBuildId: "23896268",
    },
    targetMechanics: {
      fileName: "movie-return-mechanics.json",
      sizeBytes: 1234,
      sha256: "a".repeat(64),
      artifactType: "movie-return-mechanics",
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
      statusReason: null as string | null,
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
          rentedMovies: captured(movie("movie-0001")),
          readyMovies: captured(),
        },
        postState: {
          rentedMovies: captured(),
          readyMovies: captured(movie("movie-0001")),
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
          rentedMovies: captured(),
          readyMovies: captured(movie("movie-0001")),
        },
        result: {
          found: true,
          selectedMovies: captured(movie("movie-0001")),
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
          readyMovies: captured(movie("movie-0001")),
          customerInventoryMovies: captured(),
        },
        result: {
          found: true,
          selectedMovies: captured(movie("movie-0001")),
        },
        postState: {
          readyMovies: captured(),
          customerInventoryMovies: captured(movie("movie-0001")),
        },
      },
    ],
  };
}

function movie(value: string) {
  return {
    referenceType: "run-local",
    value,
  };
}

function captured(...movies: ReturnType<typeof movie>[]) {
  return {
    totalCount: movies.length,
    truncated: false,
    movies,
  };
}
