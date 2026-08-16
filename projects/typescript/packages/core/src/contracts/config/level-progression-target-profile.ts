import { type } from "arktype";

const sha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const nonEmptyString = type("string").atLeastLength(1);
const positiveInteger = type("number.integer").atLeast(1);
const nonNegativeInteger = type("number.integer").atLeast(0);
const identifier = nonEmptyString;
const sourceLocator = nonNegativeInteger;
const packagePath = type("string")
  .matching(new RegExp("\\.uasset$"))
  .atLeastLength(8);
const objectPath = type("string")
  .matching(new RegExp("\\.[^./:]+$"))
  .atLeastLength(3);

const build = type({
  manifestSha256: sha256,
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();

const mappings = type({
  fileName: type("string")
    .matching(new RegExp("^[^/\\\\]+\\.usmap$"))
    .atLeastLength(7),
  sizeBytes: positiveInteger,
  sha256,
  formatVersion: type.unit(4),
  "+": "reject",
}).readonly();

const engine = type({
  version: type.unit("5.4"),
  cue4ParseProfile: type.unit("GAME_UE5_4"),
  source: type.unit("configured"),
  confidence: type.unit("probable"),
  "+": "reject",
}).readonly();

const gameplayUnlockEnum = type({
  packagePath,
  objectPath,
  enumName: identifier,
  internalNamePrefix: nonEmptyString,
  "+": "reject",
}).readonly();

const xpTable = type({
  packagePath,
  objectPath,
  name: identifier,
  rowStruct: identifier,
  fields: type({
    level: identifier,
    gameplayUnlocks: identifier,
    movieCategories: identifier,
    gameCategories: identifier,
    requiredProgress: identifier,
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

const experienceUpdate = type({
  classPath: objectPath,
  functionName: identifier,
  fields: type({
    modificationInput: identifier,
    localModification: identifier,
    lifetimeExperience: identifier,
    currentExperience: identifier,
    maximumExperience: identifier,
    "+": "reject",
  }).readonly(),
  functions: type({
    publishUiValue: identifier,
    addDailyStatistic: identifier,
    "+": "reject",
  }).readonly(),
  symbols: type({
    lifetimeAddResult: identifier,
    currentAddResult: identifier,
    cappedResult: identifier,
    "+": "reject",
  }).readonly(),
  statements: type({
    retainModification: sourceLocator,
    addLifetimeExperience: sourceLocator,
    addLifetimeExperienceEvidence: sourceLocator,
    storeLifetimeExperience: sourceLocator,
    addCurrentExperience: sourceLocator,
    addCurrentExperienceEvidence: sourceLocator,
    capCurrentExperience: sourceLocator,
    capCurrentExperienceEvidence: sourceLocator,
    storeCurrentExperience: sourceLocator,
    publishUiValue: sourceLocator,
    publishUiValueEvidence: sourceLocator,
    addDailyStatistic: sourceLocator,
    addDailyStatisticEvidence: sourceLocator,
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

const maximum = type({
  callerClassPath: objectPath,
  callerFunction: identifier,
  targetClassPath: objectPath,
  targetFunction: identifier,
  destinationField: identifier,
  receiverObjectPath: objectPath,
  tableVariable: identifier,
  accumulator: identifier,
  outputField: identifier,
  symbols: type({
    callerResult: identifier,
    columnValues: identifier,
    arrayLength: identifier,
    arrayItem: identifier,
    convertedItem: identifier,
    accumulatedValue: identifier,
    loopCounter: identifier,
    arrayIndex: identifier,
    "+": "reject",
  }).readonly(),
  statements: type({
    callerContext: sourceLocator,
    callerCall: sourceLocator,
    callerAssignment: sourceLocator,
    targetTable: sourceLocator,
    targetColumn: sourceLocator,
    targetArrayLength: sourceLocator,
    targetLoopCondition: sourceLocator,
    targetLoopExit: sourceLocator,
    targetArrayGet: sourceLocator,
    targetConvert: sourceLocator,
    targetAccumulate: sourceLocator,
    targetStoreAccumulator: sourceLocator,
    targetIncrement: sourceLocator,
    targetLoopBack: sourceLocator,
    targetOutput: sourceLocator,
    "+": "reject",
  }).readonly(),
  jumpTargets: type({
    loopExit: sourceLocator,
    loopBack: sourceLocator,
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

const requirementLookup = type({
  classPath: objectPath,
  functionName: identifier,
  outputField: identifier,
  currentLevelSymbol: identifier,
  symbols: type({
    columnValues: identifier,
    arrayItem: identifier,
    convertedItem: identifier,
    "+": "reject",
  }).readonly(),
  statements: type({
    readColumn: sourceLocator,
    branch: sourceLocator,
    demoComparison: sourceLocator,
    demoOverride: sourceLocator,
    fullGameArrayGet: sourceLocator,
    fullGameConvert: sourceLocator,
    storeOutput: sourceLocator,
    "+": "reject",
  }).readonly(),
  jumpTargets: type({ fullGame: sourceLocator, "+": "reject" }).readonly(),
  demoOverride: type({
    atOrAboveRuntimeLevel: positiveInteger,
    requiredXp: positiveInteger,
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

const endOfDay = type({
  classPath: objectPath,
  levelProperty: identifier,
  functions: type({
    applyRewards: identifier,
    eventGraph: identifier,
    initializeAnimation: identifier,
    requirementLookup: identifier,
    cumulativeProgress: identifier,
    "+": "reject",
  }).readonly(),
  fields: type({
    currentExperience: identifier,
    dailyExperience: identifier,
    cumulativeExperience: identifier,
    initialExperience: identifier,
    remainingExperience: identifier,
    progressFraction: identifier,
    requirementOutput: identifier,
    "+": "reject",
  }).readonly(),
  symbols: type({
    initialPreviousLevel: identifier,
    initialPreviousCumulative: identifier,
    initialCurrentCumulative: identifier,
    initialCurrentCumulativeResult: identifier,
    initialStartingExperience: identifier,
    previousLevel: identifier,
    previousRequirement: identifier,
    flooredInitialExperience: identifier,
    levelCost: identifier,
    remainingAfterDeduction: identifier,
    nextRequirement: identifier,
    incrementedLevel: identifier,
    displayedRequirement: identifier,
    progressNumerator: identifier,
    progressDenominator: identifier,
    progressQuotient: identifier,
    clampedProgress: identifier,
    timerComplete: identifier,
    remainingComplete: identifier,
    cumulativeColumnValues: identifier,
    cumulativeArrayItem: identifier,
    cumulativeConvertedItem: identifier,
    cumulativeLoopCounter: identifier,
    cumulativeArrayIndex: identifier,
    cumulativeAccumulator: identifier,
    cumulativeLevelInput: identifier,
    "+": "reject",
  }).readonly(),
  statements: type({
    cumulativeLevelColumn: sourceLocator,
    cumulativeXpColumn: sourceLocator,
    cumulativeArrayLength: sourceLocator,
    cumulativeArrayGet: sourceLocator,
    cumulativeAccumulate: sourceLocator,
    cumulativeStopComparison: sourceLocator,
    cumulativeOutput: sourceLocator,
    initializePreviousCumulative: sourceLocator,
    initializeCurrentCumulative: sourceLocator,
    initializeSubtractDaily: sourceLocator,
    initializeSubtractPrevious: sourceLocator,
    initializeStoreInitial: sourceLocator,
    initializeStoreRemaining: sourceLocator,
    resetProgress: sourceLocator,
    previousLevelSubtract: sourceLocator,
    initializePreviousRequirement: sourceLocator,
    floorInitialXp: sourceLocator,
    calculateLevelCost: sourceLocator,
    deductLevelCost: sourceLocator,
    storeRemainingXp: sourceLocator,
    resetInitialXp: sourceLocator,
    lookupNextRequirement: sourceLocator,
    incrementLevel: sourceLocator,
    storeLevel: sourceLocator,
    returnToInitialization: sourceLocator,
    nextTickFirst: sourceLocator,
    nextTickSecond: sourceLocator,
    updateProgressText: sourceLocator,
    progressDivide: sourceLocator,
    progressClamp: sourceLocator,
    storeProgress: sourceLocator,
    compareProgress: sourceLocator,
    progressBranch: sourceLocator,
    levelUpRoute: sourceLocator,
    compareTimer: sourceLocator,
    compareRemainingXp: sourceLocator,
    combineStopConditions: sourceLocator,
    clearTimer: sourceLocator,
    "+": "reject",
  }).readonly(),
  jumpTargets: type({
    returnToInitialization: sourceLocator,
    nextTickFirst: sourceLocator,
    nextTickSecond: sourceLocator,
    progressIncomplete: sourceLocator,
    levelUpRoute: sourceLocator,
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

export const LevelProgressionTargetProfileSchema = type({
  profileType: type.unit("level-progression-target-profile"),
  build,
  mappings,
  engine,
  gameplayUnlockEnum,
  xpTable,
  traces: type({
    experienceUpdate,
    maximum,
    requirementLookup,
    endOfDay,
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

export type LevelProgressionTargetProfile =
  typeof LevelProgressionTargetProfileSchema.infer;
