import assert from "node:assert/strict";
import test from "node:test";

import {
  MarketGuideFindingsSchema,
  MarketMechanicsSchema,
  MarketValueAnalysisSchema,
} from "@neonretrorewind/core";

import {
  compileMarketGuideFindings,
  type MarketGuideFindingsInputSources,
} from "../src/market-guide-findings.ts";

const mechanicsSource = {
  fileName: "market-mechanics.json",
  sha256: "a".repeat(64),
  sizeBytes: 1_000,
  artifactType: "market-mechanics" as const,
};

const sources: MarketGuideFindingsInputSources = {
  marketMechanics: mechanicsSource,
  marketValueAnalysis: {
    fileName: "market-value-analysis.json",
    sha256: "b".repeat(64),
    sizeBytes: 2_000,
    artifactType: "market-value-analysis",
  },
};

test("compiles guide-ready Market availability and acquisition-cost findings", () => {
  const findings = compileMarketGuideFindings(createMechanics(), createValues(), sources);

  assert.equal(MarketGuideFindingsSchema.allows(findings), true);
  assert.equal(findings.availability.regularMovieAttempts.minimum, 2);
  assert.equal(findings.availability.regularMovieAttempts.maximum, 3);
  assert.equal(findings.availability.regularMovieAttempts.expected, 2.5);
  assert.equal(findings.availability.paidBundleOffers.expected, 1.5);
  assert.deepEqual(
    findings.selection.ordinary.unreachableFinalRows.map((film) => film.sku),
    [102],
  );
  assert.deepEqual(
    findings.selection.explicitOnly.unreachableFinalRows.map((film) => film.sku),
    [202],
  );

  const offers = findings.bundleEconomics.configuredMovieAttemptTargets;
  assert.equal(offers[0]?.allAttemptsSuccessful.pricePerMoviePennies, 1_200);
  assert.equal(
    offers[0]?.allAttemptsSuccessful.ordinaryPriceComparison.individualPriceLowerCount,
    1,
  );
  assert.equal(
    offers[1]?.allAttemptsSuccessful.ordinaryPriceComparison.individualPriceEqualCount,
    1,
  );
  assert.equal(
    offers[3]?.allAttemptsSuccessful.ordinaryPriceComparison.individualPriceHigherCount,
    1,
  );
  assert.deepEqual(
    findings.bundleEconomics.underfilledTierJumps.map(
      (jump) => jump.successfulMovieCount,
    ),
    [6, 11, 16],
  );
  assert.deepEqual(findings.bundleEconomics.lowestConfiguredFullSuccessUnitCost, {
    movieAttemptCount: 20,
    pricePerMoviePennies: 700,
  });
  assert.equal(findings.guideClaimStatus.profitRecommendation, "unsupported-by-inputs");
  assert.equal(
    findings.guideClaimStatus.realizedBundleDelivery,
    "conditional-until-runtime-validation",
  );
});

test("rejects a value analysis linked to a different mechanics artifact", () => {
  const changedSources = {
    ...sources,
    marketMechanics: { ...sources.marketMechanics, sha256: "c".repeat(64) },
  };

  assert.throws(
    () =>
      compileMarketGuideFindings(createMechanics(), createValues(), changedSources),
    /Market value analysis is not linked to the mechanics input/u,
  );
});

test("rejects film classifications that do not match the value totals", () => {
  const original = createValues();
  const changed = MarketValueAnalysisSchema.assert({
    ...original,
    totals: {
      ...original.totals,
      ordinary: {
        ...original.totals.ordinary,
        reachableFilmCount: 2,
        sourceFilmCount: 3,
      },
    },
  });

  assert.throws(
    () => compileMarketGuideFindings(createMechanics(), changed, sources),
    /Market guide candidate totals do not match/u,
  );
});

test("rejects a schema-valid distribution whose probabilities do not total one", () => {
  const original = createMechanics();
  const changed = MarketMechanicsSchema.assert({
    ...original,
    daily: {
      ...original.daily,
      movies: {
        ...original.daily.movies,
        attemptCountDistribution: [
          { value: 2, probability: 0.4 },
          { value: 3, probability: 0.5 },
        ],
      },
    },
  });

  assert.throws(
    () => compileMarketGuideFindings(changed, createValues(), sources),
    /Market guide movie attempts probabilities do not total one/u,
  );
});

test("rejects a schema-valid price summary that does not match its films", () => {
  const original = createValues();
  const changed = MarketValueAnalysisSchema.assert({
    ...original,
    summaries: {
      ...original.summaries,
      ordinaryReachablePrices: {
        ...original.summaries.ordinaryReachablePrices,
        totalPricePennies: 999,
        averagePricePennies: 999,
      },
    },
  });

  assert.throws(
    () => compileMarketGuideFindings(createMechanics(), changed, sources),
    /Market guide ordinary reachable price summary does not match its films/u,
  );
});

function createMechanics() {
  return MarketMechanicsSchema.assert({
    artifactType: "market-mechanics",
    build: { steamAppId: "3552140", steamBuildId: "23896268" },
    sources: {
      research: {
        fileName: "market-mechanics-research.json",
        sha256: "d".repeat(64),
        sizeBytes: 500,
        artifactType: "market-mechanics-research",
      },
      evidence: [
        {
          fileName: "structured-values.json",
          sha256: "e".repeat(64),
          sizeBytes: 500,
          artifactType: "structured-values",
        },
      ],
    },
    scope: "daily-movie-market",
    evidenceLevel: "curated-static-analysis",
    runtimeValidation: "not-run",
    daily: {
      savedMarket: "restore-without-regeneration",
      movies: {
        generatorCalls: 1,
        attemptCountDistribution: [
          { value: 2, probability: 0.5 },
          { value: 3, probability: 0.5 },
        ],
        successfulAttempt: "append-and-continue",
        clearing: "remove-all",
      },
      bundles: {
        generatorCalls: 1,
        countDistribution: [
          { value: 1, probability: 0.5 },
          { value: 2, probability: 0.5 },
        ],
        completedBundle: "append-and-continue",
        firstSaveDayCalls: [
          {
            forcedCount: 3,
            free: true,
            movieAttemptsPerBundle: 10,
            randomMovieAttempts: false,
          },
          {
            forcedCount: 1,
            free: false,
            movieAttemptsPerBundle: 10,
            randomMovieAttempts: false,
          },
        ],
        positivePriceClearing: "remove",
        nonpositivePriceClearing: "retain",
      },
    },
    candidates: {
      ordinaryFallbackGenres: ["Action"],
      excludedRowPerTable: 1,
      ordinarySourceRowCount: 2,
      ordinaryReachableRowCount: 1,
      tables: [
        {
          genre: "Action",
          selection: "ordinary",
          rowCount: 2,
          reachableRowCount: 1,
        },
        {
          genre: "Adventure",
          selection: "explicit-only",
          rowCount: 2,
          reachableRowCount: 1,
        },
      ],
    },
    bundles: {
      sizeDistribution: [
        { value: 5, probability: 0.25 },
        { value: 10, probability: 0.5 },
        { value: 15, probability: 0.2 },
        { value: 20, probability: 0.05 },
      ],
      priceTiers: [
        {
          minimumSuccessfulMovies: 0,
          maximumSuccessfulMovies: 5,
          priceRule: "fixed",
          pricePennies: 6_000,
        },
        {
          minimumSuccessfulMovies: 6,
          maximumSuccessfulMovies: 10,
          priceRule: "fixed",
          pricePennies: 10_000,
        },
        {
          minimumSuccessfulMovies: 11,
          maximumSuccessfulMovies: 15,
          priceRule: "fixed",
          pricePennies: 12_000,
        },
        {
          minimumSuccessfulMovies: 16,
          maximumSuccessfulMovies: 20,
          priceRule: "fixed",
          pricePennies: 14_000,
        },
        {
          minimumSuccessfulMovies: 21,
          maximumSuccessfulMovies: null,
          priceRule: "successful-movie-count-times-price",
          pricePennies: 1_000,
        },
      ],
      freePricePennies: 0,
    },
    generatedMovie: {
      source: "regular-create-film-data",
      skuSource: "catalog-row-sku",
      releaseDate: {
        randomStreamSeed: "sku",
        streamLifetime: "one-stream-for-all-draws",
        draws: [
          { component: "year", minimum: 1930, maximum: 1988 },
          { component: "day", minimum: 1, maximum: 28 },
          { component: "month", minimum: 1, maximum: 12 },
        ],
        timeOfDay: "midnight",
        earliest: "1930-01-01",
        latest: "1988-12-28",
        priceFormulaBranch: "old-film",
      },
      rarity: {
        applicability: "nonzero-sku",
        randomStreamSeed: "sku",
        streamLifetime: "new-stream-for-each-tier",
        tierDrawRelationship: "same-first-draw",
        drawMinimum: 0,
        drawMaximum: 100,
        configuredExclusivePercentage: 0,
        effectiveExclusiveThreshold: 1,
        bands: [
          { minimumDraw: 0, maximumDraw: 1, rarity: "exclusive", enumValue: 3 },
          {
            minimumDraw: 2,
            maximumDraw: 40,
            rarity: "limited-edition",
            enumValue: 2,
          },
          { minimumDraw: 41, maximumDraw: 50, rarity: "rare", enumValue: 1 },
          { minimumDraw: 51, maximumDraw: 100, rarity: "common", enumValue: 0 },
        ],
      },
      criticScore: {
        input: "positive-sku-modulo-100",
        bands: [{ minimumRemainder: 0, maximumRemainder: 99, score: 5 }],
      },
      customerReviewScore: 0,
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
      modernBasePennies: 2_500,
      oldBasePennies: 500,
      modernFormula: "truncate-base-plus-random-times-rarity",
      oldFormula:
        "truncate-base-plus-critic-plus-genre-plus-random-times-rarity-times-age",
      modernRarityMultipliers: [{ key: "Common", value: 1 }],
      oldRarityMultipliers: [{ key: "Common", value: 1 }],
      criticBonuses: [{ key: "5", value: 50 }],
      genreBonuses: [],
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
  });
}

function createValues() {
  const films = [
    createFilm(101, "action", "ordinary-reachable", 0, 1_000),
    createFilm(102, "action", "ordinary-unreachable-final-row", 1, 1_200),
    createFilm(201, "adventure", "explicit-reachable", 0, 900),
    createFilm(202, "adventure", "explicit-unreachable-final-row", 1, 2_000),
  ];
  return MarketValueAnalysisSchema.assert({
    artifactType: "market-value-analysis",
    build: { steamAppId: "3552140", steamBuildId: "23896268" },
    sources: {
      filmCatalog: {
        fileName: "film-catalog.json",
        sha256: "f".repeat(64),
        sizeBytes: 500,
        artifactType: "film-catalog",
      },
      marketMechanics: mechanicsSource,
      catalogStructuredValues: {
        fileName: "catalog-structured-values.json",
        sha256: "1".repeat(64),
        sizeBytes: 500,
        artifactType: "structured-values",
      },
      mechanicsStructuredValues: {
        fileName: "mechanics-structured-values.json",
        sha256: "2".repeat(64),
        sizeBytes: 500,
        artifactType: "structured-values",
      },
    },
    scope: "regular-film-market-value",
    evidenceLevel: "compiled-static-analysis",
    randomStream: {
      engineVersion: "5.4",
      implementation: "FRandomStream",
      seedMultiplier: 196_314_165,
      seedIncrement: 907_633_515,
      fractionConstruction: "float32-one-or-seed-shift-right-9-minus-one",
      integerRange: "truncate-float32-fraction-times-inclusive-range",
    },
    totals: {
      regularFilmCount: 4,
      ordinary: {
        sourceFilmCount: 2,
        reachableFilmCount: 1,
        unreachableFinalRowCount: 1,
      },
      explicitOnly: {
        sourceFilmCount: 2,
        reachableFilmCount: 1,
        unreachableFinalRowCount: 1,
      },
    },
    films,
    summaries: {
      allRegularPrices: priceSummary([1_000, 1_200, 900, 2_000]),
      ordinaryReachablePrices: priceSummary([1_000]),
      byGenre: [
        {
          genre: "action",
          route: "ordinary",
          sourceFilmCount: 2,
          reachableFilmCount: 1,
          unreachableFinalRowCount: 1,
          reachablePrices: priceSummary([1_000]),
        },
        {
          genre: "adventure",
          route: "explicit-only",
          sourceFilmCount: 2,
          reachableFilmCount: 1,
          unreachableFinalRowCount: 1,
          reachablePrices: priceSummary([900]),
        },
      ],
      ordinaryReachableByRarity: [
        { rarity: "common", reachablePrices: priceSummary([1_000]) },
      ],
    },
    bundleEconomics: {
      currency: "pennies",
      freeBundlePricePennies: 0,
      nonFreeBySuccessfulMovieCount: createBundleValues(),
    },
  });
}

function createFilm(
  sku: number,
  genre: "action" | "adventure",
  marketSelection:
    | "ordinary-reachable"
    | "ordinary-unreachable-final-row"
    | "explicit-reachable"
    | "explicit-unreachable-final-row",
  sourceRowIndex: number,
  pricePennies: number,
) {
  return {
    sku,
    genre,
    productName: `Film ${sku}`,
    marketSelection,
    sourceRowIndex,
    sourceRowCount: 2,
    releaseDate: "1980-01-01",
    rarity: "common" as const,
    criticScore: 5,
    customerReviewScore: 0,
    price: {
      currency: "pennies" as const,
      basePennies: 500,
      criticBonusPennies: 50,
      genreBonusPennies: 0,
      seededRandomDraw: 450,
      seededRandomPennies: 450,
      rarityMultiplier: 1,
      ageMultiplier: 1,
      totalPennies: pricePennies,
    },
    evidence: {
      kind: "data-table" as const,
      tablePath: `/Game/${genre}.uasset`,
      rowKey: `row-${sku}`,
    },
  };
}

function priceSummary(prices: readonly number[]) {
  const totalPricePennies = prices.reduce((total, price) => total + price, 0);
  return {
    filmCount: prices.length,
    totalPricePennies,
    minimumPricePennies: Math.min(...prices),
    maximumPricePennies: Math.max(...prices),
    averagePricePennies: totalPricePennies / prices.length,
  };
}

function createBundleValues() {
  const targetProbabilities = new Map([
    [5, 0.25],
    [10, 0.5],
    [15, 0.2],
    [20, 0.05],
  ]);
  let previousPrice = 0;
  let previousPricePerMovie: number | undefined;
  return Array.from({ length: 20 }, (_, index) => {
    const successfulMovieCount = index + 1;
    const bundlePricePennies = successfulMovieCount <= 5
      ? 6_000
      : successfulMovieCount <= 10
        ? 10_000
        : successfulMovieCount <= 15
          ? 12_000
          : 14_000;
    const pricePerSuccessfulMoviePennies =
      bundlePricePennies / successfulMovieCount;
    const costPerMovieTrend = previousPricePerMovie === undefined
      ? "first"
      : pricePerSuccessfulMoviePennies < previousPricePerMovie
        ? "lower"
        : pricePerSuccessfulMoviePennies > previousPricePerMovie
          ? "higher"
          : "unchanged";
    const result = {
      successfulMovieCount,
      configuredTargetProbability:
        targetProbabilities.get(successfulMovieCount) ?? null,
      bundlePricePennies,
      pricePerSuccessfulMoviePennies,
      additionalBundlePriceFromPreviousCountPennies:
        bundlePricePennies - previousPrice,
      costPerMovieTrend,
    };
    previousPrice = bundlePricePennies;
    previousPricePerMovie = pricePerSuccessfulMoviePennies;
    return result;
  });
}
