import {
  LevelProgressionSchema,
  type GameplayUnlockEnum,
  type LevelProgression,
  type LevelProgressionTargetProfile,
  type StructuredValues,
} from "@neonretrorewind/core";

import type {
  BlueprintCallTargetTraceArtifact,
  BlueprintFunctionTraceArtifact,
  BlueprintPropertyReferenceTraceArtifact,
} from "./blueprint-trace-inputs.ts";
import {
  assertChangeXpTrace,
  assertEndOfDayTrace,
  assertMaximumTraces,
} from "./level-progression-traces.ts";

export type LevelProgressionSources = LevelProgression["sources"];

export type LevelStructuredValuesArtifact = Pick<
  StructuredValues,
  "artifactType" | "build" | "mappings" | "engine" | "dataTables"
>;

export function compileLevelProgression(
  profile: LevelProgressionTargetProfile,
  structuredValues: LevelStructuredValuesArtifact,
  gameplayUnlockEnum: GameplayUnlockEnum,
  changeXpTrace: BlueprintFunctionTraceArtifact,
  maximumCallerTrace: BlueprintPropertyReferenceTraceArtifact,
  maximumTargetTrace: BlueprintCallTargetTraceArtifact,
  endOfDayTrace: BlueprintPropertyReferenceTraceArtifact,
  sources: LevelProgressionSources,
): LevelProgression {
  assertInputContracts(
    structuredValues,
    gameplayUnlockEnum,
    changeXpTrace,
    maximumCallerTrace,
    maximumTargetTrace,
    endOfDayTrace,
  );
  assertProfileContracts(profile, structuredValues, gameplayUnlockEnum, sources);
  assertChangeXpTrace(changeXpTrace, profile);
  assertMaximumTraces(
    maximumCallerTrace,
    maximumTargetTrace,
    sources.maximumCallerTrace,
    profile,
  );
  assertEndOfDayTrace(endOfDayTrace, profile);

  const gameplayUnlocks = compileGameplayUnlocks(gameplayUnlockEnum, profile);
  const { thresholds, referencedGameplayUnlocks } = compileThresholds(
    structuredValues,
    gameplayUnlocks,
    profile,
  );
  const maximumExperience = thresholds.at(-1)?.cumulativeXp;
  if (maximumExperience === undefined) {
    throw new Error("XP table does not contain a progression threshold.");
  }

  return LevelProgressionSchema.assert({
    artifactType: "level-progression",
    build: {
      steamAppId: structuredValues.build.steamAppId,
      steamBuildId: structuredValues.build.steamBuildId,
    },
    sources,
    scope: "level-progression",
    evidenceLevel: "typed-blueprint-data-table-and-engine-source",
    runtimeValidation: "not-run",
    table: {
      path: profile.xpTable.packagePath,
      rowStruct: profile.xpTable.rowStruct,
      levelField: profile.xpTable.fields.level,
      xpField: profile.xpTable.fields.requiredProgress,
      gameplayUnlockField: profile.xpTable.fields.gameplayUnlocks,
      rowCount: thresholds.length,
    },
    gameplayUnlockEnum: {
      packagePath: gameplayUnlockEnum.source.packagePath,
      objectPath: gameplayUnlockEnum.source.objectPath,
      enumName: gameplayUnlockEnum.source.enumName,
      enumeratorCount: gameplayUnlockEnum.enumerators.length,
      referencedEnumeratorCount: referencedGameplayUnlocks,
    },
    thresholds,
    experienceUpdate: {
      modificationInput: profile.traces.experienceUpdate.fields.modificationInput,
      lifetimeExperience: "current-plus-raw-modification",
      storedExperience:
        "minimum-of-current-plus-raw-modification-and-maximum",
      uiNotification: "raw-modification-and-capped-experience",
      dailyStatistic: "raw-modification",
      evidence: {
        kind: "kismet-analysis",
        confidence: "direct",
        classPath: profile.traces.experienceUpdate.classPath,
        functionName: profile.traces.experienceUpdate.functionName,
        statementIndexes: {
          retainModification: profile.traces.experienceUpdate.statements.retainModification,
          addLifetimeExperience:
            profile.traces.experienceUpdate.statements.addLifetimeExperienceEvidence,
          storeLifetimeExperience:
            profile.traces.experienceUpdate.statements.storeLifetimeExperience,
          addCurrentExperience:
            profile.traces.experienceUpdate.statements.addCurrentExperienceEvidence,
          capCurrentExperience:
            profile.traces.experienceUpdate.statements.capCurrentExperienceEvidence,
          storeCurrentExperience:
            profile.traces.experienceUpdate.statements.storeCurrentExperience,
          publishUiValue:
            profile.traces.experienceUpdate.statements.publishUiValueEvidence,
          addDailyStatistic:
            profile.traces.experienceUpdate.statements.addDailyStatisticEvidence,
        },
      },
    },
    maximum: {
      runtimeLevel: thresholds.length,
      experience: maximumExperience,
      derivation: "sum-all-xp-table-rows",
      evidence: {
        kind: "verified-call-target-and-kismet-analysis",
        confidence: "direct",
        callerClassPath: profile.traces.maximum.callerClassPath,
        callerFunction: profile.traces.maximum.callerFunction,
        targetClassPath: profile.traces.maximum.targetClassPath,
        targetFunction: profile.traces.maximum.targetFunction,
        bindingRule: "exact-context-object-class-and-declaration",
        relationship: "verified",
        destinationField: profile.traces.maximum.destinationField,
        statementIndexes: {
          callerCall: profile.traces.maximum.statements.callerCall,
          callerAssignment: profile.traces.maximum.statements.callerAssignment,
          targetColumn: profile.traces.maximum.statements.targetColumn,
          targetArrayLength: profile.traces.maximum.statements.targetArrayLength,
          targetLoopCondition: profile.traces.maximum.statements.targetLoopCondition,
          targetArrayGet: profile.traces.maximum.statements.targetArrayGet,
          targetConvert: profile.traces.maximum.statements.targetConvert,
          targetAccumulate: profile.traces.maximum.statements.targetAccumulate,
          targetLoopBack: profile.traces.maximum.statements.targetLoopBack,
          targetOutput: profile.traces.maximum.statements.targetOutput,
        },
      },
    },
    requirementLookup: {
      fullGame: "xp-table-row-at-current-runtime-level",
      demoOverride: {
        atOrAboveRuntimeLevel:
          profile.traces.requirementLookup.demoOverride.atOrAboveRuntimeLevel,
        requiredXp: profile.traces.requirementLookup.demoOverride.requiredXp,
        belowThreshold: "xp-table-row-at-current-runtime-level",
      },
      evidence: {
        kind: "kismet-analysis",
        confidence: "direct",
        classPath: profile.traces.requirementLookup.classPath,
        functionName: profile.traces.requirementLookup.functionName,
        statementIndexes: {
          readColumn: profile.traces.requirementLookup.statements.readColumn,
          demoComparison: profile.traces.requirementLookup.statements.demoComparison,
          demoOverride: profile.traces.requirementLookup.statements.demoOverride,
          fullGameArrayGet:
            profile.traces.requirementLookup.statements.fullGameArrayGet,
          fullGameConvert:
            profile.traces.requirementLookup.statements.fullGameConvert,
        },
      },
    },
    endOfDay: {
      levelIncrement: 1,
      repeatedLevelUps: true,
      remainingXpDeduction:
        "previous-level-requirement-minus-floor-initial-xp",
      remainingXpAfterTransition:
        "capped-experience-minus-new-level-cumulative-threshold",
      levelUpCondition: "progress-greater-than-or-equal-one",
      stopCondition: "timer-complete-or-remaining-xp-nonpositive",
      maximumStop: {
        requirementLookupIndex: thresholds.length,
        outOfBoundsArrayItem: "default-empty-string",
        convertedRequirement: 0,
        zeroDivisorResult: 0,
        levelUpComparisonResult: false,
        transitionRemainder: 0,
        engineSource: {
          repository: "EpicGames/UnrealEngine",
          commit: "847de5e2553adeb4d3498953604d0b0abe669780",
          arrayFile:
            "Engine/Source/Runtime/Engine/Private/KismetArrayLibrary.cpp",
          stringFile:
            "Engine/Source/Runtime/Engine/Private/KismetStringLibrary.cpp",
          mathFile:
            "Engine/Source/Runtime/Engine/Classes/Kismet/KismetMathLibrary.inl",
        },
      },
      evidence: {
        kind: "kismet-and-engine-source-analysis",
        confidence: "direct",
        classPath: profile.traces.endOfDay.classPath,
        eventGraphFunction: profile.traces.endOfDay.functions.eventGraph,
        statementIndexes: {
          initializePreviousRequirement:
            profile.traces.endOfDay.statements.initializePreviousRequirement,
          floorInitialXp: profile.traces.endOfDay.statements.floorInitialXp,
          deductLevelCost: profile.traces.endOfDay.statements.deductLevelCost,
          storeRemainingXp: profile.traces.endOfDay.statements.storeRemainingXp,
          resetInitialXp: profile.traces.endOfDay.statements.resetInitialXp,
          lookupNextRequirement:
            profile.traces.endOfDay.statements.lookupNextRequirement,
          incrementLevel: profile.traces.endOfDay.statements.incrementLevel,
          storeLevel: profile.traces.endOfDay.statements.storeLevel,
          returnToInitialization:
            profile.traces.endOfDay.statements.returnToInitialization,
          updateProgressText: profile.traces.endOfDay.statements.updateProgressText,
          progressDivide: profile.traces.endOfDay.statements.progressDivide,
          progressClamp: profile.traces.endOfDay.statements.progressClamp,
          storeProgress: profile.traces.endOfDay.statements.storeProgress,
          compareProgress: profile.traces.endOfDay.statements.compareProgress,
          levelUpRoute: profile.traces.endOfDay.statements.levelUpRoute,
          compareTimer: profile.traces.endOfDay.statements.compareTimer,
          compareRemainingXp:
            profile.traces.endOfDay.statements.compareRemainingXp,
          combineStopConditions:
            profile.traces.endOfDay.statements.combineStopConditions,
          clearTimer: profile.traces.endOfDay.statements.clearTimer,
        },
      },
    },
  });
}

function compileThresholds(
  input: LevelStructuredValuesArtifact,
  gameplayUnlocks: ReadonlyMap<
    string,
    GameplayUnlockEnum["enumerators"][number]
  >,
  profile: LevelProgressionTargetProfile,
): {
  readonly thresholds: LevelProgression["thresholds"];
  readonly referencedGameplayUnlocks: number;
} {
  const matchingTables = input.dataTables.filter(
    (table) =>
      table.path === profile.xpTable.packagePath ||
      table.name === profile.xpTable.name,
  );
  if (matchingTables.length !== 1) {
    throw new Error(
      `Expected one XP progression table, found ${matchingTables.length}.`,
    );
  }
  const table = matchingTables[0]!;
  if (
    table.path !== profile.xpTable.packagePath ||
    table.name !== profile.xpTable.name ||
    table.type !== "DataTable" ||
    table.rowStruct !== profile.xpTable.rowStruct
  ) {
    throw new Error("XP progression table identity changed.");
  }
  if (table.rows.length === 0) {
    throw new Error("XP progression table is empty.");
  }

  const referencedNames = new Set<string>();
  const rows = table.rows.map((row) => {
    assertSourceFields(row.values, row.key, profile);
    const level = readInteger(
      row.values,
      row.key,
      profile.xpTable.fields.level,
      profile,
    );
    const requiredXp = readInteger(
      row.values,
      row.key,
      profile.xpTable.fields.requiredProgress,
      profile,
    );
    if (requiredXp <= 0) {
      throw new Error(
        `Expected positive XP in ${profile.xpTable.packagePath} row ${row.key}.`,
      );
    }
    for (const field of [
      profile.xpTable.fields.movieCategories,
      profile.xpTable.fields.gameCategories,
    ]) {
      if (!Array.isArray(readSourceValue(row.values, row.key, field, profile))) {
        throw new Error(
          `Expected ${field} array in ${profile.xpTable.packagePath} row ${row.key}.`,
        );
      }
    }
    const unlocks = readGameplayUnlocks(
      row.values,
      row.key,
      gameplayUnlocks,
      referencedNames,
      profile,
    );
    return { row, level, requiredXp, unlocks };
  });
  rows.sort((left, right) => left.level - right.level);

  let cumulativeXp = 0;
  const thresholds = rows.map(({ row, level, requiredXp, unlocks }, index) => {
    if (level !== index || row.key !== String(index)) {
      throw new Error(
        `XP progression rows must use consecutive numeric levels from zero, found ${row.key}.`,
      );
    }
    cumulativeXp += requiredXp;
    if (!Number.isSafeInteger(cumulativeXp)) {
      throw new Error("Cumulative XP exceeds the safe integer range.");
    }
    return {
      runtimeLevel: level,
      nextRuntimeLevel: level + 1,
      requiredXp,
      cumulativeXp,
      gameplayUnlocks: unlocks,
      evidence: {
        kind: "data-table-row" as const,
        tablePath: table.path,
        rowKey: row.key,
      },
    };
  });
  if (referencedNames.size === 0) {
    throw new Error("XP progression table contains no gameplay unlocks.");
  }
  return {
    thresholds,
    referencedGameplayUnlocks: referencedNames.size,
  };
}

function compileGameplayUnlocks(
  input: GameplayUnlockEnum,
  profile: LevelProgressionTargetProfile,
): ReadonlyMap<string, GameplayUnlockEnum["enumerators"][number]> {
  if (input.artifactType !== "gameplay-unlock-enum") {
    throw new Error("Expected a gameplay-unlock-enum input.");
  }
  if (
    input.source.packagePath !== profile.gameplayUnlockEnum.packagePath ||
    input.source.objectPath !== profile.gameplayUnlockEnum.objectPath ||
    input.source.enumName !== profile.gameplayUnlockEnum.enumName
  ) {
    throw new Error("Gameplay-unlock enum identity changed.");
  }
  if (
    input.totals.enumeratorCount !== input.enumerators.length ||
    input.enumerators.length === 0
  ) {
    throw new Error("Gameplay-unlock enum totals do not match its values.");
  }

  const byName = new Map<
    string,
    GameplayUnlockEnum["enumerators"][number]
  >();
  const displayNames = new Set<string>();
  for (const [index, enumerator] of input.enumerators.entries()) {
    if (
      enumerator.value !== index ||
      !enumerator.internalName.startsWith(
        profile.gameplayUnlockEnum.internalNamePrefix,
      ) ||
      byName.has(enumerator.internalName) ||
      displayNames.has(enumerator.displayName)
    ) {
      throw new Error("Gameplay-unlock enum is not consecutive and unique.");
    }
    byName.set(enumerator.internalName, enumerator);
    displayNames.add(enumerator.displayName);
  }
  return byName;
}

function readGameplayUnlocks(
  values: object,
  rowKey: string,
  gameplayUnlocks: ReadonlyMap<
    string,
    GameplayUnlockEnum["enumerators"][number]
  >,
  referencedNames: Set<string>,
  profile: LevelProgressionTargetProfile,
): LevelProgression["thresholds"][number]["gameplayUnlocks"] {
  const field = profile.xpTable.fields.gameplayUnlocks;
  const source = readSourceValue(values, rowKey, field, profile);
  if (!Array.isArray(source)) {
    throw new Error(
      `Expected ${field} array in ${profile.xpTable.packagePath} row ${rowKey}.`,
    );
  }

  return source.map((value) => {
    if (typeof value !== "string" || !referencedNames.add(value)) {
      throw new Error(
        `Expected unique gameplay unlock names in ${profile.xpTable.packagePath} row ${rowKey}.`,
      );
    }
    const enumerator = gameplayUnlocks.get(value);
    if (enumerator === undefined) {
      throw new Error(
        `Gameplay unlock in ${profile.xpTable.packagePath} row ${rowKey} has no enum definition.`,
      );
    }
    return {
      enumValue: enumerator.value,
      internalName: enumerator.internalName,
      displayName: enumerator.displayName,
    };
  });
}

function assertSourceFields(
  values: object,
  rowKey: string,
  profile: LevelProgressionTargetProfile,
): void {
  const sourceFields = Object.values(profile.xpTable.fields);
  const keys = Object.keys(values);
  if (keys.length !== sourceFields.length) {
    throw new Error(
      `Expected ${sourceFields.length} fields in ${profile.xpTable.packagePath} row ${rowKey}.`,
    );
  }
  for (const prefix of sourceFields) {
    const matches = keys.filter((key) => key.startsWith(`${prefix}_`));
    if (matches.length !== 1) {
      throw new Error(
        `Expected one ${prefix} field in ${profile.xpTable.packagePath} row ${rowKey}.`,
      );
    }
  }
}

function readInteger(
  values: object,
  rowKey: string,
  prefix: string,
  profile: LevelProgressionTargetProfile,
): number {
  const value = readSourceValue(values, rowKey, prefix, profile);
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(
      `Expected safe integer ${prefix} in ${profile.xpTable.packagePath} row ${rowKey}.`,
    );
  }
  return value;
}

function readSourceValue(
  values: object,
  rowKey: string,
  prefix: string,
  profile: LevelProgressionTargetProfile,
): unknown {
  const matches = Object.entries(values).filter(([key]) =>
    key.startsWith(`${prefix}_`),
  );
  if (matches.length !== 1) {
    throw new Error(
      `Expected one ${prefix} field in ${profile.xpTable.packagePath} row ${rowKey}.`,
    );
  }
  return matches[0]![1];
}

function assertInputContracts(
  structuredValues: LevelStructuredValuesArtifact,
  gameplayUnlockEnum: GameplayUnlockEnum,
  changeXpTrace: BlueprintFunctionTraceArtifact,
  maximumCallerTrace: BlueprintPropertyReferenceTraceArtifact,
  maximumTargetTrace: BlueprintCallTargetTraceArtifact,
  endOfDayTrace: BlueprintPropertyReferenceTraceArtifact,
): void {
  if (structuredValues.artifactType !== "structured-values") {
    throw new Error("Expected a structured-values input.");
  }
  if (changeXpTrace.artifactType !== "blueprint-function-trace") {
    throw new Error("Expected the configured experience-update Blueprint function trace.");
  }
  if (
    maximumCallerTrace.artifactType !== "blueprint-property-reference-trace" ||
    endOfDayTrace.artifactType !== "blueprint-property-reference-trace"
  ) {
    throw new Error("Expected Blueprint property-reference traces.");
  }
  if (maximumTargetTrace.artifactType !== "blueprint-call-target-trace") {
    throw new Error("Expected a Blueprint call-target trace for maximum XP.");
  }

  const inputs = [
    gameplayUnlockEnum,
    changeXpTrace,
    maximumCallerTrace,
    maximumTargetTrace,
    endOfDayTrace,
  ];
  if (inputs.some((input) => !sameBuild(structuredValues.build, input.build))) {
    throw new Error("Level-progression inputs refer to different game builds.");
  }
  if (
    inputs.some((input) => !sameMappings(structuredValues.mappings, input.mappings))
  ) {
    throw new Error("Level-progression inputs refer to different mappings.");
  }
  if (inputs.some((input) => !sameEngine(structuredValues.engine, input.engine))) {
    throw new Error("Level-progression inputs refer to different engine configurations.");
  }
}

function assertProfileContracts(
  profile: LevelProgressionTargetProfile,
  structuredValues: LevelStructuredValuesArtifact,
  gameplayUnlockEnum: GameplayUnlockEnum,
  sources: LevelProgressionSources,
): void {
  if (profile.profileType !== "level-progression-target-profile") {
    throw new Error("Expected a level-progression target profile.");
  }
  if (
    profile.gameplayUnlockEnum.internalNamePrefix !==
      `${profile.gameplayUnlockEnum.enumName}::`
  ) {
    throw new Error("Target profile has an inconsistent gameplay-unlock enum prefix.");
  }
  if (
    new Set(Object.values(profile.xpTable.fields)).size !== 5 ||
    new Set(Object.values(profile.traces.endOfDay.functions)).size !== 5
  ) {
    throw new Error("Target profile contains duplicate field or function roles.");
  }
  if (
    profile.traces.requirementLookup.classPath !==
      profile.traces.endOfDay.classPath ||
    profile.traces.requirementLookup.functionName !==
      profile.traces.endOfDay.functions.requirementLookup ||
    profile.traces.maximum.callerClassPath !==
      profile.traces.experienceUpdate.classPath ||
    profile.traces.maximum.destinationField !==
      profile.traces.experienceUpdate.fields.maximumExperience
  ) {
    throw new Error("Target profile contains inconsistent trace relationships.");
  }
  if (
    profile.build.manifestSha256 !== structuredValues.build.manifestSha256 ||
    profile.build.steamAppId !== structuredValues.build.steamAppId ||
    profile.build.steamBuildId !== structuredValues.build.steamBuildId ||
    !sameMappings(profile.mappings, structuredValues.mappings) ||
    !sameEngine(profile.engine, structuredValues.engine)
  ) {
    throw new Error(
      "Level-progression target profile refers to a different build, mappings, or engine configuration.",
    );
  }
  if (
    gameplayUnlockEnum.targetProfile.fileName !== sources.targetProfile.fileName ||
    gameplayUnlockEnum.targetProfile.sizeBytes !== sources.targetProfile.sizeBytes ||
    gameplayUnlockEnum.targetProfile.sha256 !== sources.targetProfile.sha256 ||
    gameplayUnlockEnum.targetProfile.profileType !== sources.targetProfile.profileType
  ) {
    throw new Error(
      "Gameplay-unlock enum does not identify the supplied target profile.",
    );
  }
}

function sameBuild(
  expected: LevelStructuredValuesArtifact["build"],
  actual: LevelStructuredValuesArtifact["build"],
): boolean {
  return expected.manifestSha256 === actual.manifestSha256 &&
    expected.steamAppId === actual.steamAppId &&
    expected.steamBuildId === actual.steamBuildId;
}

function sameMappings(
  expected: LevelStructuredValuesArtifact["mappings"],
  actual: LevelStructuredValuesArtifact["mappings"],
): boolean {
  return expected.fileName === actual.fileName &&
    expected.sizeBytes === actual.sizeBytes &&
    expected.sha256 === actual.sha256 &&
    expected.formatVersion === actual.formatVersion;
}

function sameEngine(
  expected: LevelStructuredValuesArtifact["engine"],
  actual: LevelStructuredValuesArtifact["engine"],
): boolean {
  return expected.version === actual.version &&
    expected.cue4ParseProfile === actual.cue4ParseProfile &&
    expected.source === actual.source &&
    expected.confidence === actual.confidence;
}
