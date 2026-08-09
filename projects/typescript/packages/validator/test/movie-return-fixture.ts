import type {
  MovieReference,
  MovieReturnObservation,
  MovieReturnValidationMechanics,
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

export function movie(value: string): Mutable<MovieReference> {
  return {
    referenceType: "run-local",
    value,
  };
}

export function captured(
  ...movies: Mutable<MovieReference>[]
) {
  return {
    totalCount: movies.length,
    truncated: false,
    movies,
  };
}

export function createMechanics(): MovieReturnValidationMechanics {
  return {
    readiness: {
      transfer: "append-all",
      clearsSource: true,
    },
    selection: {
      candidateQueue: "ready-to-return",
      maximumUniqueMovies: 4,
      deduplication: "add-unique",
      outcomes: {
        weightedFailureWithNoSelection: "not-found-empty",
        weightedFailureWithSelection: "found-selected",
        missingCandidate: "not-found-empty",
      },
      customerFlow: {
        selectedMovies: {
          destination: "customer-inventory",
          removesFromCandidateQueue: true,
        },
      },
    },
  };
}
