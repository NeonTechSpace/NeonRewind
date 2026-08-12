import { type } from "arktype";

const $definitionBuild = type({
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();
const $definitionSourceIdentity = type({
  fileName: type("string").matching(new RegExp("^[^/\\\\]+\\.json$")),
  sha256: type("string").matching(new RegExp("^[0-9a-f]{64}$")),
  sizeBytes: type("number.integer").atLeast(1),
  artifactType: type.enumerated(
    "unlockable-manager-trace",
    "blueprint-function-trace",
    "blueprint-property-reference-trace",
    "blueprint-call-target-trace",
  ),
  "+": "reject",
}).readonly();
const $definitionSources = type({
  managerTrace: type.and(
    $definitionSourceIdentity,
    type({ "artifactType?": type.unit("unlockable-manager-trace") }).readonly(),
  ),
  wrapperTrace: type.and(
    $definitionSourceIdentity,
    type({ "artifactType?": type.unit("blueprint-function-trace") }).readonly(),
  ),
  propertyReaderTrace: type.and(
    $definitionSourceIdentity,
    type({
      "artifactType?": type.unit("blueprint-property-reference-trace"),
    }).readonly(),
  ),
  requestGeneratorTrace: type.and(
    $definitionSourceIdentity,
    type({ "artifactType?": type.unit("blueprint-function-trace") }).readonly(),
  ),
  marketEntryTrace: type.and(
    $definitionSourceIdentity,
    type({ "artifactType?": type.unit("blueprint-function-trace") }).readonly(),
  ),
  sourceMapTrace: type.and(
    $definitionSourceIdentity,
    type({
      "artifactType?": type.unit("blueprint-property-reference-trace"),
    }).readonly(),
  ),
  candidateMapTrace: type.and(
    $definitionSourceIdentity,
    type({
      "artifactType?": type.unit("blueprint-property-reference-trace"),
    }).readonly(),
  ),
  callTargetTrace: type.and(
    $definitionSourceIdentity,
    type({
      "artifactType?": type.unit("blueprint-call-target-trace"),
    }).readonly(),
  ),
  "+": "reject",
}).readonly();
const $definitionSourceMapRestore = type({
  trigger: type.unit("load"),
  source: type.unit("Example Save Source Map"),
  effect: type.unit("replace-source-map"),
  "+": "reject",
}).readonly();
const $definitionSourceMapAdditions = type({
  sourceMap: type.unit("selected-film-product-sku-to-new-release-film"),
  posterMap: type.unit("selected-film-product-sku-to-new-release-film"),
  "+": "reject",
}).readonly();
const $definitionSourceMapGeneration = type({
  trigger: type.unit("generate-new-released-movie"),
  dataTableObjectPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/blueprint/data/ExampleScheduleTable.ExampleScheduleTable",
  ),
  rowDiscovery: type.unit("data-table-row-names"),
  rowLookup: type.unit("data-table-row-by-name"),
  unlockPool: type.unit("rows-with-genre-present-in-movie-genres-unlock"),
  selection: type.unit("random-unlock-pool-item"),
  duplicateHandling: type.unit("remove-selected-item-and-retry"),
  additions: $definitionSourceMapAdditions,
  "+": "reject",
}).readonly();
const $definitionSourceMapCleanup = type({
  iteration: type.unit("source-map-values"),
  condition: type.unit("second-hand-available"),
  removalKey: type.unit("iterated-value-product-sku"),
  "+": "reject",
}).readonly();
const $definitionSourceMapStatementIndexes = type({
  loadWrapperCall: type.unit(18),
  restoreAssignment: type.unit(2886),
  dataTableAssignment: type.unit(5),
  rowNames: type.unit(535),
  rowLookup: type.unit(843),
  genreLookup: type.unit(930),
  addUnlockPool: type.unit(3559),
  randomPoolItem: type.unit(1241),
  findExisting: type.unit(1337),
  duplicateBranch: type.unit(1383),
  removeDuplicateFromPool: type.unit(1429),
  addSourceMap: type.unit(2129),
  addPosterMap: type.unit(2842),
  enumerateSourceValues: type.unit(2978),
  secondHandBranch: type.unit(3254),
  removeSecondHand: type.unit(3364),
  cleanupLoopBack: type.unit(3498),
  "+": "reject",
}).readonly();
const $definitionSourceMapEvidence = type({
  kind: type.unit("kismet-analysis"),
  confidence: type.unit("direct"),
  classPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C",
  ),
  loadFunction: type.unit("ExampleLoad"),
  eventGraphFunction: type.unit("ExecuteExampleGraph_ExampleManager"),
  generationFunction: type.unit("ExampleGenerateRecord"),
  statementIndexes: $definitionSourceMapStatementIndexes,
  "+": "reject",
}).readonly();
const $definitionSourceMapLifecycle = type({
  collection: type.unit("Example Source Map"),
  posterCollection: type.unit("Example Poster Map"),
  restore: $definitionSourceMapRestore,
  generation: $definitionSourceMapGeneration,
  cleanup: $definitionSourceMapCleanup,
  evidence: $definitionSourceMapEvidence,
  "+": "reject",
}).readonly();
const $definitionCandidateRebuild = type({
  trigger: type.unit("filter-all-new-release-movie-data"),
  requiresWeatherReference: type.unit(true),
  sourceCollection: type.unit("Example Source Map"),
  candidateCollection: type.unit(
    "Example Candidate Map",
  ),
  candidateCollectionClearedBeforeScan: type.unit(true),
  iteration: type.unit("source-map-values"),
  "+": "reject",
}).readonly();
const $definitionCandidatePreconditions = type({
  released: type.unit(true),
  secondHandAvailable: type.unit(false),
  operator: type.unit("and"),
  "+": "reject",
}).readonly();
const $definitionGameModeCastFailure = type({
  isNew: type.unit(false),
  remainingDays: type.unit(0),
  "+": "reject",
}).readonly();
const $definitionCandidatePredicate = type({
  function: type.unit("Evaluate Example Record"),
  ownerClass: type.unit("ExampleRecord_C"),
  durationDays: type.unit(7),
  elapsedDays: type.unit("days-passed-minus-available-in-game-day"),
  comparison: type.unit("elapsed-days-less-than-or-equal-to-duration"),
  lowerBoundEnforced: type.unit(false),
  remainingDays: type.unit(
    "available-in-game-day-plus-duration-minus-days-passed",
  ),
  gameModeCastFailure: $definitionGameModeCastFailure,
  "+": "reject",
}).readonly();
const $definitionCandidateOutcomeEligible = type({
  collection: type.unit("Example Candidate Map"),
  key: type.unit("product-sku"),
  secondHandAvailable: type.unit(false),
  basePrice: type.unit(0),
  "+": "reject",
}).readonly();
const $definitionCandidateOutcomePreconditionFailure = type({
  collection: type.unit("Example Source Map"),
  effect: type.unit("no-mutation"),
  "+": "reject",
}).readonly();
const $definitionCandidateOutcomePredicateFailure = type({
  collection: type.unit("Example Source Map"),
  key: type.unit("product-sku"),
  secondHandAvailable: type.unit(true),
  basePrice: type.unit(0),
  "+": "reject",
}).readonly();
const $definitionCandidateOutcomes = type({
  eligible: $definitionCandidateOutcomeEligible,
  preconditionFailure: $definitionCandidateOutcomePreconditionFailure,
  predicateFailure: $definitionCandidateOutcomePredicateFailure,
  remainingDaysConsumedByCaller: type.unit(false),
  "+": "reject",
}).readonly();
const $definitionCandidateStatementIndexes = type({
  clearCandidateCollection: type.unit(66),
  enumerateSourceValues: type.unit(118),
  callPerFilmFilter: type.unit(390),
  checkSecondHand: type.unit(10),
  checkReleased: type.unit(49),
  combinePreconditions: type.unit(88),
  preconditionBranch: type.unit(116),
  predicateCall: type.unit(152),
  predicateBranch: type.unit(203),
  addEligible: type.unit(418),
  addIneligible: type.unit(697),
  durationAssignment: type.unit(0),
  gameModeCastBranch: type.unit(117),
  elapsedSubtract: type.unit(1512),
  compareDuration: type.unit(1634),
  remainingAdd: type.unit(1680),
  remainingSubtract: type.unit(1744),
  setEligible: type.unit(1838),
  setRemainingDays: type.unit(1857),
  castFailureSetEligible: type.unit(1889),
  castFailureSetRemainingDays: type.unit(1900),
  "+": "reject",
}).readonly();
const $definitionCandidateEvidence = type({
  kind: type.unit("kismet-analysis"),
  confidence: type.unit("direct"),
  marketClassPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C",
  ),
  rebuildFunction: type.unit("ExampleRebuildCandidates"),
  filterFunction: type.unit("Filter Example Schedule"),
  predicateClassPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/blueprint/data/ExampleRecord.ExampleRecord_C",
  ),
  predicateFunction: type.unit("Evaluate Example Record"),
  bindingRule: type.unit("exact-context-object-class-and-declaration"),
  relationship: type.unit("verified"),
  statementIndexes: $definitionCandidateStatementIndexes,
  "+": "reject",
}).readonly();
const $definitionCandidateEligibility = type({
  rebuild: $definitionCandidateRebuild,
  preconditions: $definitionCandidatePreconditions,
  predicate: $definitionCandidatePredicate,
  outcomes: $definitionCandidateOutcomes,
  evidence: $definitionCandidateEvidence,
  "+": "reject",
}).readonly();
const $definitionThreshold = type({
  origin: type.unit("first-save-game-day"),
  elapsedDays: type.unit(2),
  operator: type.unit("greater-than-or-equal"),
  currentDate: type.unit("weather-current-date"),
  "+": "reject",
}).readonly();
const $definitionMutation = type({
  field: type.unit("ExampleReleaseKind"),
  value: type.unit(true),
  when: type.unit("threshold-reached"),
  "+": "reject",
}).readonly();
const $definitionWrapperFunctions = type({
  resetToNewDay: type.unit("Reset to new Day Event_Event"),
  newReleaseCheck: type.unit("ExampleReleaseEnabled"),
  "+": "reject",
}).readonly();
const $definitionEntryPoints = type({
  resetToNewDay: type.unit(3364),
  newReleaseCheck: type.unit(3379),
  "+": "reject",
}).readonly();
const $definitionStatementIndexes = type({
  resetCallsCheck: type.unit(3364),
  firstSaveDay: type.unit(3401),
  makeTwoDayTimespan: type.unit(3442),
  addThreshold: type.unit(3495),
  compareCurrentDate: type.unit(3533),
  condition: type.unit(3583),
  successJump: type.unit(3593),
  setUnlocked: type.unit(3352),
  "+": "reject",
}).readonly();
const $definitionEvidence = type({
  kind: type.unit("kismet-analysis"),
  confidence: type.unit("direct"),
  classPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C",
  ),
  wrapperFunctions: $definitionWrapperFunctions,
  entryPoints: $definitionEntryPoints,
  eventGraphFunction: type.unit("ExecuteExampleGraph_ExampleUnlockSystem"),
  statementIndexes: $definitionStatementIndexes,
  "+": "reject",
}).readonly();
const $definitionUnlock = type({
  trigger: type.unit("reset-to-new-day-event"),
  threshold: $definitionThreshold,
  mutation: $definitionMutation,
  evidence: $definitionEvidence,
  "+": "reject",
}).readonly();
const $definitionRandomGate = type({
  function: type.unit("RandomBoolWithWeight"),
  trueWeight: type.unit(0.5),
  "+": "reject",
}).readonly();
const $definitionRequestCondition = type({
  unlockField: type.unit("ExampleReleaseKind"),
  requiredValue: type.unit(true),
  operator: type.unit("and"),
  randomGate: $definitionRandomGate,
  "+": "reject",
}).readonly();
const $definitionRequestOutputs = type({
  onlyNewRelease: type.unit(true),
  mandatoryRequest: type.unit("primary-request-map"),
  "+": "reject",
}).readonly();
const $definitionRequestEffect = type({
  guaranteedRequestStep: type.unit(1),
  runOptionalPass: type.unit(false),
  newReleaseRequested: type.unit(true),
  primaryRequestCode: type.unit(5),
  primaryRequestValue: type.unit(true),
  outputs: $definitionRequestOutputs,
  "+": "reject",
}).readonly();
const $definitionRequestStatementIndexes = type({
  randomCall: type.unit(2253),
  combineConditions: type.unit(2278),
  unlockRead: type.unit(2309),
  conditionBranch: type.unit(2328),
  setGuaranteedStep: type.unit(2342),
  disableOptionalPass: type.unit(2365),
  loopToDispatch: type.unit(2376),
  stepOneComparison: type.unit(2108),
  stepOneRoute: type.unit(2132),
  setNewReleaseRequested: type.unit(4028),
  setRequestValue: type.unit(4039),
  setRequestCode: type.unit(4050),
  addPrimaryRequest: type.unit(4092),
  setOnlyNewReleaseOutput: type.unit(3358),
  setMandatoryRequestOutput: type.unit(3396),
  "+": "reject",
}).readonly();
const $definitionRequestEvidence = type({
  kind: type.unit("kismet-analysis"),
  confidence: type.unit("direct"),
  classPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C",
  ),
  functionName: type.unit("Return Example Request"),
  statementIndexes: $definitionRequestStatementIndexes,
  "+": "reject",
}).readonly();
const $definitionRequestSelection = type({
  trigger: type.unit("return-movie-request"),
  condition: $definitionRequestCondition,
  effect: $definitionRequestEffect,
  evidence: $definitionRequestEvidence,
  "+": "reject",
}).readonly();
const $definitionGeneratorCopiedOutputs = type({
  onlyNewRelease: type.unit("only-new-release-output"),
  primaryRequest: type.unit("mandatory-request-output"),
  optionalRequest: type.unit("optional-request-output"),
  "+": "reject",
}).readonly();
const $definitionGeneratorSelector = type({
  function: type.unit("Return Example Request"),
  successRequired: type.unit(true),
  copiedOutputs: $definitionGeneratorCopiedOutputs,
  requestGenerated: type.unit(true),
  "+": "reject",
}).readonly();
const $definitionGeneratorRandomGate = type({
  function: type.unit("RandomBoolWithWeight"),
  trueWeight: type.unit(0.66),
  "+": "reject",
}).readonly();
const $definitionGeneratorCondition = type({
  onlyNewRelease: type.unit(true),
  gameModeType: type.unit("ExampleMode"),
  randomGate: $definitionGeneratorRandomGate,
  candidateCollection: type.unit(
    "Example Candidate Map",
  ),
  candidateCount: type.unit("greater-than-zero"),
  operator: type.unit("and"),
  "+": "reject",
}).readonly();
const $definitionCandidateEnumeration = type({
  keys: type.unit("map-keys"),
  values: type.unit("map-values"),
  pairing: type.unit("shared-array-index"),
  "+": "reject",
}).readonly();
const $definitionRandomIntegerEngineSemantics = type({
  engineVersion: type.unit("5.4"),
  wrapper: type.unit("UKismetMathLibrary::RandomInteger"),
  implementation: type.unit("FMath::RandHelper"),
  positiveInputRange: type.unit("zero-inclusive-to-input-exclusive"),
  nonPositiveInputResult: type.unit(0),
  "+": "reject",
}).readonly();
const $definitionCandidateIndexResult = type({
  oneCandidate: type.unit("index-zero"),
  multipleCandidates: type.unit("zero-through-candidate-count-minus-two"),
  finalEnumeratedPairSelectable: type.unit(false),
  "+": "reject",
}).readonly();
const $definitionCandidateIndex = type({
  function: type.unit("RandomInteger"),
  input: type.unit("candidate-count-minus-one"),
  engineSemantics: $definitionRandomIntegerEngineSemantics,
  result: $definitionCandidateIndexResult,
  "+": "reject",
}).readonly();
const $definitionNewReleaseCandidateSelection = type({
  condition: $definitionGeneratorCondition,
  enumeration: $definitionCandidateEnumeration,
  index: $definitionCandidateIndex,
  "+": "reject",
}).readonly();
const $definitionGeneratorEffect = type({
  requestMovieSku: type.unit("selected-key"),
  reservedMovieProduct: type.unit("selected-value-product"),
  generateSuccess: type.unit(true),
  candidateSelectionRequiredForSuccess: type.unit(false),
  "+": "reject",
}).readonly();
const $definitionGeneratorStatementIndexes = type({
  selectorCall: type.unit(448),
  selectorSuccessBranch: type.unit(570),
  copyOnlyNewRelease: type.unit(735),
  copyMandatoryRequest: type.unit(1272),
  copyOptionalRequest: type.unit(1299),
  newReleaseBranch: type.unit(1331),
  randomGate: type.unit(1447),
  candidateCount: type.unit(1502),
  combinedCondition: type.unit(1631),
  enumerateKeys: type.unit(1702),
  enumerateValues: type.unit(1829),
  subtractOne: type.unit(2066),
  randomIndex: type.unit(2108),
  selectKey: type.unit(2176),
  assignMovieSku: type.unit(2213),
  selectValue: type.unit(2262),
  assignReservedProduct: type.unit(2299),
  setGenerateSuccess: type.unit(2336),
  "+": "reject",
}).readonly();
const $definitionGeneratorEngineSource = type({
  repository: type.unit("EpicGames/UnrealEngine"),
  commit: type.unit("847de5e2553adeb4d3498953604d0b0abe669780"),
  wrapperFile: type.unit(
    "Engine/Source/Runtime/Engine/Classes/Kismet/KismetMathLibrary.inl",
  ),
  implementationFile: type.unit(
    "Engine/Source/Runtime/Core/Public/Math/UnrealMathUtility.h",
  ),
  "+": "reject",
}).readonly();
const $definitionGeneratorEvidence = type({
  kind: type.unit("kismet-and-engine-source-analysis"),
  confidence: type.unit("direct"),
  classPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C",
  ),
  functionName: type.unit("Generate Example Request"),
  statementIndexes: $definitionGeneratorStatementIndexes,
  engineSource: $definitionGeneratorEngineSource,
  "+": "reject",
}).readonly();
const $definitionRequestGeneration = type({
  trigger: type.unit("generate-movie-request"),
  selector: $definitionGeneratorSelector,
  newReleaseCandidateSelection: $definitionNewReleaseCandidateSelection,
  effect: $definitionGeneratorEffect,
  evidence: $definitionGeneratorEvidence,
  "+": "reject",
}).readonly();

export const NewReleaseMechanicsSchema = type({
  artifactType: type.unit("new-release-mechanics"),
  build: $definitionBuild,
  sources: $definitionSources,
  scope: type.unit("new-release"),
  evidenceLevel: type.unit("typed-blueprint"),
  runtimeValidation: type.unit("not-run"),
  unlock: $definitionUnlock,
  requestSelection: $definitionRequestSelection,
  requestGeneration: $definitionRequestGeneration,
  sourceMapLifecycle: $definitionSourceMapLifecycle,
  candidateEligibility: $definitionCandidateEligibility,
  "+": "reject",
}).readonly();
export type NewReleaseMechanics = typeof NewReleaseMechanicsSchema.infer;

type NewReleaseSourceIdentity =
  NewReleaseMechanics["sources"][keyof NewReleaseMechanics["sources"]];
export type NewReleaseArtifactIdentity<
  ArtifactType extends NewReleaseSourceIdentity["artifactType"] =
    NewReleaseSourceIdentity["artifactType"],
> = Extract<NewReleaseSourceIdentity, { artifactType: ArtifactType }>;
