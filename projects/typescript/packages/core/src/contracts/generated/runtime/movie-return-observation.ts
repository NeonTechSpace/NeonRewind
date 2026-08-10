// Generated from src/contracts/runtime/movie-return-observation.ts by pnpm contracts:generate. Do not edit.

export type MovieReturnObservationContract = {
  [k: string]: unknown;
} & {
  artifactType: "movie-return-runtime-observation";
  build: Build;
  targetMechanics: TargetMechanics;
  collector: Collector;
  run: Run;
  /**
   * @maxItems 256
   */
  events: (ReadinessEvent | SelectionEvent | CustomerReturnEvent)[];
};
export type Sha256 = string;
export type Version = string;
export type Run = {
  [k: string]: unknown;
} & {
  runId: string;
  startedAtUtc: UtcTimestamp;
  finishedAtUtc: UtcTimestamp | null;
  status: "complete" | "aborted" | "failed";
  statusReason: StatusReason | null;
};
export type UtcTimestamp = string;
export type StatusReason =
  | "user-stopped"
  | "game-closed"
  | "object-unavailable"
  | "hook-failed"
  | "write-failed"
  | "validation-failed"
  | "collector-error"
  | "unknown";
export type Sequence = number;
export type RuntimePath = string;
export type MovieReference =
  | {
      referenceType: "object-path";
      value: RuntimePath;
    }
  | {
      referenceType: "run-local";
      value: string;
    };

export interface Build {
  steamAppId: string;
  steamBuildId: string;
}
export interface TargetMechanics {
  fileName: "movie-return-mechanics.json";
  sizeBytes: number;
  sha256: Sha256;
  artifactType: "movie-return-mechanics";
}
export interface Collector {
  name: "NeonRetroRewind.MovieReturnRuntimeCollector";
  version: Version;
  runtimeHost: {
    name: string;
    version: Version;
  };
}
export interface ReadinessEvent {
  sequence: Sequence;
  eventType: "readiness-observed";
  observedAtUtc: UtcTimestamp;
  classPath: RuntimePath;
  objectPath: RuntimePath;
  functionPath: RuntimePath;
  preState: RentalQueues;
  postState: RentalQueues;
}
export interface RentalQueues {
  rentedMovies: MovieCollection;
  readyMovies: MovieCollection;
}
export interface MovieCollection {
  totalCount: number;
  truncated: boolean;
  /**
   * @maxItems 256
   */
  movies: MovieReference[];
}
export interface SelectionEvent {
  sequence: Sequence;
  eventType: "selection-observed";
  observedAtUtc: UtcTimestamp;
  classPath: RuntimePath;
  objectPath: RuntimePath;
  functionPath: RuntimePath;
  preState: RentalQueues;
  result: SelectionResult;
}
export interface SelectionResult {
  found: boolean;
  selectedMovies: MovieCollection;
}
export interface CustomerReturnEvent {
  sequence: Sequence;
  eventType: "customer-return-observed";
  observedAtUtc: UtcTimestamp;
  classPath: RuntimePath;
  objectPath: RuntimePath;
  functionPath: RuntimePath;
  preState: CustomerState;
  result: SelectionResult;
  postState: CustomerState;
}
export interface CustomerState {
  readyMovies: MovieCollection;
  customerInventoryMovies: MovieCollection;
}
