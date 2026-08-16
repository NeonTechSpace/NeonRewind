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
const $definitionSources = type({
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
  path: type.unit(
    "ExampleGame/Content/ExampleProject/core/gamesettings/ExampleThresholdTable.uasset",
  ),
  rowStruct: type.unit("ExampleThresholdStruct"),
  levelField: type.unit("ExampleLevel"),
  xpField: type.unit("ExampleRequiredProgress"),
  gameplayUnlockField: type.unit("ExampleUnlocks"),
  rowCount: $definitionPositiveInteger,
  "+": "reject",
}).readonly();
const $definitionGameplayUnlockEnum = type({
  packagePath: type.unit(
    "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockKind.uasset",
  ),
  objectPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockKind.ExampleUnlockKind",
  ),
  enumName: type.unit("ExampleUnlockKind"),
  enumeratorCount: $definitionPositiveInteger,
  referencedEnumeratorCount: $definitionPositiveInteger,
  "+": "reject",
}).readonly();
const $definitionExperienceUpdateStatements = type({
  retainModification: type.unit(5),
  addLifetimeExperience: type.unit(32),
  storeLifetimeExperience: type.unit(78),
  addCurrentExperience: type.unit(105),
  capCurrentExperience: type.unit(151),
  storeCurrentExperience: type.unit(197),
  publishUiValue: type.unit(224),
  addDailyStatistic: type.unit(344),
  "+": "reject",
}).readonly();
const $definitionExperienceUpdateEvidence = type({
  kind: type.unit("kismet-analysis"),
  confidence: type.unit("direct"),
  classPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/gamemode/ExampleMode.ExampleMode_C",
  ),
  functionName: type.unit("Apply Example Progress"),
  statementIndexes: $definitionExperienceUpdateStatements,
  "+": "reject",
}).readonly();
const $definitionExperienceUpdate = type({
  modificationInput: type.unit("Example Progress Delta"),
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
  callerCall: type.unit(31015),
  callerAssignment: type.unit(31039),
  targetColumn: type.unit(136),
  targetArrayLength: type.unit(254),
  targetLoopCondition: type.unit(283),
  targetArrayGet: type.unit(379),
  targetConvert: type.unit(434),
  targetAccumulate: type.unit(471),
  targetLoopBack: type.unit(656),
  targetOutput: type.unit(555),
  "+": "reject",
}).readonly();
const $definitionMaximumEvidence = type({
  kind: type.unit("verified-call-target-and-kismet-analysis"),
  confidence: type.unit("direct"),
  callerClassPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/gamemode/ExampleMode.ExampleMode_C",
  ),
  callerFunction: type.unit("ExecuteExampleGraph_ExampleMode"),
  targetClassPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleProgression.ExampleProgression_C",
  ),
  targetFunction: type.unit("Get Example Progress Limit"),
  bindingRule: type.unit("exact-context-object-class-and-declaration"),
  relationship: type.unit("verified"),
  destinationField: type.unit("Example Progress Limit"),
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
  readColumn: type.unit(18),
  demoComparison: type.unit(196),
  demoOverride: type.unit(234),
  fullGameArrayGet: type.unit(412),
  fullGameConvert: type.unit(467),
  "+": "reject",
}).readonly();
const $definitionRequirementEvidence = type({
  kind: type.unit("kismet-analysis"),
  confidence: type.unit("direct"),
  classPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/widget/dayUI/ExampleEndOfPeriod.ExampleEndOfPeriod_C",
  ),
  functionName: type.unit("Get Example Threshold"),
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
  initializePreviousRequirement: type.unit(160),
  floorInitialXp: type.unit(210),
  deductLevelCost: type.unit(293),
  storeRemainingXp: type.unit(321),
  resetInitialXp: type.unit(348),
  lookupNextRequirement: type.unit(375),
  incrementLevel: type.unit(576),
  storeLevel: type.unit(622),
  returnToInitialization: type.unit(953),
  updateProgressText: type.unit(2912),
  progressDivide: type.unit(4034),
  progressClamp: type.unit(4080),
  storeProgress: type.unit(4117),
  compareProgress: type.unit(1786),
  levelUpRoute: type.unit(1828),
  compareTimer: type.unit(1843),
  compareRemainingXp: type.unit(1881),
  combineStopConditions: type.unit(1915),
  clearTimer: type.unit(1953),
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
  classPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/widget/dayUI/ExampleEndOfPeriod.ExampleEndOfPeriod_C",
  ),
  eventGraphFunction: type.unit("ExecuteExampleGraph_ExampleEndOfPeriod"),
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
  LevelProgression["sources"][keyof LevelProgression["sources"]];
export type LevelProgressionThreshold = LevelProgression["thresholds"][number];
