import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  GameplayUnlockEnumSchema,
  LevelProgressionCategoryEnumsSchema,
  LevelProgressionSchema,
  LevelProgressionTargetProfileSchema,
} from "@neonretrorewind/core";

import { compileLevelProgression } from "../src/level-progression.ts";
import { validateJsonSchema } from "./json-schema-validation.ts";
import {
  createChangeXpTrace,
  createEndOfDayTrace,
  createGameplayUnlockEnum,
  createLevelStructuredValues,
  createLevelProgressionCategoryEnums,
  createLevelProgressionTargetProfile,
  createMaximumCallerTrace,
  createMaximumTargetTrace,
  levelProgressionSources,
  levelProgressionTargetProfile,
} from "./level-progression-fixtures.ts";

test("accepts the target profile through both public contracts", async () => {
  const schemaPath = new URL(
    "../../../../game-data-exporter/schemas/config/level-progression-target-profile.schema.json",
    import.meta.url,
  );
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;

  assert.deepEqual(
    schema,
    LevelProgressionTargetProfileSchema.toJsonSchema(),
  );
  assert.equal(
    LevelProgressionTargetProfileSchema.allows(levelProgressionTargetProfile),
    true,
  );
  validateJsonSchema(
    levelProgressionTargetProfile,
    schema,
    "Level-progression target profile",
  );
});

test("compiles normalized level thresholds and progression behavior", () => {
  const progression = compileCurrent();

  assert.equal(progression.artifactType, "level-progression");
  assert.equal(progression.scope, "level-progression");
  assert.deepEqual(progression.sources, levelProgressionSources);
  assert.deepEqual(progression.gameplayUnlockEnum, {
    packagePath:
      "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockKind.uasset",
    objectPath:
      "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockKind.ExampleUnlockKind",
    enumName: "ExampleUnlockKind",
    enumeratorCount: 4,
    referencedEnumeratorCount: 3,
  });
  assert.deepEqual(
    progression.thresholds.map((threshold) => threshold.gameplayUnlocks),
    [0, 1, 2].map((value) => [
      {
        enumValue: value,
        internalName: `ExampleUnlockKind::Value${value}`,
        displayName: `Fixture unlock ${value}`,
      },
    ]),
  );
  assert.equal(
    LevelProgressionCategoryEnumsSchema.allows(
      createLevelProgressionCategoryEnums(),
    ),
    true,
  );
  assert.deepEqual(
    progression.thresholds.map((threshold) => threshold.movieCategoryUnlocks),
    [
      [],
      [
        {
          enumValue: 0,
          internalName: "ExampleMovieCategory::Value0",
          displayName: "Fixture movie category 0",
        },
      ],
      [
        {
          enumValue: 1,
          internalName: "ExampleMovieCategory::Value1",
          displayName: "Fixture movie category 1",
        },
      ],
    ],
  );
  assert.deepEqual(
    progression.thresholds.map((threshold) => threshold.gameCategoryUnlocks),
    [
      [],
      [],
      [
        {
          enumValue: 0,
          internalName: "ExampleGameCategory::Value0",
          displayName: "Fixture game category 0",
        },
      ],
    ],
  );
  assert.deepEqual(
    progression.thresholds.map((threshold) => ({
      runtimeLevel: threshold.runtimeLevel,
      nextRuntimeLevel: threshold.nextRuntimeLevel,
      requiredXp: threshold.requiredXp,
      cumulativeXp: threshold.cumulativeXp,
    })),
    [
      { runtimeLevel: 0, nextRuntimeLevel: 1, requiredXp: 10, cumulativeXp: 10 },
      { runtimeLevel: 1, nextRuntimeLevel: 2, requiredXp: 20, cumulativeXp: 30 },
      { runtimeLevel: 2, nextRuntimeLevel: 3, requiredXp: 30, cumulativeXp: 60 },
    ],
  );
  assert.deepEqual(progression.maximum, {
    runtimeLevel: 3,
    experience: 60,
    derivation: "sum-all-xp-table-rows",
    evidence: progression.maximum.evidence,
  });
  assert.equal(progression.experienceUpdate.dailyStatistic, "raw-modification");
  assert.deepEqual(progression.requirementLookup.demoOverride, {
    atOrAboveRuntimeLevel: 3,
    requiredXp: 99999,
    belowThreshold: "xp-table-row-at-current-runtime-level",
  });
  assert.deepEqual(progression.endOfDay.maximumStop, {
    requirementLookupIndex: 3,
    outOfBoundsArrayItem: "default-empty-string",
    convertedRequirement: 0,
    zeroDivisorResult: 0,
    levelUpComparisonResult: false,
    transitionRemainder: 0,
    engineSource: progression.endOfDay.maximumStop.engineSource,
  });
  assert.equal(LevelProgressionSchema.allows(progression), true);
});

test("models every fixture XP state without advancing past the normalized maximum", () => {
  const progression = compileCurrent();
  let checked = 0;
  for (let start = 0; start <= progression.maximum.experience; start++) {
    for (let award = 0; award <= progression.maximum.experience * 2; award++) {
      const cappedExperience = Math.min(
        start + award,
        progression.maximum.experience,
      );
      const startLevel = levelForExperience(progression, start);
      const finalLevel = modelEndOfDayTransition(
        progression,
        startLevel,
        cappedExperience,
        award,
      );
      assert.equal(finalLevel, levelForExperience(progression, cappedExperience));
      assert.ok(finalLevel <= progression.maximum.runtimeLevel);
      if (finalLevel === progression.maximum.runtimeLevel) {
        assert.equal(progression.endOfDay.maximumStop.zeroDivisorResult >= 1, false);
      }
      checked++;
    }
  }
  assert.equal(checked, 7_381);
});

test("rejects a progression table with nonconsecutive row keys", () => {
  assert.throws(
    () => compileCurrent({ structuredValues: { mismatchRowKey: true } }),
    /consecutive numeric levels/u,
  );
});

test("rejects a progression table with duplicate runtime levels", () => {
  assert.throws(
    () => compileCurrent({ structuredValues: { duplicateLevel: true } }),
    /consecutive numeric levels/u,
  );
});

test("rejects a nonpositive XP threshold", () => {
  assert.throws(
    () => compileCurrent({ structuredValues: { nonPositiveXp: true } }),
    /Expected positive XP/u,
  );
});

test("rejects an unclassified XP-table field", () => {
  assert.throws(
    () => compileCurrent({ structuredValues: { unexpectedField: true } }),
    /Expected 5 fields/u,
  );
});

test("rejects inputs from different builds", () => {
  const changeXp = createChangeXpTrace();
  changeXp.build.steamBuildId = "different";
  assert.throws(
    () => compileCurrent({ changeXp }),
    /different game builds/u,
  );
});

test("rejects a target profile for another build", () => {
  const targetProfile = createLevelProgressionTargetProfile();
  targetProfile.build.steamBuildId = "different";
  assert.throws(
    () => compileCurrent({ targetProfile }),
    /target profile refers to a different build/u,
  );
});

test("rejects duplicate target-profile field roles", () => {
  const targetProfile = createLevelProgressionTargetProfile();
  targetProfile.xpTable.fields.movieCategories =
    targetProfile.xpTable.fields.gameCategories;
  assert.throws(
    () => compileCurrent({ targetProfile }),
    /duplicate target roles/u,
  );
});

test("rejects duplicate target-profile enum roles", () => {
  const targetProfile = createLevelProgressionTargetProfile();
  targetProfile.categoryEnums.movie = {
    ...targetProfile.gameplayUnlockEnum,
  };
  assert.throws(
    () => compileCurrent({ targetProfile }),
    /duplicate target roles/u,
  );
});

test("rejects a gameplay-unlock enum linked to another target profile", () => {
  const gameplayUnlockEnum = createGameplayUnlockEnum();
  gameplayUnlockEnum.targetProfile.sha256 = "9".repeat(64);
  assert.throws(
    () => compileCurrent({ gameplayUnlockEnum }),
    /does not identify the supplied target profile/u,
  );
});

test("accepts the gameplay-unlock enum fixture contract", () => {
  assert.equal(GameplayUnlockEnumSchema.allows(createGameplayUnlockEnum()), true);
});

test("rejects category enums linked to another target profile", () => {
  const categoryEnums = createLevelProgressionCategoryEnums();
  categoryEnums.targetProfile.sha256 = "9".repeat(64);
  assert.throws(
    () => compileCurrent({ categoryEnums }),
    /do not identify the supplied target profile/u,
  );
});

test("rejects a movie-category unlock without an enum definition", () => {
  const categoryEnums = createLevelProgressionCategoryEnums();
  categoryEnums.categories.movie.enumerators[0]!.internalName =
    "ExampleMovieCategory::Different";
  assert.throws(
    () => compileCurrent({ categoryEnums }),
    /movie-category.*has no enum definition/ui,
  );
});

test("rejects a changed movie-category enum target", () => {
  const categoryEnums = createLevelProgressionCategoryEnums();
  categoryEnums.categories.movie.source.objectPath =
    "ExampleGame/Content/ExampleProject/core/blueprint/research/Different.Different";
  assert.throws(
    () => compileCurrent({ categoryEnums }),
    /Movie-category enum identity changed/u,
  );
});

test("rejects inconsistent category-enum totals", () => {
  const categoryEnums = createLevelProgressionCategoryEnums();
  categoryEnums.categories.game.totals.enumeratorCount = 2;
  assert.throws(
    () => compileCurrent({ categoryEnums }),
    /Game-category enum totals do not match/u,
  );
});

test("rejects a gameplay unlock without an enum definition", () => {
  const gameplayUnlockEnum = createGameplayUnlockEnum();
  gameplayUnlockEnum.enumerators[1]!.internalName =
    "ExampleUnlockKind::Different";
  assert.throws(
    () => compileCurrent({ gameplayUnlockEnum }),
    /has no enum definition/u,
  );
});

test("rejects inconsistent gameplay-unlock enum totals", () => {
  const gameplayUnlockEnum = createGameplayUnlockEnum();
  gameplayUnlockEnum.totals.enumeratorCount = 3;
  assert.throws(
    () => compileCurrent({ gameplayUnlockEnum }),
    /totals do not match/u,
  );
});

test("rejects a changed current-experience cap input", () => {
  const changeXp = createChangeXpTrace();
  const maximumField = changeXp.functions[0]?.nodes.find(
    (node) =>
      node.statementIndex ===
      levelProgressionTargetProfile.traces.experienceUpdate.statements
        .capCurrentExperience + 2,
  );
  assert.ok(maximumField);
  maximumField.symbol = "Different Maximum";
  assert.throws(
    () => compileCurrent({ changeXp }),
    /symbol changed/u,
  );
});

test("rejects a maximum target derived from another caller trace", () => {
  const maximumTarget = createMaximumTargetTrace();
  maximumTarget.sourceTrace.sha256 = "9".repeat(64);
  assert.throws(
    () => compileCurrent({ maximumTarget }),
    /does not identify the supplied caller trace/u,
  );
});

test("rejects a changed end-of-day continuation target", () => {
  const endOfDay = createEndOfDayTrace();
  const eventGraph = endOfDay.functions.find(
    (function_) => function_.functionName === "ExecuteExampleGraph_ExampleEndOfPeriod",
  );
  const target = eventGraph?.nodes.find(
    (node) =>
      node.opcode === "EX_SkipOffsetConst" &&
      node.literal?.value ===
        String(
          levelProgressionTargetProfile.traces.endOfDay.jumpTargets
            .returnToInitialization,
        ),
  );
  assert.ok(target?.literal);
  target.literal = { ...target.literal, value: "999" };
  assert.throws(
    () => compileCurrent({ endOfDay }),
    /continuation target changed/u,
  );
});

interface CompileOptions {
  readonly targetProfile?: ReturnType<typeof createLevelProgressionTargetProfile>;
  readonly structuredValues?: Parameters<typeof createLevelStructuredValues>[0];
  readonly gameplayUnlockEnum?: ReturnType<typeof createGameplayUnlockEnum>;
  readonly categoryEnums?: ReturnType<typeof createLevelProgressionCategoryEnums>;
  readonly changeXp?: ReturnType<typeof createChangeXpTrace>;
  readonly maximumCaller?: ReturnType<typeof createMaximumCallerTrace>;
  readonly maximumTarget?: ReturnType<typeof createMaximumTargetTrace>;
  readonly endOfDay?: ReturnType<typeof createEndOfDayTrace>;
}

function modelEndOfDayTransition(
  progression: ReturnType<typeof compileCurrent>,
  startLevel: number,
  cappedExperience: number,
  award: number,
): number {
  const previousCumulative =
    progression.thresholds[startLevel - 1]?.cumulativeXp ?? 0;
  let initialXp = cappedExperience - award - previousCumulative;
  let remainingXp = award;
  let level = startLevel;

  while (level < progression.maximum.runtimeLevel) {
    const threshold = progression.thresholds[level];
    assert.ok(threshold);
    if (initialXp + remainingXp < threshold.requiredXp) {
      break;
    }
    remainingXp -= threshold.requiredXp - Math.floor(initialXp);
    initialXp = 0;
    level++;
  }

  return level;
}

function compileCurrent(options: CompileOptions = {}) {
  return compileLevelProgression(
    options.targetProfile ?? levelProgressionTargetProfile,
    createLevelStructuredValues(options.structuredValues),
    options.gameplayUnlockEnum ?? createGameplayUnlockEnum(),
    options.categoryEnums ?? createLevelProgressionCategoryEnums(),
    options.changeXp ?? createChangeXpTrace(),
    options.maximumCaller ?? createMaximumCallerTrace(),
    options.maximumTarget ?? createMaximumTargetTrace(),
    options.endOfDay ?? createEndOfDayTrace(),
    levelProgressionSources,
  );
}

function levelForExperience(
  progression: ReturnType<typeof compileCurrent>,
  experience: number,
): number {
  const next = progression.thresholds.find(
    (threshold) => experience < threshold.cumulativeXp,
  );
  return next?.runtimeLevel ?? progression.maximum.runtimeLevel;
}
