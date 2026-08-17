import assert from "node:assert/strict";
import test from "node:test";

import {
  MarketMechanicsSchema,
  type MarketMechanicsResearch,
  type MarketMechanicsSourceIdentity,
} from "@neonretrorewind/core";

import { assertMarketEvidenceFiles } from "../src/market-mechanics-cli.ts";
import { compileMarketMechanics } from "../src/market-mechanics.ts";

const source: MarketMechanicsSourceIdentity = {
  fileName: "market-mechanics-research.json",
  sha256: "a".repeat(64),
  sizeBytes: 100,
  artifactType: "market-mechanics-research",
};

test("compiles guide-facing Market odds and reachable candidate totals", () => {
  const mechanics = compileMarketMechanics(createResearch(), source);

  assert.equal(mechanics.daily.movies.attemptCountDistribution[0]?.value, 13);
  assert.equal(mechanics.daily.movies.attemptCountDistribution.at(-1)?.value, 26);
  assert.ok(
    Math.abs(sumProbabilities(mechanics.daily.movies.attemptCountDistribution) - 1) < 1e-12,
  );
  assert.deepEqual(mechanics.daily.bundles.countDistribution, [
    { value: 1, probability: 1 / 3 },
    { value: 2, probability: 4 / 9 },
    { value: 3, probability: 2 / 9 },
  ]);
  assert.deepEqual(mechanics.bundles.sizeDistribution, [
    { value: 10, probability: 50 / 101 },
    { value: 5, probability: 25 / 101 },
    { value: 15, probability: 20 / 101 },
    { value: 20, probability: 6 / 101 },
  ]);
  assert.equal(mechanics.candidates.ordinarySourceRowCount, 30);
  assert.equal(mechanics.candidates.ordinaryReachableRowCount, 28);
  assert.equal(mechanics.candidates.tables[2]?.reachableRowCount, 4);
  assert.equal(MarketMechanicsSchema.allows(mechanics), true);
});

test("rejects a gap in bundle-size draw bands", () => {
  const research = createResearch();
  research.bundles.sizeBands[1]!.minimumDraw = 51;

  assert.throws(
    () => compileMarketMechanics(research, source),
    /Bundle-size bands are not contiguous/u,
  );
});

test("rejects a gap in bundle price tiers", () => {
  const research = createResearch();
  research.bundles.priceTiers[1]!.minimumSuccessfulMovies = 7;

  assert.throws(
    () => compileMarketMechanics(research, source),
    /Bundle price tiers are not contiguous/u,
  );
});

test("rejects duplicate evidence filenames", () => {
  const research = createResearch();
  research.evidence.push({ ...research.evidence[0]! });

  assert.throws(
    () => compileMarketMechanics(research, source),
    /duplicate evidence filenames/u,
  );
});

test("rejects an exact evidence file from another build", () => {
  const bytes = new TextEncoder().encode("{}");
  const identity: MarketMechanicsSourceIdentity = {
    fileName: "market-evidence.json",
    sha256: "b".repeat(64),
    sizeBytes: bytes.length,
    artifactType: "market-evidence",
  };

  assert.throws(
    () => assertMarketEvidenceFiles(
      { steamAppId: "123", steamBuildId: "456" },
      [identity],
      [{
        path: "evidence/market-evidence.json",
        bytes,
        sha256: identity.sha256,
        value: {
          artifactType: identity.artifactType,
          build: { steamAppId: "123", steamBuildId: "789" },
        },
      }],
    ),
    /Evidence identity changed/u,
  );
});

function createResearch(): Mutable<MarketMechanicsResearch> {
  return structuredClone({
    artifactType: "market-mechanics-research",
    build: { steamAppId: "123", steamBuildId: "456" },
    evidence: [
      {
        fileName: "market-evidence.json",
        sha256: "b".repeat(64),
        sizeBytes: 200,
        artifactType: "market-evidence",
      },
    ],
    daily: {
      savedMarket: "restore-without-regeneration",
      ordinaryMovieGeneratorCalls: 1,
      movieAttempts: {
        minimum: 12,
        maximum: 25,
        counterStart: 0,
        comparison: "less-than-or-equal",
        boundDraw: "each-condition",
      },
      successfulMovieAttempt: "append-and-continue",
      ordinaryBundleGeneratorCalls: 1,
      bundleCount: {
        minimum: 1,
        maximum: 3,
        counterStart: 1,
        comparison: "less-than-or-equal",
        boundDraw: "each-condition",
      },
      completedBundle: "append-and-continue",
      firstSaveDayBundleCalls: [
        { forcedCount: 3, free: true, movieAttemptsPerBundle: 10, randomMovieAttempts: false },
        { forcedCount: 1, free: false, movieAttemptsPerBundle: 10, randomMovieAttempts: false },
      ],
      clearing: {
        movies: "remove-all",
        positivePriceBundles: "remove",
        nonpositivePriceBundles: "retain",
      },
    },
    candidates: {
      ordinaryFallbackGenres: ["Example Drama", "Example Horror"],
      randomIndexInput: "row-count-minus-one",
      randomIndexSemantics: "zero-inclusive-input-exclusive",
      tables: [
        { genre: "Example Drama", selection: "ordinary", rowCount: 10 },
        { genre: "Example Horror", selection: "ordinary", rowCount: 20 },
        { genre: "Example Adventure", selection: "explicit-only", rowCount: 5 },
      ],
    },
    bundles: {
      sizeDrawMinimum: 0,
      sizeDrawMaximum: 100,
      sizeBands: [
        { minimumDraw: 0, maximumDraw: 49, movieAttempts: 10 },
        { minimumDraw: 50, maximumDraw: 74, movieAttempts: 5 },
        { minimumDraw: 75, maximumDraw: 94, movieAttempts: 15 },
        { minimumDraw: 95, maximumDraw: 100, movieAttempts: 20 },
      ],
      priceTiers: [
        { minimumSuccessfulMovies: 0, maximumSuccessfulMovies: 5, priceRule: "fixed", pricePennies: 6000 },
        { minimumSuccessfulMovies: 6, maximumSuccessfulMovies: 10, priceRule: "fixed", pricePennies: 10000 },
        { minimumSuccessfulMovies: 11, maximumSuccessfulMovies: 15, priceRule: "fixed", pricePennies: 12000 },
        { minimumSuccessfulMovies: 16, maximumSuccessfulMovies: 20, priceRule: "fixed", pricePennies: 14000 },
        { minimumSuccessfulMovies: 21, maximumSuccessfulMovies: null, priceRule: "successful-movie-count-times-price", pricePennies: 1000 },
      ],
      freePricePennies: 0,
    },
    moviePrice: {
      currency: "pennies",
      dateBoundary: "1990-01-01",
      modernDateComparison: "on-or-after-boundary",
      seededRandom: {
        seed: "sku",
        drawMinimum: 0,
        drawMaximum: 500,
        roundDownMultiple: 50,
      },
      modernBasePennies: 2500,
      oldBasePennies: 500,
      modernFormula: "truncate-base-plus-random-times-rarity",
      oldFormula: "truncate-base-plus-critic-plus-genre-plus-random-times-rarity-times-age",
      modernRarityMultipliers: [{ key: "Example Common", value: 1 }],
      oldRarityMultipliers: [{ key: "Example Common", value: 1 }],
      criticBonuses: [{ key: "0", value: 1000 }],
      genreBonuses: [{ key: "Example Drama", value: 0 }],
      genreDefaultBonusPennies: 0,
      ageBoundary: "1940-12-29",
      olderAgeComparison: "on-or-before-boundary",
      olderAgeMultiplier: 0.75,
      newerAgeMultiplier: 1,
      integerConversion: "truncate-toward-zero",
    },
    purchases: {
      movie: {
        fundsCheck: "negative-price-with-debt-disabled",
        deduction: "after-successful-spawn",
        failedSpawn: "no-deduction-and-offer-retained",
        successfulSpawn: "deduct-and-remove-offer",
      },
      bundle: {
        zeroPrice: "bypass-funds-check",
        paidFundsCheck: "negative-price-with-debt-disabled",
        offerRemoval: "before-spawn-loop",
        spawnResultHandling: "ignored",
        deduction: "full-price-after-spawn-loop",
      },
    },
    runtimeValidation: "not-run",
  });
}

function sumProbabilities(
  entries: readonly { readonly probability: number }[],
): number {
  return entries.reduce((total, entry) => total + entry.probability, 0);
}

type Mutable<Value> = {
  -readonly [Key in keyof Value]: Value[Key] extends readonly [infer First, infer Second]
    ? [Mutable<First>, Mutable<Second>]
    : Value[Key] extends readonly (infer Item)[]
      ? Mutable<Item>[]
    : Value[Key] extends object
      ? Mutable<Value[Key]>
      : Value[Key];
};
