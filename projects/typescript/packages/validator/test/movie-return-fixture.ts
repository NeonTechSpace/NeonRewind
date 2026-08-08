import type {
  MovieReference,
  MovieReturnObservation,
} from "../src/index.ts";

export type Mutable<Value> = Value extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : Value extends object
    ? { -readonly [Key in keyof Value]: Mutable<Value[Key]> }
    : Value;

export type MutableObservation = {
  -readonly [Key in keyof MovieReturnObservation]: Mutable<
    MovieReturnObservation[Key]
  >;
};

export function createObservation(): MutableObservation {
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

export function movie(value: string): MovieReference {
  return {
    referenceType: "run-local",
    value,
  };
}
