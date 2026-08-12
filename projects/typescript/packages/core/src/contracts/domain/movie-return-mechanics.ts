import { type } from "arktype";
import { withExactlyOneOf } from "../contract-constraints.ts";

const $definitionBuild = type({
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();
const $definitionSha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const $definitionSourceIdentity = type({
  fileName: type("string")
    .matching(new RegExp("^[^/\\\\]+\\.json$"))
    .atLeastLength(1),
  sha256: $definitionSha256,
  sizeBytes: type("number.integer").atLeast(1),
  artifactType: type.enumerated(
    "rental-evidence",
    "rental-blueprint-bodies",
    "blueprint-call-sites",
    "blueprint-caller-bodies",
    "blueprint-function-trace",
    "rental-function-trace",
  ),
  "+": "reject",
}).readonly();
const $definitionRentalEvidenceSource = type.and(
  $definitionSourceIdentity,
  type({ "artifactType?": type.unit("rental-evidence") }).readonly(),
);
const $definitionRentalBlueprintBodiesSource = type.and(
  $definitionSourceIdentity,
  type({ "artifactType?": type.unit("rental-blueprint-bodies") }).readonly(),
);
const $definitionBlueprintCallSitesSource = type.and(
  $definitionSourceIdentity,
  type({ "artifactType?": type.unit("blueprint-call-sites") }).readonly(),
);
const $definitionBlueprintCallerBodiesSource = type.and(
  $definitionSourceIdentity,
  type({ "artifactType?": type.unit("blueprint-caller-bodies") }).readonly(),
);
const $definitionBlueprintFunctionTraceSource = type.and(
  $definitionSourceIdentity,
  type({ "artifactType?": type.unit("blueprint-function-trace") }).readonly(),
);
const $definitionRentalFunctionTraceSource = type.and(
  $definitionSourceIdentity,
  type({ "artifactType?": type.unit("rental-function-trace") }).readonly(),
);
const $definitionSources = type({
  rentalEvidence: $definitionRentalEvidenceSource,
  rentalBlueprintBodies: $definitionRentalBlueprintBodiesSource,
  blueprintCallSites: $definitionBlueprintCallSitesSource,
  blueprintCallerBodies: $definitionBlueprintCallerBodiesSource,
  blueprintFunctionTrace: $definitionBlueprintFunctionTraceSource,
  rentalFunctionTrace: $definitionRentalFunctionTraceSource,
  "+": "reject",
}).readonly();
const $definitionRuntimeSourceIdentity = type({
  fileName: type("string")
    .matching(new RegExp("^[^/\\\\]+\\.json$"))
    .atLeastLength(1),
  sha256: $definitionSha256,
  sizeBytes: type("number.integer").atLeast(1),
  artifactType: type.enumerated(
    "movie-return-mechanics",
    "movie-return-runtime-observation",
    "movie-return-runtime-validation",
  ),
  "+": "reject",
}).readonly();
const $definitionBaseMechanicsSource = type.and(
  $definitionRuntimeSourceIdentity,
  type({
    "fileName?": type.unit("movie-return-mechanics.json"),
    "artifactType?": type.unit("movie-return-mechanics"),
  }).readonly(),
);
const $definitionRuntimeObservationSource = type.and(
  $definitionRuntimeSourceIdentity,
  type({
    "fileName?": type.unit("movie-return-observation.json"),
    "artifactType?": type.unit("movie-return-runtime-observation"),
  }).readonly(),
);
const $definitionRuntimeValidationReportSource = type.and(
  $definitionRuntimeSourceIdentity,
  type({
    "fileName?": type.unit("movie-return-validation.json"),
    "artifactType?": type.unit("movie-return-runtime-validation"),
  }).readonly(),
);
const $definitionRuntimeValidationSources = type({
  baseMechanics: $definitionBaseMechanicsSource,
  observation: $definitionRuntimeObservationSource,
  report: $definitionRuntimeValidationReportSource,
  "+": "reject",
}).readonly();
const $definitionPassedRuntimeValidation = type({
  outcome: type.unit("passed"),
  checkedEventCount: type("number.integer").atLeast(1).atMost(256),
  sources: $definitionRuntimeValidationSources,
  "+": "reject",
}).readonly();
const $definitionNonEmptyString = type("string").atLeastLength(1);
const $definitionClassFieldEvidence = type({
  artifactType: type.unit("rental-evidence"),
  classPath: $definitionNonEmptyString,
  fieldName: $definitionNonEmptyString,
  "+": "reject",
}).readonly();
const $definitionRentedQueue = type({
  queue: type.unit("rented"),
  evidence: $definitionClassFieldEvidence,
  "+": "reject",
}).readonly();
const $definitionReadyQueue = type({
  queue: type.unit("ready-to-return"),
  evidence: $definitionClassFieldEvidence,
  "+": "reject",
}).readonly();
const $definitionRentalReadinessStatementIndexes = type({
  newDayCall: type.unit(18),
  newDayEntry: type.unit(1792),
  movieReadinessCall: type.unit(1803),
  consoleReadinessCall: type.unit(1817),
  readinessCall: type.unit(0),
  readinessEntry: type.unit(2592),
  transfer: type.unit(1854),
  clearSource: type.unit(1904),
  "+": "reject",
}).readonly();
const $definitionRentalReadinessTraceEvidence = type({
  artifactType: type.unit("rental-function-trace"),
  classPath: $definitionNonEmptyString,
  newDayFunction: type.unit("Example Period Event"),
  readinessFunction: type.unit("Prepare Example Items"),
  eventGraphFunction: type.unit("ExecuteExampleGraph_ExampleQueueSystem"),
  statementIndexes: $definitionRentalReadinessStatementIndexes,
  "+": "reject",
}).readonly();
const $definitionReadiness = type({
  trigger: type.unit("new-day-event"),
  source: $definitionRentedQueue,
  destination: $definitionReadyQueue,
  transfer: type.unit("append-all"),
  clearsSource: type.unit(true),
  evidence: $definitionRentalReadinessTraceEvidence,
  "+": "reject",
}).readonly();
const $definitionCallerSearch = type({
  coverage: type.unit("all-parsed-blueprint-function-packages"),
  candidatePackageCount: type("number.integer").atLeast(1),
  scannedPackageCount: type("number.integer").atLeast(1),
  failedPackageCount: type.unit(0),
  callerFound: type.unit(true),
  callSiteCount: type.unit(2),
  "+": "reject",
}).readonly();
const $definitionDefaultEvidence = type({
  artifactType: type.unit("rental-evidence"),
  classPath: $definitionNonEmptyString,
  propertyName: $definitionNonEmptyString,
  "+": "reject",
}).readonly();
const $definitionProbabilityWithEvidence = type({
  value: type("number").atLeast(0).atMost(1),
  evidence: $definitionDefaultEvidence,
  "+": "reject",
}).readonly();
const $definitionFirstAttempt = type({
  defaultProbability: $definitionProbabilityWithEvidence,
  override: type({
    whenQueue: type.unit("rented"),
    minimumLength: type.unit(3),
    probability: type.unit(0.95),
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();
const $definitionRentalSelectionStatementIndexes = type({
  limitLength: type.unit(40),
  limitComparison: type.unit(69),
  limitBranch: type.unit(93),
  rentedLength: type.unit(190),
  rentedMinimum: type.unit(219),
  firstProbability: type.unit(290),
  selectedLength: type.unit(367),
  firstAttemptCondition: type.unit(396),
  additionalProbability: type.unit(467),
  weightedDecision: type.unit(543),
  weightedFailure: type.unit(562),
  candidateChoice: type.unit(598),
  candidateValidity: type.unit(645),
  missingCandidate: type.unit(669),
  selectedChoice: type.unit(705),
  addUnique: type.unit(782),
  retry: type.unit(810),
  resultLength: type.unit(855),
  resultCondition: type.unit(884),
  emptyResult: type.unit(908),
  "+": "reject",
}).readonly();
const $definitionRentalSelectionTraceEvidence = type({
  artifactType: type.unit("rental-function-trace"),
  classPath: $definitionNonEmptyString,
  functionName: type.unit("Select Example Items"),
  statementIndexes: $definitionRentalSelectionStatementIndexes,
  "+": "reject",
}).readonly();
const $definitionTraceStatementIndexes = type({
  eventGraphEntry: type.unit(68),
  customerCall: type.unit(49),
  consoleSelectionCall: type.unit(230),
  consoleFailureBranch: type.unit(262),
  consoleFailureTarget: type.unit(399),
  selectorCalls: type([type.unit(465), type.unit(519)])
    .readonly()
    .atMostLength(2),
  selectorFailureBranch: type.unit(551),
  loopHeader: type.unit(607),
  loopCondition: type.unit(704),
  inventoryAdd: type.unit(941),
  readyQueueRemoval: type.unit(987),
  loopExit: type.unit(1456),
  loopBack: type.unit(1541),
  "+": "reject",
}).readonly();
const $definitionTraceEvidence = type({
  artifactType: type.unit("blueprint-function-trace"),
  classPath: $definitionNonEmptyString,
  entryFunction: type.unit("ReceiveBeginPlay"),
  entryPoint: type.unit(68),
  eventGraphFunction: type.unit("ExecuteExampleGraph_ExampleActor"),
  customerFunction: type.unit(
    "Initialize Example Return",
  ),
  statementIndexes: $definitionTraceStatementIndexes,
  "+": "reject",
}).readonly();
const $definitionCustomerFlow = type({
  callerClass: type.unit("ExampleActor_C"),
  callerFunction: type.unit(
    "Initialize Example Return",
  ),
  productPriority: type.unit("ready-console-before-movies"),
  movieSelectionWhen: type.unit("no-ready-console-found"),
  selectorCallCount: type.unit(2),
  selectorNotFound: type.unit("return-without-product"),
  selectedMovies: type({
    iteration: type.unit("all-returned-movies"),
    destination: type.unit("customer-inventory"),
    removesFromCandidateQueue: type.unit(true),
    "+": "reject",
  }).readonly(),
  evidence: $definitionTraceEvidence,
  "+": "reject",
}).readonly();
const $definitionSelection = type({
  callerSearch: $definitionCallerSearch,
  candidateQueue: type.unit("ready-to-return"),
  maximumUniqueMovies: type.unit(4),
  firstAttempt: $definitionFirstAttempt,
  additionalAttemptProbability: $definitionProbabilityWithEvidence,
  randomDecision: type.unit("weighted-boolean-per-attempt"),
  candidateChoice: type.unit("uniform-random"),
  deduplication: type.unit("add-unique"),
  outcomes: type({
    weightedFailureWithNoSelection: type.unit("not-found-empty"),
    weightedFailureWithSelection: type.unit("found-selected"),
    missingCandidate: type.unit("not-found-empty"),
    "+": "reject",
  }).readonly(),
  evidence: $definitionRentalSelectionTraceEvidence,
  customerFlow: $definitionCustomerFlow,
  "+": "reject",
}).readonly();

export const MovieReturnMechanicsSchema = type({
  artifactType: type.unit("movie-return-mechanics"),
  build: $definitionBuild,
  sources: $definitionSources,
  scope: type.unit("movie-return-readiness-and-selection"),
  evidenceLevel: type.unit("decompiled-blueprint"),
  runtimeValidation: withExactlyOneOf(
    type.or(type.unit("not-run"), $definitionPassedRuntimeValidation),
    [type.unit("not-run"), $definitionPassedRuntimeValidation],
  ),
  readiness: $definitionReadiness,
  selection: $definitionSelection,
  "+": "reject",
}).readonly();
export type MovieReturnMechanics = typeof MovieReturnMechanicsSchema.infer;

export type PassedMovieReturnRuntimeValidation = Exclude<
  MovieReturnMechanics["runtimeValidation"],
  "not-run"
>;
type MovieReturnSourceIdentity =
  | MovieReturnMechanics["sources"][keyof MovieReturnMechanics["sources"]]
  | PassedMovieReturnRuntimeValidation["sources"][keyof PassedMovieReturnRuntimeValidation["sources"]];
export type MovieReturnArtifactIdentity<
  ArtifactType extends MovieReturnSourceIdentity["artifactType"] =
    MovieReturnSourceIdentity["artifactType"],
> = Extract<MovieReturnSourceIdentity, { artifactType: ArtifactType }>;
export type BlueprintTraceEvidence =
  MovieReturnMechanics["selection"]["customerFlow"]["evidence"];
export type RentalReadinessTraceEvidence =
  MovieReturnMechanics["readiness"]["evidence"];
export type RentalSelectionTraceEvidence =
  MovieReturnMechanics["selection"]["evidence"];
