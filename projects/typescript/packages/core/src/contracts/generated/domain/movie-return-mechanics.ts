// Generated from src/contracts/domain/movie-return-mechanics.ts by pnpm contracts:generate. Do not edit.

export type RentalEvidenceSource = SourceIdentity & {
  artifactType: "rental-evidence";
};
export type Sha256 = string;
export type RentalBlueprintBodiesSource = SourceIdentity & {
  artifactType: "rental-blueprint-bodies";
};
export type BlueprintCallSitesSource = SourceIdentity & {
  artifactType: "blueprint-call-sites";
};
export type BlueprintCallerBodiesSource = SourceIdentity & {
  artifactType: "blueprint-caller-bodies";
};
export type BlueprintFunctionTraceSource = SourceIdentity & {
  artifactType: "blueprint-function-trace";
};
export type RentalFunctionTraceSource = SourceIdentity & {
  artifactType: "rental-function-trace";
};
export type BaseMechanicsSource = RuntimeSourceIdentity & {
  fileName: "movie-return-mechanics.json";
  artifactType: "movie-return-mechanics";
};
export type RuntimeObservationSource = RuntimeSourceIdentity & {
  fileName: "movie-return-observation.json";
  artifactType: "movie-return-runtime-observation";
};
export type RuntimeValidationReportSource = RuntimeSourceIdentity & {
  fileName: "movie-return-validation.json";
  artifactType: "movie-return-runtime-validation";
};
export type NonEmptyString = string;

export interface MovieReturnMechanicsContract {
  artifactType: "movie-return-mechanics";
  build: Build;
  sources: Sources;
  scope: "movie-return-readiness-and-selection";
  evidenceLevel: "decompiled-blueprint";
  runtimeValidation: "not-run" | PassedRuntimeValidation;
  readiness: Readiness;
  selection: Selection;
}
export interface Build {
  steamAppId: string;
  steamBuildId: string;
}
export interface Sources {
  rentalEvidence: RentalEvidenceSource;
  rentalBlueprintBodies: RentalBlueprintBodiesSource;
  blueprintCallSites: BlueprintCallSitesSource;
  blueprintCallerBodies: BlueprintCallerBodiesSource;
  blueprintFunctionTrace: BlueprintFunctionTraceSource;
  rentalFunctionTrace: RentalFunctionTraceSource;
}
export interface SourceIdentity {
  fileName: string;
  sha256: Sha256;
  sizeBytes: number;
  artifactType:
    | "rental-evidence"
    | "rental-blueprint-bodies"
    | "blueprint-call-sites"
    | "blueprint-caller-bodies"
    | "blueprint-function-trace"
    | "rental-function-trace";
}
export interface PassedRuntimeValidation {
  outcome: "passed";
  checkedEventCount: number;
  sources: RuntimeValidationSources;
}
export interface RuntimeValidationSources {
  baseMechanics: BaseMechanicsSource;
  observation: RuntimeObservationSource;
  report: RuntimeValidationReportSource;
}
export interface RuntimeSourceIdentity {
  fileName: string;
  sha256: Sha256;
  sizeBytes: number;
  artifactType: "movie-return-mechanics" | "movie-return-runtime-observation" | "movie-return-runtime-validation";
}
export interface Readiness {
  trigger: "new-day-event";
  source: RentedQueue;
  destination: ReadyQueue;
  transfer: "append-all";
  clearsSource: true;
  evidence: RentalReadinessTraceEvidence;
}
export interface RentedQueue {
  queue: "rented";
  evidence: ClassFieldEvidence;
}
export interface ClassFieldEvidence {
  artifactType: "rental-evidence";
  classPath: NonEmptyString;
  fieldName: NonEmptyString;
}
export interface ReadyQueue {
  queue: "ready-to-return";
  evidence: ClassFieldEvidence;
}
export interface RentalReadinessTraceEvidence {
  artifactType: "rental-function-trace";
  classPath: NonEmptyString;
  newDayFunction: "Example Period Event";
  readinessFunction: "Prepare Example Items";
  eventGraphFunction: "ExecuteExampleGraph_ExampleQueueSystem";
  statementIndexes: RentalReadinessStatementIndexes;
}
export interface RentalReadinessStatementIndexes {
  newDayCall: 18;
  newDayEntry: 1792;
  movieReadinessCall: 1803;
  consoleReadinessCall: 1817;
  readinessCall: 0;
  readinessEntry: 2592;
  transfer: 1854;
  clearSource: 1904;
}
export interface Selection {
  callerSearch: CallerSearch;
  candidateQueue: "ready-to-return";
  maximumUniqueMovies: 4;
  firstAttempt: FirstAttempt;
  additionalAttemptProbability: ProbabilityWithEvidence;
  randomDecision: "weighted-boolean-per-attempt";
  candidateChoice: "uniform-random";
  deduplication: "add-unique";
  outcomes: {
    weightedFailureWithNoSelection: "not-found-empty";
    weightedFailureWithSelection: "found-selected";
    missingCandidate: "not-found-empty";
  };
  evidence: RentalSelectionTraceEvidence;
  customerFlow: CustomerFlow;
}
export interface CallerSearch {
  coverage: "all-parsed-blueprint-function-packages";
  candidatePackageCount: number;
  scannedPackageCount: number;
  failedPackageCount: 0;
  callerFound: true;
  callSiteCount: 2;
}
export interface FirstAttempt {
  defaultProbability: ProbabilityWithEvidence;
  override: {
    whenQueue: "rented";
    minimumLength: 3;
    probability: 0.95;
  };
}
export interface ProbabilityWithEvidence {
  value: number;
  evidence: DefaultEvidence;
}
export interface DefaultEvidence {
  artifactType: "rental-evidence";
  classPath: NonEmptyString;
  propertyName: NonEmptyString;
}
export interface RentalSelectionTraceEvidence {
  artifactType: "rental-function-trace";
  classPath: NonEmptyString;
  functionName: "Select Example Items";
  statementIndexes: RentalSelectionStatementIndexes;
}
export interface RentalSelectionStatementIndexes {
  limitLength: 40;
  limitComparison: 69;
  limitBranch: 93;
  rentedLength: 190;
  rentedMinimum: 219;
  firstProbability: 290;
  selectedLength: 367;
  firstAttemptCondition: 396;
  additionalProbability: 467;
  weightedDecision: 543;
  weightedFailure: 562;
  candidateChoice: 598;
  candidateValidity: 645;
  missingCandidate: 669;
  selectedChoice: 705;
  addUnique: 782;
  retry: 810;
  resultLength: 855;
  resultCondition: 884;
  emptyResult: 908;
}
export interface CustomerFlow {
  callerClass: "ExampleActor_C";
  callerFunction: "Initialize Example Return";
  productPriority: "ready-console-before-movies";
  movieSelectionWhen: "no-ready-console-found";
  selectorCallCount: 2;
  selectorNotFound: "return-without-product";
  selectedMovies: {
    iteration: "all-returned-movies";
    destination: "customer-inventory";
    removesFromCandidateQueue: true;
  };
  evidence: TraceEvidence;
}
export interface TraceEvidence {
  artifactType: "blueprint-function-trace";
  classPath: NonEmptyString;
  entryFunction: "ReceiveBeginPlay";
  entryPoint: 68;
  eventGraphFunction: "ExecuteExampleGraph_ExampleActor";
  customerFunction: "Initialize Example Return";
  statementIndexes: TraceStatementIndexes;
}
export interface TraceStatementIndexes {
  eventGraphEntry: 68;
  customerCall: 49;
  consoleSelectionCall: 230;
  consoleFailureBranch: 262;
  consoleFailureTarget: 399;
  /**
   * @minItems 2
   * @maxItems 2
   */
  selectorCalls: [465, 519];
  selectorFailureBranch: 551;
  loopHeader: 607;
  loopCondition: 704;
  inventoryAdd: 941;
  readyQueueRemoval: 987;
  loopExit: 1456;
  loopBack: 1541;
}
