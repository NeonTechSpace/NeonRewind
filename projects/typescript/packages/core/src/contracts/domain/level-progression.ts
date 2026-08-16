import { type } from "arktype";

const $definitionNonNegativeInteger = type("number.integer").atLeast(0);
const $definitionPositiveInteger = type("number.integer").atLeast(1);
const $definitionSha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const $definitionBuild = type({
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();
const $definitionSourceIdentity = type({
  fileName: type("string").matching(new RegExp("^[^/\\\\]+\\.json$")),
  sha256: $definitionSha256,
  sizeBytes: $definitionPositiveInteger,
  artifactType: type.enumerated(
    "structured-values",
    "gameplay-unlock-enum",
    "blueprint-function-trace",
    "blueprint-property-reference-trace",
    "blueprint-call-target-trace",
  ),
  "+": "reject",
}).readonly();
const $definitionTargetProfileIdentity = type({
  fileName: type("string").matching(new RegExp("^[^/\\\\]+\\.json$")),
  sha256: $definitionSha256,
  sizeBytes: $definitionPositiveInteger,
  profileType: type.unit("level-progression-target-profile"),
  "+": "reject",
}).readonly();
const $definitionSources = type({
  targetProfile: $definitionTargetProfileIdentity,
  structuredValues: type.and(
    $definitionSourceIdentity,
    type({ "artifactType?": type.unit("structured-values") }).readonly(),
  ),
  gameplayUnlockEnum: type.and(
    $definitionSourceIdentity,
    type({ "artifactType?": type.unit("gameplay-unlock-enum") }).readonly(),
  ),
  changeXpTrace: type.and(
    $definitionSourceIdentity,
    type({ "artifactType?": type.unit("blueprint-function-trace") }).readonly(),
  ),
  maximumCallerTrace: type.and(
    $definitionSourceIdentity,
    type({
      "artifactType?": type.unit("blueprint-property-reference-trace"),
    }).readonly(),
  ),
  maximumTargetTrace: type.and(
    $definitionSourceIdentity,
    type({ "artifactType?": type.unit("blueprint-call-target-trace") }).readonly(),
  ),
  endOfDayTrace: type.and(
    $definitionSourceIdentity,
    type({
      "artifactType?": type.unit("blueprint-property-reference-trace"),
    }).readonly(),
  ),
  "+": "reject",
}).readonly();
const $definitionThresholdEvidence = type({
  kind: type.unit("data-table-row"),
  tablePath: type("string").matching(new RegExp("\\.uasset$")),
  rowKey: type("string").atLeastLength(1),
  "+": "reject",
}).readonly();
const $definitionGameplayUnlock = type({
  enumValue: $definitionNonNegativeInteger,
  internalName: type("string").atLeastLength(1),
  displayName: type("string").atLeastLength(1),
  "+": "reject",
}).readonly();
const $definitionThreshold = type({
  runtimeLevel: $definitionNonNegativeInteger,
  nextRuntimeLevel: $definitionPositiveInteger,
  requiredXp: $definitionPositiveInteger,
  cumulativeXp: $definitionPositiveInteger,
  gameplayUnlocks: $definitionGameplayUnlock.array().readonly(),
  evidence: $definitionThresholdEvidence,
  "+": "reject",
}).readonly();
const $definitionTable = type({
  path: type("string").matching(new RegExp("\\.uasset$")),
  rowStruct: type("string").atLeastLength(1),
  levelField: type("string").atLeastLength(1),
  xpField: type("string").atLeastLength(1),
  gameplayUnlockField: type("string").atLeastLength(1),
  rowCount: $definitionPositiveInteger,
  "+": "reject",
}).readonly();
const $definitionGameplayUnlockEnum = type({
  packagePath: type("string").matching(new RegExp("\\.uasset$")),
  objectPath: type("string").atLeastLength(1),
  enumName: type("string").atLeastLength(1),
  enumeratorCount: $definitionPositiveInteger,
  referencedEnumeratorCount: $definitionPositiveInteger,
  "+": "reject",
}).readonly();
const $definitionExperienceUpdateStatements = type({
  retainModification: $definitionNonNegativeInteger,
  addLifetimeExperience: $definitionNonNegativeInteger,
  storeLifetimeExperience: $definitionNonNegativeInteger,
  addCurrentExperience: $definitionNonNegativeInteger,
  capCurrentExperience: $definitionNonNegativeInteger,
  storeCurrentExperience: $definitionNonNegativeInteger,
  publishUiValue: $definitionNonNegativeInteger,
  addDailyStatistic: $definitionNonNegativeInteger,
  "+": "reject",
}).readonly();
const $definitionExperienceUpdateEvidence = type({
  kind: type.unit("kismet-analysis"),
  confidence: type.unit("direct"),
  classPath: type("string").atLeastLength(1),
  functionName: type("string").atLeastLength(1),
  statementIndexes: $definitionExperienceUpdateStatements,
  "+": "reject",
}).readonly();
const $definitionExperienceUpdate = type({
  modificationInput: type("string").atLeastLength(1),
  lifetimeExperience: type.unit("current-plus-raw-modification"),
  storedExperience: type.unit(
    "minimum-of-current-plus-raw-modification-and-maximum",
  ),
  uiNotification: type.unit("raw-modification-and-capped-experience"),
  dailyStatistic: type.unit("raw-modification"),
  evidence: $definitionExperienceUpdateEvidence,
  "+": "reject",
}).readonly();
const $definitionMaximumStatements = type({
  callerCall: $definitionNonNegativeInteger,
  callerAssignment: $definitionNonNegativeInteger,
  targetColumn: $definitionNonNegativeInteger,
  targetArrayLength: $definitionNonNegativeInteger,
  targetLoopCondition: $definitionNonNegativeInteger,
  targetArrayGet: $definitionNonNegativeInteger,
  targetConvert: $definitionNonNegativeInteger,
  targetAccumulate: $definitionNonNegativeInteger,
  targetLoopBack: $definitionNonNegativeInteger,
  targetOutput: $definitionNonNegativeInteger,
  "+": "reject",
}).readonly();
const $definitionMaximumEvidence = type({
  kind: type.unit("verified-call-target-and-kismet-analysis"),
  confidence: type.unit("direct"),
  callerClassPath: type("string").atLeastLength(1),
  callerFunction: type("string").atLeastLength(1),
  targetClassPath: type("string").atLeastLength(1),
  targetFunction: type("string").atLeastLength(1),
  bindingRule: type.unit("exact-context-object-class-and-declaration"),
  relationship: type.unit("verified"),
  destinationField: type("string").atLeastLength(1),
  statementIndexes: $definitionMaximumStatements,
  "+": "reject",
}).readonly();
const $definitionMaximum = type({
  runtimeLevel: $definitionPositiveInteger,
  experience: $definitionPositiveInteger,
  derivation: type.unit("sum-all-xp-table-rows"),
  evidence: $definitionMaximumEvidence,
  "+": "reject",
}).readonly();
const $definitionDemoOverride = type({
  atOrAboveRuntimeLevel: type.unit(3),
  requiredXp: type.unit(99999),
  belowThreshold: type.unit("xp-table-row-at-current-runtime-level"),
  "+": "reject",
}).readonly();
const $definitionRequirementStatements = type({
  readColumn: $definitionNonNegativeInteger,
  demoComparison: $definitionNonNegativeInteger,
  demoOverride: $definitionNonNegativeInteger,
  fullGameArrayGet: $definitionNonNegativeInteger,
  fullGameConvert: $definitionNonNegativeInteger,
  "+": "reject",
}).readonly();
const $definitionRequirementEvidence = type({
  kind: type.unit("kismet-analysis"),
  confidence: type.unit("direct"),
  classPath: type("string").atLeastLength(1),
  functionName: type("string").atLeastLength(1),
  statementIndexes: $definitionRequirementStatements,
  "+": "reject",
}).readonly();
const $definitionRequirementLookup = type({
  fullGame: type.unit("xp-table-row-at-current-runtime-level"),
  demoOverride: $definitionDemoOverride,
  evidence: $definitionRequirementEvidence,
  "+": "reject",
}).readonly();
const $definitionEndOfDayStatements = type({
  initializePreviousRequirement: $definitionNonNegativeInteger,
  floorInitialXp: $definitionNonNegativeInteger,
  deductLevelCost: $definitionNonNegativeInteger,
  storeRemainingXp: $definitionNonNegativeInteger,
  resetInitialXp: $definitionNonNegativeInteger,
  lookupNextRequirement: $definitionNonNegativeInteger,
  incrementLevel: $definitionNonNegativeInteger,
  storeLevel: $definitionNonNegativeInteger,
  returnToInitialization: $definitionNonNegativeInteger,
  updateProgressText: $definitionNonNegativeInteger,
  progressDivide: $definitionNonNegativeInteger,
  progressClamp: $definitionNonNegativeInteger,
  storeProgress: $definitionNonNegativeInteger,
  compareProgress: $definitionNonNegativeInteger,
  levelUpRoute: $definitionNonNegativeInteger,
  compareTimer: $definitionNonNegativeInteger,
  compareRemainingXp: $definitionNonNegativeInteger,
  combineStopConditions: $definitionNonNegativeInteger,
  clearTimer: $definitionNonNegativeInteger,
  "+": "reject",
}).readonly();
const $definitionEngineSource = type({
  repository: type.unit("EpicGames/UnrealEngine"),
  commit: type.unit("847de5e2553adeb4d3498953604d0b0abe669780"),
  arrayFile: type.unit(
    "Engine/Source/Runtime/Engine/Private/KismetArrayLibrary.cpp",
  ),
  stringFile: type.unit(
    "Engine/Source/Runtime/Engine/Private/KismetStringLibrary.cpp",
  ),
  mathFile: type.unit(
    "Engine/Source/Runtime/Engine/Classes/Kismet/KismetMathLibrary.inl",
  ),
  "+": "reject",
}).readonly();
const $definitionMaximumStop = type({
  requirementLookupIndex: $definitionPositiveInteger,
  outOfBoundsArrayItem: type.unit("default-empty-string"),
  convertedRequirement: type.unit(0),
  zeroDivisorResult: type.unit(0),
  levelUpComparisonResult: type.unit(false),
  transitionRemainder: type.unit(0),
  engineSource: $definitionEngineSource,
  "+": "reject",
}).readonly();
const $definitionEndOfDayEvidence = type({
  kind: type.unit("kismet-and-engine-source-analysis"),
  confidence: type.unit("direct"),
  classPath: type("string").atLeastLength(1),
  eventGraphFunction: type("string").atLeastLength(1),
  statementIndexes: $definitionEndOfDayStatements,
  "+": "reject",
}).readonly();
const $definitionEndOfDay = type({
  levelIncrement: type.unit(1),
  repeatedLevelUps: type.unit(true),
  remainingXpDeduction: type.unit(
    "previous-level-requirement-minus-floor-initial-xp",
  ),
  remainingXpAfterTransition: type.unit(
    "capped-experience-minus-new-level-cumulative-threshold",
  ),
  levelUpCondition: type.unit("progress-greater-than-or-equal-one"),
  stopCondition: type.unit("timer-complete-or-remaining-xp-nonpositive"),
  maximumStop: $definitionMaximumStop,
  evidence: $definitionEndOfDayEvidence,
  "+": "reject",
}).readonly();

export const LevelProgressionSchema = type({
  artifactType: type.unit("level-progression"),
  build: $definitionBuild,
  sources: $definitionSources,
  scope: type.unit("level-progression"),
  evidenceLevel: type.unit("typed-blueprint-data-table-and-engine-source"),
  runtimeValidation: type.unit("not-run"),
  table: $definitionTable,
  gameplayUnlockEnum: $definitionGameplayUnlockEnum,
  thresholds: $definitionThreshold.array().readonly(),
  experienceUpdate: $definitionExperienceUpdate,
  maximum: $definitionMaximum,
  requirementLookup: $definitionRequirementLookup,
  endOfDay: $definitionEndOfDay,
  "+": "reject",
}).readonly();

export type LevelProgression = typeof LevelProgressionSchema.infer;
export type LevelProgressionArtifactIdentity =
  Exclude<
    LevelProgression["sources"][keyof LevelProgression["sources"]],
    { readonly profileType: "level-progression-target-profile" }
  >;
export type LevelProgressionThreshold = LevelProgression["thresholds"][number];
