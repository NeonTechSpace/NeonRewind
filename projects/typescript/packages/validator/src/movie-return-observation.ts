export interface MovieReference {
  readonly referenceType: "object-path" | "run-local";
  readonly value: string;
}

export interface RentalQueueState {
  readonly rentedMovies: readonly MovieReference[];
  readonly readyMovies: readonly MovieReference[];
}

export interface CustomerReturnState {
  readonly readyMovies: readonly MovieReference[];
  readonly customerInventoryMovies: readonly MovieReference[];
}

export interface SelectionResult {
  readonly found: boolean;
  readonly selectedMovies: readonly MovieReference[];
}

interface ObservationEventBase {
  readonly sequence: number;
  readonly observedAtUtc: string;
  readonly classPath: string;
  readonly objectPath: string;
  readonly functionPath: string;
}

export interface ReadinessObservationEvent extends ObservationEventBase {
  readonly eventType: "readiness-observed";
  readonly preState: RentalQueueState;
  readonly postState: RentalQueueState;
}

export interface SelectionObservationEvent extends ObservationEventBase {
  readonly eventType: "selection-observed";
  readonly preState: RentalQueueState;
  readonly result: SelectionResult;
}

export interface CustomerReturnObservationEvent extends ObservationEventBase {
  readonly eventType: "customer-return-observed";
  readonly preState: CustomerReturnState;
  readonly result: SelectionResult;
  readonly postState: CustomerReturnState;
}

export type MovieReturnObservationEvent =
  | ReadinessObservationEvent
  | SelectionObservationEvent
  | CustomerReturnObservationEvent;

export interface MovieReturnObservation {
  readonly artifactType: "movie-return-runtime-observation";
  readonly schemaVersion: 1;
  readonly build: {
    readonly steamAppId: string;
    readonly steamBuildId: string;
  };
  readonly targetMechanics: {
    readonly fileName: "movie-return-mechanics.v4.json";
    readonly sizeBytes: number;
    readonly sha256: string;
    readonly artifactType: "movie-return-mechanics";
    readonly schemaVersion: 4;
  };
  readonly collector: {
    readonly name: "NeonRewind.MovieReturnRuntimeCollector";
    readonly version: string;
    readonly runtimeHost: {
      readonly name: string;
      readonly version: string;
    };
  };
  readonly run: {
    readonly runId: string;
    readonly startedAtUtc: string;
    readonly finishedAtUtc: string | null;
    readonly status: "complete" | "aborted" | "failed";
    readonly statusReason:
      | "user-stopped"
      | "game-closed"
      | "object-unavailable"
      | "hook-failed"
      | "write-failed"
      | "validation-failed"
      | "collector-error"
      | "unknown"
      | null;
  };
  readonly events: readonly MovieReturnObservationEvent[];
}

export type MovieReturnValidationIssueCode =
  | "run-not-complete"
  | "complete-run-missing-event"
  | "invalid-run-time-range"
  | "event-sequence-changed"
  | "event-time-before-run"
  | "event-time-after-run"
  | "event-time-moved-backward"
  | "readiness-source-empty"
  | "readiness-source-not-cleared"
  | "readiness-destination-mismatch"
  | "selection-outside-ready-queue"
  | "customer-selection-outside-ready-queue"
  | "customer-ready-queue-mismatch"
  | "customer-inventory-mismatch";

export interface MovieReturnValidationIssue {
  readonly kind: "incomplete" | "mismatch";
  readonly code: MovieReturnValidationIssueCode;
  readonly sequence: number | null;
  readonly message: string;
}

export interface MovieReturnValidationReport {
  readonly outcome: "passed" | "incomplete" | "mismatch";
  readonly checkedEventCount: number;
  readonly issues: readonly MovieReturnValidationIssue[];
}

export function validateMovieReturnObservation(
  observation: MovieReturnObservation,
): MovieReturnValidationReport {
  const issues: MovieReturnValidationIssue[] = [];

  if (observation.run.status !== "complete") {
    addIssue(
      issues,
      "incomplete",
      "run-not-complete",
      null,
      `The observation run ended with status ${observation.run.status}.`,
    );
  }

  validateRequiredEvents(observation, issues);
  validateTimeline(observation, issues);

  for (const event of observation.events) {
    switch (event.eventType) {
      case "readiness-observed":
        validateReadiness(event, issues);
        break;
      case "selection-observed":
        validateSelection(event, issues);
        break;
      case "customer-return-observed":
        validateCustomerReturn(event, issues);
        break;
    }
  }

  return {
    outcome: issues.some((issue) => issue.kind === "mismatch")
      ? "mismatch"
      : issues.some((issue) => issue.kind === "incomplete")
        ? "incomplete"
        : "passed",
    checkedEventCount: observation.events.length,
    issues,
  };
}

function validateRequiredEvents(
  observation: MovieReturnObservation,
  issues: MovieReturnValidationIssue[],
): void {
  if (observation.run.status !== "complete") {
    return;
  }

  const required = [
    "readiness-observed",
    "selection-observed",
    "customer-return-observed",
  ] as const;
  for (const eventType of required) {
    if (!observation.events.some((event) => event.eventType === eventType)) {
      addIssue(
        issues,
        "mismatch",
        "complete-run-missing-event",
        null,
        `A complete observation has no ${eventType} event.`,
      );
    }
  }
}

function validateTimeline(
  observation: MovieReturnObservation,
  issues: MovieReturnValidationIssue[],
): void {
  const started = Date.parse(observation.run.startedAtUtc);
  const finished =
    observation.run.finishedAtUtc === null
      ? null
      : Date.parse(observation.run.finishedAtUtc);

  if (finished !== null && finished < started) {
    addIssue(
      issues,
      "mismatch",
      "invalid-run-time-range",
      null,
      "The run finished before it started.",
    );
  }

  let previousTime = started;
  observation.events.forEach((event, index) => {
    if (event.sequence !== index + 1) {
      addIssue(
        issues,
        "mismatch",
        "event-sequence-changed",
        event.sequence,
        "Event sequence numbers must be consecutive and start at one.",
      );
    }

    const observed = Date.parse(event.observedAtUtc);
    if (observed < started) {
      addIssue(
        issues,
        "mismatch",
        "event-time-before-run",
        event.sequence,
        "An event was recorded before the run started.",
      );
    }
    if (finished !== null && observed > finished) {
      addIssue(
        issues,
        "mismatch",
        "event-time-after-run",
        event.sequence,
        "An event was recorded after the run finished.",
      );
    }
    if (observed < previousTime) {
      addIssue(
        issues,
        "mismatch",
        "event-time-moved-backward",
        event.sequence,
        "Event timestamps must not move backward.",
      );
    }
    previousTime = observed;
  });
}

function validateReadiness(
  event: ReadinessObservationEvent,
  issues: MovieReturnValidationIssue[],
): void {
  if (event.preState.rentedMovies.length === 0) {
    addIssue(
      issues,
      "mismatch",
      "readiness-source-empty",
      event.sequence,
      "The readiness observation started with an empty rented queue.",
    );
  }
  if (event.postState.rentedMovies.length !== 0) {
    addIssue(
      issues,
      "mismatch",
      "readiness-source-not-cleared",
      event.sequence,
      "The rented queue was not empty after readiness processing.",
    );
  }

  const expectedReady = union(
    event.preState.readyMovies,
    event.preState.rentedMovies,
  );
  if (!sameReferences(event.postState.readyMovies, expectedReady)) {
    addIssue(
      issues,
      "mismatch",
      "readiness-destination-mismatch",
      event.sequence,
      "The ready queue does not equal the previous ready and rented queues combined.",
    );
  }
}

function validateSelection(
  event: SelectionObservationEvent,
  issues: MovieReturnValidationIssue[],
): void {
  if (!isSubset(event.result.selectedMovies, event.preState.readyMovies)) {
    addIssue(
      issues,
      "mismatch",
      "selection-outside-ready-queue",
      event.sequence,
      "The selector returned a movie that was not in its ready queue.",
    );
  }
}

function validateCustomerReturn(
  event: CustomerReturnObservationEvent,
  issues: MovieReturnValidationIssue[],
): void {
  const selected = event.result.selectedMovies;
  if (!isSubset(selected, event.preState.readyMovies)) {
    addIssue(
      issues,
      "mismatch",
      "customer-selection-outside-ready-queue",
      event.sequence,
      "The customer return selected a movie outside its pre-event ready queue.",
    );
  }

  const expectedReady = event.result.found
    ? without(event.preState.readyMovies, selected)
    : event.preState.readyMovies;
  if (!sameReferences(event.postState.readyMovies, expectedReady)) {
    addIssue(
      issues,
      "mismatch",
      "customer-ready-queue-mismatch",
      event.sequence,
      "The ready queue does not match the selected customer-return result.",
    );
  }

  const expectedInventory = event.result.found
    ? union(event.preState.customerInventoryMovies, selected)
    : event.preState.customerInventoryMovies;
  if (!sameReferences(event.postState.customerInventoryMovies, expectedInventory)) {
    addIssue(
      issues,
      "mismatch",
      "customer-inventory-mismatch",
      event.sequence,
      "The customer inventory does not match the selected customer-return result.",
    );
  }
}

function referenceKey(reference: MovieReference): string {
  return `${reference.referenceType}\u0000${reference.value}`;
}

function isSubset(
  possibleSubset: readonly MovieReference[],
  possibleSuperset: readonly MovieReference[],
): boolean {
  const superset = new Set(possibleSuperset.map(referenceKey));
  return possibleSubset.every((reference) => superset.has(referenceKey(reference)));
}

function union(
  left: readonly MovieReference[],
  right: readonly MovieReference[],
): readonly MovieReference[] {
  const result = new Map<string, MovieReference>();
  for (const reference of [...left, ...right]) {
    result.set(referenceKey(reference), reference);
  }
  return [...result.values()];
}

function without(
  source: readonly MovieReference[],
  removed: readonly MovieReference[],
): readonly MovieReference[] {
  const removedKeys = new Set(removed.map(referenceKey));
  return source.filter((reference) => !removedKeys.has(referenceKey(reference)));
}

function sameReferences(
  left: readonly MovieReference[],
  right: readonly MovieReference[],
): boolean {
  return left.length === right.length && isSubset(left, right) && isSubset(right, left);
}

function addIssue(
  issues: MovieReturnValidationIssue[],
  kind: MovieReturnValidationIssue["kind"],
  code: MovieReturnValidationIssueCode,
  sequence: number | null,
  message: string,
): void {
  issues.push({ kind, code, sequence, message });
}
