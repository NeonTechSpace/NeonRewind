import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateJsonSchema } from "../src/schema-validation.ts";

const schemaUrl = new URL(
  "../../../../game-data-exporter/schemas/runtime/movie-return-observation.v1.schema.json",
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

test("rejects selected movies when the selector reports not found", async () => {
  await assertRejected((observation) => {
    const result = observation.events[1]?.result;
    if (result === undefined) {
      throw new Error("Fixture selection result is missing.");
    }
    result.found = false;
  });
});

test("rejects more than four selected movies", async () => {
  await assertRejected((observation) => {
    const result = observation.events[1]?.result;
    if (result === undefined) {
      throw new Error("Fixture selection result is missing.");
    }
    result.selectedMovies = [
      movie("movie-0001"),
      movie("movie-0002"),
      movie("movie-0003"),
      movie("movie-0004"),
      movie("movie-0005"),
    ];
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
      name: "NeonRewind.MovieReturnRuntimeCollector",
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
        classPath: "/Game/RentSystem.RentSystem_C",
        objectPath: "/Game/Map.PersistentLevel.RentSystem_C_0",
        functionPath: "/Game/RentSystem.RentSystem_C:Get Movie ready for return",
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
        classPath: "/Game/RentSystem.RentSystem_C",
        objectPath: "/Game/Map.PersistentLevel.RentSystem_C_0",
        functionPath:
          "/Game/RentSystem.RentSystem_C:Get Random List Of Cartridges From Rent List",
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
        classPath: "/Game/AI_Client_Character.AI_Client_Character_C",
        objectPath: "/Game/Map.PersistentLevel.AI_Client_Character_C_0",
        functionPath:
          "/Game/AI_Client_Character.AI_Client_Character_C:Initial creation - Get if I have Product to return",
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

function movie(value: string) {
  return {
    referenceType: "run-local",
    value,
  };
}
