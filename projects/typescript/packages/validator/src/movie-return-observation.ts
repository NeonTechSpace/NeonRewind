import type {
  CapturedMovieReferences,
  CustomerReturnObservationEvent,
  MovieReference,
  MovieReturnMechanics,
  MovieReturnObservation,
  MovieReturnObservationEvent,
  MovieReturnValidationIssue,
  MovieReturnValidationIssueCode,
  MovieReturnValidationReport,
  ReadinessObservationEvent,
  SelectionObservationEvent,
} from "@neonretrorewind/core";

export type {
  CapturedMovieReferences,
  CustomerReturnObservationEvent,
  MovieReference,
  MovieReturnObservation,
  MovieReturnObservationEvent,
  MovieReturnValidationIssue,
  MovieReturnValidationIssueCode,
  MovieReturnValidationReport,
  ReadinessObservationEvent,
  SelectionObservationEvent,
} from "@neonretrorewind/core";

export type RentalQueueState = ReadinessObservationEvent["preState"];
export type CustomerReturnState = CustomerReturnObservationEvent["preState"];
export type SelectionResult = SelectionObservationEvent["result"];

export interface MovieReturnValidationMechanics {
  readonly readiness: Pick<
    MovieReturnMechanics["readiness"],
    "transfer" | "clearsSource"
  >;
  readonly selection: Pick<
    MovieReturnMechanics["selection"],
    "candidateQueue" | "deduplication" | "outcomes"
  > & {
    readonly maximumUniqueMovies: number;
    readonly customerFlow: {
      readonly selectedMovies: Pick<
        MovieReturnMechanics["selection"]["customerFlow"]["selectedMovies"],
        "destination" | "removesFromCandidateQueue"
      >;
    };
  };
}

export function validateMovieReturnObservation(
  observation: MovieReturnObservation,
  mechanics: MovieReturnValidationMechanics,
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
        validateReadiness(event, mechanics, issues);
        break;
      case "selection-observed":
        validateSelection(event, mechanics, issues);
        break;
      case "customer-return-observed":
        validateCustomerReturn(event, mechanics, issues);
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
  mechanics: MovieReturnValidationMechanics,
  issues: MovieReturnValidationIssue[],
): void {
  const preRentedComplete = validateCapture(
    event.preState.rentedMovies,
    "readiness pre-state rented queue",
    event.sequence,
    issues,
  );
  const preReadyComplete = validateCapture(
    event.preState.readyMovies,
    "readiness pre-state ready queue",
    event.sequence,
    issues,
  );
  const postRentedComplete = validateCapture(
    event.postState.rentedMovies,
    "readiness post-state rented queue",
    event.sequence,
    issues,
  );
  const postReadyComplete = validateCapture(
    event.postState.readyMovies,
    "readiness post-state ready queue",
    event.sequence,
    issues,
  );

  if (event.preState.rentedMovies.totalCount === 0) {
    addIssue(
      issues,
      "incomplete",
      "readiness-source-empty",
      event.sequence,
      "The readiness observation started with an empty source queue, so it did not exercise a transfer.",
    );
  }
  if (
    mechanics.readiness.clearsSource &&
    event.postState.rentedMovies.totalCount !== 0
  ) {
    addIssue(
      issues,
      "mismatch",
      "readiness-source-not-cleared",
      event.sequence,
      "The rented queue was not empty after readiness processing.",
    );
  }

  if (
    mechanics.readiness.transfer === "append-all" &&
    event.preState.rentedMovies.totalCount > 0 &&
    preRentedComplete &&
    preReadyComplete &&
    postRentedComplete &&
    postReadyComplete
  ) {
    const expectedReady = [
      ...event.preState.readyMovies.movies,
      ...event.preState.rentedMovies.movies,
    ];
    if (!sameReferenceMultiset(event.postState.readyMovies.movies, expectedReady)) {
      addIssue(
        issues,
        "mismatch",
        "readiness-destination-mismatch",
        event.sequence,
        "The ready queue does not equal the previous ready and rented queues combined.",
      );
    }
  }
}

function validateSelection(
  event: SelectionObservationEvent,
  mechanics: MovieReturnValidationMechanics,
  issues: MovieReturnValidationIssue[],
): void {
  validateCapture(
    event.preState.rentedMovies,
    "selection pre-state rented queue",
    event.sequence,
    issues,
  );
  const readyComplete = validateCapture(
    event.preState.readyMovies,
    "selection pre-state ready queue",
    event.sequence,
    issues,
  );
  const selectedComplete = validateSelectionResult(
    event.result,
    mechanics,
    event.sequence,
    issues,
  );

  if (
    mechanics.selection.candidateQueue === "ready-to-return" &&
    readyComplete &&
    selectedComplete &&
    !isReferenceMultisetSubset(
      event.result.selectedMovies.movies,
      event.preState.readyMovies.movies,
    )
  ) {
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
  mechanics: MovieReturnValidationMechanics,
  issues: MovieReturnValidationIssue[],
): void {
  const preReadyComplete = validateCapture(
    event.preState.readyMovies,
    "customer pre-state ready queue",
    event.sequence,
    issues,
  );
  const preInventoryComplete = validateCapture(
    event.preState.customerInventoryMovies,
    "customer pre-state inventory",
    event.sequence,
    issues,
  );
  const selectedComplete = validateSelectionResult(
    event.result,
    mechanics,
    event.sequence,
    issues,
  );
  const postReadyComplete = validateCapture(
    event.postState.readyMovies,
    "customer post-state ready queue",
    event.sequence,
    issues,
  );
  const postInventoryComplete = validateCapture(
    event.postState.customerInventoryMovies,
    "customer post-state inventory",
    event.sequence,
    issues,
  );

  const selected = event.result.selectedMovies.movies;
  if (
    mechanics.selection.candidateQueue === "ready-to-return" &&
    preReadyComplete &&
    selectedComplete &&
    !isReferenceMultisetSubset(selected, event.preState.readyMovies.movies)
  ) {
    addIssue(
      issues,
      "mismatch",
      "customer-selection-outside-ready-queue",
      event.sequence,
      "The customer return selected a movie outside its pre-event ready queue.",
    );
  }

  if (
    mechanics.selection.customerFlow.selectedMovies.removesFromCandidateQueue &&
    preReadyComplete &&
    selectedComplete &&
    postReadyComplete
  ) {
    const expectedReady = event.result.found
      ? withoutReferenceOccurrences(event.preState.readyMovies.movies, selected)
      : event.preState.readyMovies.movies;
    if (!sameReferenceMultiset(event.postState.readyMovies.movies, expectedReady)) {
      addIssue(
        issues,
        "mismatch",
        "customer-ready-queue-mismatch",
        event.sequence,
        "The ready queue does not match the selected customer-return result.",
      );
    }
  }

  if (
    mechanics.selection.customerFlow.selectedMovies.destination ===
      "customer-inventory" &&
    preInventoryComplete &&
    selectedComplete &&
    postInventoryComplete
  ) {
    const expectedInventory = event.result.found
      ? [...event.preState.customerInventoryMovies.movies, ...selected]
      : event.preState.customerInventoryMovies.movies;
    if (
      !sameReferenceMultiset(
        event.postState.customerInventoryMovies.movies,
        expectedInventory,
      )
    ) {
      addIssue(
        issues,
        "mismatch",
        "customer-inventory-mismatch",
        event.sequence,
        "The customer inventory does not match the selected customer-return result.",
      );
    }
  }
}

function validateSelectionResult(
  result: SelectionResult,
  mechanics: MovieReturnValidationMechanics,
  sequence: number,
  issues: MovieReturnValidationIssue[],
): boolean {
  const complete = validateCapture(
    result.selectedMovies,
    "selection result",
    sequence,
    issues,
  );

  if (
    result.selectedMovies.totalCount > mechanics.selection.maximumUniqueMovies
  ) {
    addIssue(
      issues,
      "mismatch",
      "selection-result-count-exceeded",
      sequence,
      `The selector returned more than the normalized limit of ${mechanics.selection.maximumUniqueMovies} movies.`,
    );
  }
  if (
    mechanics.selection.deduplication === "add-unique" &&
    hasDuplicateReferences(result.selectedMovies.movies)
  ) {
    addIssue(
      issues,
      "mismatch",
      "selection-result-duplicate",
      sequence,
      "The selector returned the same movie reference more than once.",
    );
  }
  if (
    selectionFoundDisagrees(
      result.found,
      result.selectedMovies.totalCount,
      mechanics,
    )
  ) {
    addIssue(
      issues,
      "mismatch",
      "selection-found-result-mismatch",
      sequence,
      "The selector found flag does not agree with its selected-movie count.",
    );
  }
  return complete;
}

function selectionFoundDisagrees(
  found: boolean,
  selectedCount: number,
  mechanics: MovieReturnValidationMechanics,
): boolean {
  if (selectedCount > 0) {
    return (
      mechanics.selection.outcomes.weightedFailureWithSelection ===
        "found-selected" && !found
    );
  }
  const emptyOutcomesAreNotFound =
    mechanics.selection.outcomes.weightedFailureWithNoSelection ===
      "not-found-empty" &&
    mechanics.selection.outcomes.missingCandidate === "not-found-empty";
  return emptyOutcomesAreNotFound && found;
}

function validateCapture(
  capture: CapturedMovieReferences,
  label: string,
  sequence: number,
  issues: MovieReturnValidationIssue[],
): boolean {
  let complete = true;
  if (capture.truncated) {
    addIssue(
      issues,
      "incomplete",
      "capture-truncated",
      sequence,
      `The ${label} omitted movie references because it exceeded the capture limit.`,
    );
    complete = false;
  }
  if (!capture.truncated && capture.totalCount !== capture.movies.length) {
    addIssue(
      issues,
      "incomplete",
      "capture-count-mismatch",
      sequence,
      `The ${label} count does not equal the number of captured movie references.`,
    );
    complete = false;
  }
  if (capture.truncated && capture.totalCount <= capture.movies.length) {
    addIssue(
      issues,
      "incomplete",
      "capture-count-mismatch",
      sequence,
      `The truncated ${label} count must exceed the number of captured movie references.`,
    );
    complete = false;
  }
  return complete;
}

function referenceKey(reference: MovieReference): string {
  return `${reference.referenceType}\u0000${reference.value}`;
}

function referenceCounts(references: readonly MovieReference[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const reference of references) {
    const key = referenceKey(reference);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function hasDuplicateReferences(references: readonly MovieReference[]): boolean {
  return referenceCounts(references).size !== references.length;
}

function isReferenceMultisetSubset(
  possibleSubset: readonly MovieReference[],
  possibleSuperset: readonly MovieReference[],
): boolean {
  const available = referenceCounts(possibleSuperset);
  for (const reference of possibleSubset) {
    const key = referenceKey(reference);
    const remaining = available.get(key) ?? 0;
    if (remaining === 0) {
      return false;
    }
    available.set(key, remaining - 1);
  }
  return true;
}

function withoutReferenceOccurrences(
  source: readonly MovieReference[],
  removed: readonly MovieReference[],
): readonly MovieReference[] {
  const remainingToRemove = referenceCounts(removed);
  return source.filter((reference) => {
    const key = referenceKey(reference);
    const remaining = remainingToRemove.get(key) ?? 0;
    if (remaining === 0) {
      return true;
    }
    remainingToRemove.set(key, remaining - 1);
    return false;
  });
}

function sameReferenceMultiset(
  left: readonly MovieReference[],
  right: readonly MovieReference[],
): boolean {
  return (
    left.length === right.length &&
    isReferenceMultisetSubset(left, right) &&
    isReferenceMultisetSubset(right, left)
  );
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
