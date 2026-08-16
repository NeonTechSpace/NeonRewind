import {
  LevelProgressionSchema,
  type GameplayUnlockEnum,
  type LevelProgression,
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
  changeXpFunctionName,
  endOfDayClassPath,
  endOfDayEventGraphName,
  experienceClassPath,
  gameModeClassPath,
  gameModeEventGraphName,
  maximumFunctionName,
  requirementFunctionName,
} from "./level-progression-traces.ts";

export type LevelProgressionSources = LevelProgression["sources"];

export type LevelStructuredValuesArtifact = Pick<
  StructuredValues,
  "artifactType" | "build" | "mappings" | "engine" | "dataTables"
>;

const xpTablePath =
  "ExampleGame/Content/ExampleProject/core/gamesettings/ExampleThresholdTable.uasset";
const xpTableName = "ExampleThresholdTable";
const xpRowStruct = "ExampleThresholdStruct";
const sourceFieldPrefixes = [
  "ExampleLevel",
  "ExampleUnlocks",
  "ExampleMovieCategories",
  "ExampleGameCategories",
  "ExampleRequiredProgress",
] as const;

export function compileLevelProgression(
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
  assertChangeXpTrace(changeXpTrace);
  assertMaximumTraces(
    maximumCallerTrace,
    maximumTargetTrace,
    sources.maximumCallerTrace,
  );
  assertEndOfDayTrace(endOfDayTrace);

  const gameplayUnlocks = compileGameplayUnlocks(gameplayUnlockEnum);
  const { thresholds, referencedGameplayUnlocks } = compileThresholds(
    structuredValues,
    gameplayUnlocks,
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
      path: xpTablePath,
      rowStruct: xpRowStruct,
      levelField: "ExampleLevel",
      xpField: "ExampleRequiredProgress",
      gameplayUnlockField: "ExampleUnlocks",
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
      modificationInput: "Example Progress Delta",
      lifetimeExperience: "current-plus-raw-modification",
      storedExperience:
        "minimum-of-current-plus-raw-modification-and-maximum",
      uiNotification: "raw-modification-and-capped-experience",
      dailyStatistic: "raw-modification",
      evidence: {
        kind: "kismet-analysis",
        confidence: "direct",
        classPath: gameModeClassPath,
        functionName: changeXpFunctionName,
        statementIndexes: {
          retainModification: 5,
          addLifetimeExperience: 32,
          storeLifetimeExperience: 78,
          addCurrentExperience: 105,
          capCurrentExperience: 151,
          storeCurrentExperience: 197,
          publishUiValue: 224,
          addDailyStatistic: 344,
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
        callerClassPath: gameModeClassPath,
        callerFunction: gameModeEventGraphName,
        targetClassPath: experienceClassPath,
        targetFunction: maximumFunctionName,
        bindingRule: "exact-context-object-class-and-declaration",
        relationship: "verified",
        destinationField: "Example Progress Limit",
        statementIndexes: {
          callerCall: 31015,
          callerAssignment: 31039,
          targetColumn: 136,
          targetArrayLength: 254,
          targetLoopCondition: 283,
          targetArrayGet: 379,
          targetConvert: 434,
          targetAccumulate: 471,
          targetLoopBack: 656,
          targetOutput: 555,
        },
      },
    },
    requirementLookup: {
      fullGame: "xp-table-row-at-current-runtime-level",
      demoOverride: {
        atOrAboveRuntimeLevel: 3,
        requiredXp: 99999,
        belowThreshold: "xp-table-row-at-current-runtime-level",
      },
      evidence: {
        kind: "kismet-analysis",
        confidence: "direct",
        classPath: endOfDayClassPath,
        functionName: requirementFunctionName,
        statementIndexes: {
          readColumn: 18,
          demoComparison: 196,
          demoOverride: 234,
          fullGameArrayGet: 412,
          fullGameConvert: 467,
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
        classPath: endOfDayClassPath,
        eventGraphFunction: endOfDayEventGraphName,
        statementIndexes: {
          initializePreviousRequirement: 160,
          floorInitialXp: 210,
          deductLevelCost: 293,
          storeRemainingXp: 321,
          resetInitialXp: 348,
          lookupNextRequirement: 375,
          incrementLevel: 576,
          storeLevel: 622,
          returnToInitialization: 953,
          updateProgressText: 2912,
          progressDivide: 4034,
          progressClamp: 4080,
          storeProgress: 4117,
          compareProgress: 1786,
          levelUpRoute: 1828,
          compareTimer: 1843,
          compareRemainingXp: 1881,
          combineStopConditions: 1915,
          clearTimer: 1953,
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
): {
  readonly thresholds: LevelProgression["thresholds"];
  readonly referencedGameplayUnlocks: number;
} {
  const matchingTables = input.dataTables.filter(
    (table) => table.path === xpTablePath || table.name === xpTableName,
  );
  if (matchingTables.length !== 1) {
    throw new Error(
      `Expected one XP progression table, found ${matchingTables.length}.`,
    );
  }
  const table = matchingTables[0]!;
  if (
    table.path !== xpTablePath ||
    table.name !== xpTableName ||
    table.type !== "DataTable" ||
    table.rowStruct !== xpRowStruct
  ) {
    throw new Error("XP progression table identity changed.");
  }
  if (table.rows.length === 0) {
    throw new Error("XP progression table is empty.");
  }

  const referencedNames = new Set<string>();
  const rows = table.rows.map((row) => {
    assertSourceFields(row.values, row.key);
    const level = readInteger(row.values, row.key, "ExampleLevel");
    const requiredXp = readInteger(row.values, row.key, "ExampleRequiredProgress");
    if (requiredXp <= 0) {
      throw new Error(`Expected positive XP in ${xpTablePath} row ${row.key}.`);
    }
    for (const field of ["ExampleMovieCategories", "ExampleGameCategories"] as const) {
      if (!Array.isArray(readSourceValue(row.values, row.key, field))) {
        throw new Error(`Expected ${field} array in ${xpTablePath} row ${row.key}.`);
      }
    }
    const unlocks = readGameplayUnlocks(
      row.values,
      row.key,
      gameplayUnlocks,
      referencedNames,
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
): ReadonlyMap<string, GameplayUnlockEnum["enumerators"][number]> {
  if (input.artifactType !== "gameplay-unlock-enum") {
    throw new Error("Expected a gameplay-unlock-enum input.");
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
): LevelProgression["thresholds"][number]["gameplayUnlocks"] {
  const source = readSourceValue(values, rowKey, "ExampleUnlocks");
  if (!Array.isArray(source)) {
    throw new Error(`Expected ExampleUnlocks array in ${xpTablePath} row ${rowKey}.`);
  }

  return source.map((value) => {
    if (typeof value !== "string" || !referencedNames.add(value)) {
      throw new Error(
        `Expected unique gameplay unlock names in ${xpTablePath} row ${rowKey}.`,
      );
    }
    const enumerator = gameplayUnlocks.get(value);
    if (enumerator === undefined) {
      throw new Error(
        `Gameplay unlock in ${xpTablePath} row ${rowKey} has no enum definition.`,
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
): void {
  const keys = Object.keys(values);
  if (keys.length !== sourceFieldPrefixes.length) {
    throw new Error(
      `Expected ${sourceFieldPrefixes.length} fields in ${xpTablePath} row ${rowKey}.`,
    );
  }
  for (const prefix of sourceFieldPrefixes) {
    const matches = keys.filter((key) => key.startsWith(`${prefix}_`));
    if (matches.length !== 1) {
      throw new Error(
        `Expected one ${prefix} field in ${xpTablePath} row ${rowKey}.`,
      );
    }
  }
}

function readInteger(
  values: object,
  rowKey: string,
  prefix: "ExampleLevel" | "ExampleRequiredProgress",
): number {
  const value = readSourceValue(values, rowKey, prefix);
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`Expected safe integer ${prefix} in ${xpTablePath} row ${rowKey}.`);
  }
  return value;
}

function readSourceValue(
  values: object,
  rowKey: string,
  prefix: (typeof sourceFieldPrefixes)[number],
): unknown {
  const matches = Object.entries(values).filter(([key]) =>
    key.startsWith(`${prefix}_`),
  );
  if (matches.length !== 1) {
    throw new Error(`Expected one ${prefix} field in ${xpTablePath} row ${rowKey}.`);
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
    throw new Error("Expected a Blueprint function trace for Apply Example Progress.");
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
