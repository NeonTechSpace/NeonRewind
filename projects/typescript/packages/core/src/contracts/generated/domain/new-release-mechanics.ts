// Generated from src/contracts/domain/new-release-mechanics.ts by pnpm contracts:generate. Do not edit.

export interface NewReleaseMechanicsContract {
  artifactType: "new-release-mechanics";
  build: Build;
  sources: Sources;
  scope: "new-release";
  evidenceLevel: "typed-blueprint";
  runtimeValidation: "not-run";
  unlock: Unlock;
  requestSelection: RequestSelection;
  requestGeneration: RequestGeneration;
  candidateEligibility: CandidateEligibility;
}
export interface Build {
  steamAppId: string;
  steamBuildId: string;
}
export interface Sources {
  managerTrace: SourceIdentity & {
    artifactType: "unlockable-manager-trace";
  };
  wrapperTrace: SourceIdentity & {
    artifactType: "blueprint-function-trace";
  };
  propertyReaderTrace: SourceIdentity & {
    artifactType: "blueprint-property-reference-trace";
  };
  requestGeneratorTrace: SourceIdentity & {
    artifactType: "blueprint-function-trace";
  };
  candidateMapTrace: SourceIdentity & {
    artifactType: "blueprint-property-reference-trace";
  };
  callTargetTrace: SourceIdentity & {
    artifactType: "blueprint-call-target-trace";
  };
}
export interface SourceIdentity {
  fileName: string;
  sha256: string;
  sizeBytes: number;
  artifactType:
    | "unlockable-manager-trace"
    | "blueprint-function-trace"
    | "blueprint-property-reference-trace"
    | "blueprint-call-target-trace";
}
export interface Unlock {
  trigger: "reset-to-new-day-event";
  threshold: Threshold;
  mutation: Mutation;
  evidence: Evidence;
}
export interface Threshold {
  origin: "first-save-game-day";
  elapsedDays: 2;
  operator: "greater-than-or-equal";
  currentDate: "weather-current-date";
}
export interface Mutation {
  field: "ExampleReleaseKind";
  value: true;
  when: "threshold-reached";
}
export interface Evidence {
  kind: "kismet-analysis";
  confidence: "direct";
  classPath: "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C";
  wrapperFunctions: WrapperFunctions;
  entryPoints: EntryPoints;
  eventGraphFunction: "ExecuteExampleGraph_ExampleUnlockSystem";
  statementIndexes: StatementIndexes;
}
export interface WrapperFunctions {
  resetToNewDay: "Reset to new Day Event_Event";
  newReleaseCheck: "ExampleReleaseEnabled";
}
export interface EntryPoints {
  resetToNewDay: 3364;
  newReleaseCheck: 3379;
}
export interface StatementIndexes {
  resetCallsCheck: 3364;
  firstSaveDay: 3401;
  makeTwoDayTimespan: 3442;
  addThreshold: 3495;
  compareCurrentDate: 3533;
  condition: 3583;
  successJump: 3593;
  setUnlocked: 3352;
}
export interface RequestSelection {
  trigger: "return-movie-request";
  condition: RequestCondition;
  effect: RequestEffect;
  evidence: RequestEvidence;
}
export interface RequestCondition {
  unlockField: "ExampleReleaseKind";
  requiredValue: true;
  operator: "and";
  randomGate: RandomGate;
}
export interface RandomGate {
  function: "RandomBoolWithWeight";
  trueWeight: 0.5;
}
export interface RequestEffect {
  guaranteedRequestStep: 1;
  runOptionalPass: false;
  newReleaseRequested: true;
  primaryRequestCode: 5;
  primaryRequestValue: true;
  outputs: RequestOutputs;
}
export interface RequestOutputs {
  onlyNewRelease: true;
  mandatoryRequest: "primary-request-map";
}
export interface RequestEvidence {
  kind: "kismet-analysis";
  confidence: "direct";
  classPath: "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C";
  functionName: "Return Example Request";
  statementIndexes: RequestStatementIndexes;
}
export interface RequestStatementIndexes {
  randomCall: 2253;
  combineConditions: 2278;
  unlockRead: 2309;
  conditionBranch: 2328;
  setGuaranteedStep: 2342;
  disableOptionalPass: 2365;
  loopToDispatch: 2376;
  stepOneComparison: 2108;
  stepOneRoute: 2132;
  setNewReleaseRequested: 4028;
  setRequestValue: 4039;
  setRequestCode: 4050;
  addPrimaryRequest: 4092;
  setOnlyNewReleaseOutput: 3358;
  setMandatoryRequestOutput: 3396;
}
export interface RequestGeneration {
  trigger: "generate-movie-request";
  selector: GeneratorSelector;
  newReleaseCandidateSelection: NewReleaseCandidateSelection;
  effect: GeneratorEffect;
  evidence: GeneratorEvidence;
}
export interface GeneratorSelector {
  function: "Return Example Request";
  successRequired: true;
  copiedOutputs: GeneratorCopiedOutputs;
  requestGenerated: true;
}
export interface GeneratorCopiedOutputs {
  onlyNewRelease: "only-new-release-output";
  primaryRequest: "mandatory-request-output";
  optionalRequest: "optional-request-output";
}
export interface NewReleaseCandidateSelection {
  condition: GeneratorCondition;
  enumeration: CandidateEnumeration;
  index: CandidateIndex;
}
export interface GeneratorCondition {
  onlyNewRelease: true;
  gameModeType: "ExampleMode";
  randomGate: GeneratorRandomGate;
  candidateCollection: "Example Candidate Map";
  candidateCount: "greater-than-zero";
  operator: "and";
}
export interface GeneratorRandomGate {
  function: "RandomBoolWithWeight";
  trueWeight: 0.66;
}
export interface CandidateEnumeration {
  keys: "map-keys";
  values: "map-values";
  pairing: "shared-array-index";
}
export interface CandidateIndex {
  function: "RandomInteger";
  input: "candidate-count-minus-one";
  engineSemantics: RandomIntegerEngineSemantics;
  result: CandidateIndexResult;
}
export interface RandomIntegerEngineSemantics {
  engineVersion: "5.4";
  wrapper: "UKismetMathLibrary::RandomInteger";
  implementation: "FMath::RandHelper";
  positiveInputRange: "zero-inclusive-to-input-exclusive";
  nonPositiveInputResult: 0;
}
export interface CandidateIndexResult {
  oneCandidate: "index-zero";
  multipleCandidates: "zero-through-candidate-count-minus-two";
  finalEnumeratedPairSelectable: false;
}
export interface GeneratorEffect {
  requestMovieSku: "selected-key";
  reservedMovieProduct: "selected-value-product";
  generateSuccess: true;
  candidateSelectionRequiredForSuccess: false;
}
export interface GeneratorEvidence {
  kind: "kismet-and-engine-source-analysis";
  confidence: "direct";
  classPath: "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C";
  functionName: "Generate Example Request";
  statementIndexes: GeneratorStatementIndexes;
  engineSource: GeneratorEngineSource;
}
export interface GeneratorStatementIndexes {
  selectorCall: 448;
  selectorSuccessBranch: 570;
  copyOnlyNewRelease: 735;
  copyMandatoryRequest: 1272;
  copyOptionalRequest: 1299;
  newReleaseBranch: 1331;
  randomGate: 1447;
  candidateCount: 1502;
  combinedCondition: 1631;
  enumerateKeys: 1702;
  enumerateValues: 1829;
  subtractOne: 2066;
  randomIndex: 2108;
  selectKey: 2176;
  assignMovieSku: 2213;
  selectValue: 2262;
  assignReservedProduct: 2299;
  setGenerateSuccess: 2336;
}
export interface GeneratorEngineSource {
  repository: "EpicGames/UnrealEngine";
  commit: "847de5e2553adeb4d3498953604d0b0abe669780";
  wrapperFile: "Engine/Source/Runtime/Engine/Classes/Kismet/KismetMathLibrary.inl";
  implementationFile: "Engine/Source/Runtime/Core/Public/Math/UnrealMathUtility.h";
}
export interface CandidateEligibility {
  rebuild: CandidateRebuild;
  preconditions: CandidatePreconditions;
  predicate: CandidatePredicate;
  outcomes: CandidateOutcomes;
  evidence: CandidateEvidence;
}
export interface CandidateRebuild {
  trigger: "filter-all-new-release-movie-data";
  requiresWeatherReference: true;
  sourceCollection: "Example Source Map";
  candidateCollection: "Example Candidate Map";
  candidateCollectionClearedBeforeScan: true;
  iteration: "source-map-values";
}
export interface CandidatePreconditions {
  released: true;
  secondHandAvailable: false;
  operator: "and";
}
export interface CandidatePredicate {
  function: "Evaluate Example Record";
  ownerClass: "ExampleRecord_C";
  durationDays: 7;
  elapsedDays: "days-passed-minus-available-in-game-day";
  comparison: "elapsed-days-less-than-or-equal-to-duration";
  lowerBoundEnforced: false;
  remainingDays: "available-in-game-day-plus-duration-minus-days-passed";
  gameModeCastFailure: GameModeCastFailure;
}
export interface GameModeCastFailure {
  isNew: false;
  remainingDays: 0;
}
export interface CandidateOutcomes {
  eligible: CandidateOutcomeEligible;
  preconditionFailure: CandidateOutcomePreconditionFailure;
  predicateFailure: CandidateOutcomePredicateFailure;
  remainingDaysConsumedByCaller: false;
}
export interface CandidateOutcomeEligible {
  collection: "Example Candidate Map";
  key: "product-sku";
  secondHandAvailable: false;
  basePrice: 0;
}
export interface CandidateOutcomePreconditionFailure {
  collection: "Example Source Map";
  effect: "no-mutation";
}
export interface CandidateOutcomePredicateFailure {
  collection: "Example Source Map";
  key: "product-sku";
  secondHandAvailable: true;
  basePrice: 0;
}
export interface CandidateEvidence {
  kind: "kismet-analysis";
  confidence: "direct";
  marketClassPath: "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C";
  rebuildFunction: "ExampleRebuildCandidates";
  filterFunction: "Filter Example Schedule";
  predicateClassPath: "ExampleGame/Content/ExampleProject/core/blueprint/data/ExampleRecord.ExampleRecord_C";
  predicateFunction: "Evaluate Example Record";
  bindingRule: "exact-context-object-class-and-declaration";
  relationship: "verified";
  statementIndexes: CandidateStatementIndexes;
}
export interface CandidateStatementIndexes {
  clearCandidateCollection: 66;
  enumerateSourceValues: 118;
  callPerFilmFilter: 390;
  checkSecondHand: 10;
  checkReleased: 49;
  combinePreconditions: 88;
  preconditionBranch: 116;
  predicateCall: 152;
  predicateBranch: 203;
  addEligible: 418;
  addIneligible: 697;
  durationAssignment: 0;
  gameModeCastBranch: 117;
  elapsedSubtract: 1512;
  compareDuration: 1634;
  remainingAdd: 1680;
  remainingSubtract: 1744;
  setEligible: 1838;
  setRemainingDays: 1857;
  castFailureSetEligible: 1889;
  castFailureSetRemainingDays: 1900;
}
