import { type } from "arktype";
import {
  withContains,
  withExactlyOneOf,
  without,
} from "../contract-constraints.ts";

const $definitionBuild = type({
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();
const $definitionSha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const $definitionTargetMechanics = type({
  fileName: type.unit("movie-return-mechanics.json"),
  sizeBytes: type("number.integer").atLeast(1),
  sha256: $definitionSha256,
  artifactType: type.unit("movie-return-mechanics"),
  "+": "reject",
}).readonly();
const $definitionVersion = type("string").atLeastLength(1).atMostLength(100);
const $definitionCollector = type({
  name: type.unit("NeonRetroRewind.MovieReturnRuntimeCollector"),
  version: $definitionVersion,
  runtimeHost: type({
    name: type("string").atLeastLength(1).atMostLength(100),
    version: $definitionVersion,
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();
const $definitionUtcTimestamp = type("string").matching(
  new RegExp(
    "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]{3,7})?Z$",
  ),
);
const $definitionStatusReason = type.enumerated(
  "user-stopped",
  "game-closed",
  "object-unavailable",
  "hook-failed",
  "write-failed",
  "validation-failed",
  "collector-error",
  "unknown",
);
const $definitionRun = type.and(
  type({
    runId: type("string").matching(
      new RegExp("^[0-9]{8}T[0-9]{6}Z-[0-9a-f]{8}$"),
    ),
    startedAtUtc: $definitionUtcTimestamp,
    finishedAtUtc: withExactlyOneOf(
      type.or($definitionUtcTimestamp, type("null")),
      [$definitionUtcTimestamp, type("null")],
    ),
    status: type.enumerated("complete", "aborted", "failed"),
    statusReason: withExactlyOneOf(
      type.or($definitionStatusReason, type("null")),
      [$definitionStatusReason, type("null")],
    ),
    "+": "reject",
  }).readonly(),
  type.or(
    type({ status: type.unit("complete") })
      .readonly()
      .and(
        type({
          "finishedAtUtc?": $definitionUtcTimestamp,
          "statusReason?": type("null"),
        }).readonly(),
      ),
    without(
      type("unknown"),
      type({ status: type.unit("complete") }).readonly(),
    ).and(type({ "statusReason?": $definitionStatusReason }).readonly()),
  ),
);
const $definitionSequence = type("number.integer").atLeast(1).atMost(256);
const $definitionRuntimePath = type("string")
  .atLeastLength(1)
  .atMostLength(1024);
const $definitionMovieReference = withExactlyOneOf(
  type.or(
    type({
      referenceType: type.unit("object-path"),
      value: $definitionRuntimePath,
      "+": "reject",
    }).readonly(),
    type({
      referenceType: type.unit("run-local"),
      value: type("string").matching(new RegExp("^movie-[0-9]{4}$")),
      "+": "reject",
    }).readonly(),
  ),
  [
    type({
      referenceType: type.unit("object-path"),
      value: $definitionRuntimePath,
      "+": "reject",
    }).readonly(),
    type({
      referenceType: type.unit("run-local"),
      value: type("string").matching(new RegExp("^movie-[0-9]{4}$")),
      "+": "reject",
    }).readonly(),
  ],
);
const $definitionMovieCollection = type({
  totalCount: type("number.integer").atLeast(0).atMost(2147483647),
  truncated: type("boolean"),
  movies: $definitionMovieReference.array().readonly().atMostLength(256),
  "+": "reject",
}).readonly();
const $definitionRentalQueues = type({
  rentedMovies: $definitionMovieCollection,
  readyMovies: $definitionMovieCollection,
  "+": "reject",
}).readonly();
const $definitionReadinessEvent = type({
  sequence: $definitionSequence,
  eventType: type.unit("readiness-observed"),
  observedAtUtc: $definitionUtcTimestamp,
  classPath: $definitionRuntimePath,
  objectPath: $definitionRuntimePath,
  functionPath: $definitionRuntimePath,
  preState: $definitionRentalQueues,
  postState: $definitionRentalQueues,
  "+": "reject",
}).readonly();
const $definitionSelectionResult = type({
  found: type("boolean"),
  selectedMovies: $definitionMovieCollection,
  "+": "reject",
}).readonly();
const $definitionSelectionEvent = type({
  sequence: $definitionSequence,
  eventType: type.unit("selection-observed"),
  observedAtUtc: $definitionUtcTimestamp,
  classPath: $definitionRuntimePath,
  objectPath: $definitionRuntimePath,
  functionPath: $definitionRuntimePath,
  preState: $definitionRentalQueues,
  result: $definitionSelectionResult,
  "+": "reject",
}).readonly();
const $definitionCustomerState = type({
  readyMovies: $definitionMovieCollection,
  customerInventoryMovies: $definitionMovieCollection,
  "+": "reject",
}).readonly();
const $definitionCustomerReturnEvent = type({
  sequence: $definitionSequence,
  eventType: type.unit("customer-return-observed"),
  observedAtUtc: $definitionUtcTimestamp,
  classPath: $definitionRuntimePath,
  objectPath: $definitionRuntimePath,
  functionPath: $definitionRuntimePath,
  preState: $definitionCustomerState,
  result: $definitionSelectionResult,
  postState: $definitionCustomerState,
  "+": "reject",
}).readonly();

export const MovieReturnObservationSchema = type.and(
  type({
    artifactType: type.unit("movie-return-runtime-observation"),
    build: $definitionBuild,
    targetMechanics: $definitionTargetMechanics,
    collector: $definitionCollector,
    run: $definitionRun,
    events: withExactlyOneOf(
      type.or(
        $definitionReadinessEvent,
        $definitionSelectionEvent,
        $definitionCustomerReturnEvent,
      ),
      [
        $definitionReadinessEvent,
        $definitionSelectionEvent,
        $definitionCustomerReturnEvent,
      ],
    )
      .array()
      .readonly()
      .atMostLength(256),
    "+": "reject",
  }).readonly(),
  type.or(
    type({ run: type({ status: type.unit("complete") }).readonly() })
      .readonly()
      .and(
        type({
          "events?": type.and(
            withContains(
              type("unknown").array().readonly(),
              type({ eventType: type.unit("readiness-observed") }).readonly(),
              1,
            ),
            withContains(
              type("unknown").array().readonly(),
              type({ eventType: type.unit("selection-observed") }).readonly(),
              1,
            ),
            withContains(
              type("unknown").array().readonly(),
              type({
                eventType: type.unit("customer-return-observed"),
              }).readonly(),
              1,
            ),
          ),
        }).readonly(),
      ),
    without(
      type("unknown"),
      type({
        run: type({ status: type.unit("complete") }).readonly(),
      }).readonly(),
    ).and(type("unknown")),
  ),
);
export type MovieReturnObservation = typeof MovieReturnObservationSchema.infer;

export type MovieReturnObservationEvent =
  MovieReturnObservation["events"][number];
export type ReadinessObservationEvent = Extract<
  MovieReturnObservationEvent,
  { eventType: "readiness-observed" }
>;
export type SelectionObservationEvent = Extract<
  MovieReturnObservationEvent,
  { eventType: "selection-observed" }
>;
export type CustomerReturnObservationEvent = Extract<
  MovieReturnObservationEvent,
  { eventType: "customer-return-observed" }
>;
export type MovieReference =
  ReadinessObservationEvent["preState"]["rentedMovies"]["movies"][number];
export type CapturedMovieReferences =
  ReadinessObservationEvent["preState"]["rentedMovies"];
