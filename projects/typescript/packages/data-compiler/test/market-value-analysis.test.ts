import assert from "node:assert/strict";
import test from "node:test";

import {
  FilmCatalogSchema,
  MarketMechanicsSchema,
  MarketValueAnalysisSchema,
  StructuredValuesSchema,
} from "@neonretrorewind/core";

import {
  compileMarketValueAnalysis,
  type MarketValueInputSources,
} from "../src/market-value-analysis.ts";
import { UnrealRandomStream } from "../src/unreal-random-stream.ts";

const catalogStructuredIdentity = {
  fileName: "structured-values.json",
  sha256: "a".repeat(64),
  sizeBytes: 1_000,
  artifactType: "structured-values" as const,
};

const mechanicsStructuredIdentity = {
  fileName: "structured-values.v1.json",
  sha256: "d".repeat(64),
  sizeBytes: 1_100,
  artifactType: "structured-values" as const,
};

const sources: MarketValueInputSources = {
  filmCatalog: {
    fileName: "film-catalog.json",
    sha256: "b".repeat(64),
    sizeBytes: 2_000,
    artifactType: "film-catalog",
  },
  marketMechanics: {
    fileName: "market-mechanics.json",
    sha256: "c".repeat(64),
    sizeBytes: 3_000,
    artifactType: "market-mechanics",
  },
  catalogStructuredValues: catalogStructuredIdentity,
  mechanicsStructuredValues: mechanicsStructuredIdentity,
};

test("reproduces Unreal 5.4 seeded integer ranges", () => {
  const zeroSeed = new UnrealRandomStream(0);
  assert.deepEqual(
    [
      zeroSeed.randRange(1930, 1988),
      zeroSeed.randRange(1, 28),
      zeroSeed.randRange(1, 12),
    ],
    [1942, 18, 12],
  );

  const catalogSeed = new UnrealRandomStream(10_693);
  assert.deepEqual(
    [
      catalogSeed.randRange(1930, 1988),
      catalogSeed.randRange(1, 28),
      catalogSeed.randRange(1, 12),
    ],
    [1987, 16, 5],
  );
  assert.equal(new UnrealRandomStream(10_693).randRange(0, 100), 97);
  assert.equal(new UnrealRandomStream(10_693).randRange(0, 500), 484);
});

test("compiles exact film values, source-row reachability, and bundle unit costs", () => {
  const structuredValues = createStructuredValues();
  assert.equal(StructuredValuesSchema.allows(structuredValues), true);
  const analysis = compileMarketValueAnalysis(
    createCatalog(),
    createMechanics(),
    structuredValues,
    structuredValues,
    sources,
  );

  assert.deepEqual(analysis.totals, {
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
  });
  const ordinaryLastRow = analysis.films.find((film) => film.sku === 10_693);
  assert.equal(ordinaryLastRow?.marketSelection, "ordinary-unreachable-final-row");
  assert.equal(ordinaryLastRow?.sourceRowIndex, 1);
  assert.equal(ordinaryLastRow?.releaseDate, "1987-05-16");
  assert.equal(ordinaryLastRow?.rarity, "common");
  assert.equal(ordinaryLastRow?.criticScore, 9);
  assert.deepEqual(ordinaryLastRow?.price, {
    currency: "pennies",
    basePennies: 500,
    criticBonusPennies: 1_000,
    genreBonusPennies: 0,
    seededRandomDraw: 484,
    seededRandomPennies: 450,
    rarityMultiplier: 1,
    ageMultiplier: 1,
    totalPennies: 1_950,
  });
  const oldExclusive = analysis.films.find((film) => film.sku === 10_694);
  assert.equal(oldExclusive?.marketSelection, "ordinary-reachable");
  assert.equal(oldExclusive?.releaseDate, "1930-06-08");
  assert.equal(oldExclusive?.rarity, "exclusive");
  assert.equal(oldExclusive?.price.rarityMultiplier, 4);
  assert.equal(oldExclusive?.price.ageMultiplier, 0.75);
  assert.equal(oldExclusive?.price.totalPennies, 4_500);

  const bundleValues = analysis.bundleEconomics.nonFreeBySuccessfulMovieCount;
  assert.equal(bundleValues[4]?.pricePerSuccessfulMoviePennies, 1_200);
  assert.equal(bundleValues[5]?.costPerMovieTrend, "higher");
  assert.equal(bundleValues[9]?.pricePerSuccessfulMoviePennies, 1_000);
  assert.equal(bundleValues[10]?.costPerMovieTrend, "higher");
  assert.equal(bundleValues[14]?.pricePerSuccessfulMoviePennies, 800);
  assert.equal(bundleValues[15]?.costPerMovieTrend, "higher");
  assert.equal(bundleValues[19]?.pricePerSuccessfulMoviePennies, 700);
  assert.equal(MarketValueAnalysisSchema.allows(analysis), true);
});

test("rejects a catalog compiled from different structured values", () => {
  const original = createCatalog();
  const catalog = {
    ...original,
    source: { ...original.source, sha256: "d".repeat(64) },
  };

  assert.throws(
    () =>
      compileMarketValueAnalysis(
        catalog,
        createMechanics(),
        createStructuredValues(),
        createStructuredValues(),
        sources,
      ),
    /Film catalog is not linked to the structured-values input/u,
  );
});

test("rejects different catalog and Market data-table payloads", () => {
  const mechanicsStructuredValues = structuredClone(createStructuredValues());
  mechanicsStructuredValues.dataTables[0]!.rows.reverse();

  assert.throws(
    () =>
      compileMarketValueAnalysis(
        createCatalog(),
        createMechanics(),
        createStructuredValues(),
        mechanicsStructuredValues,
        sources,
      ),
    /Catalog and Market structured-values tables differ/u,
  );
});

function createCatalog() {
  return FilmCatalogSchema.assert({
    artifactType: "film-catalog",
    build: { steamAppId: "3552140", steamBuildId: "23896268" },
    source: catalogStructuredIdentity,
    totals: {
      sourceFilmTableCount: 2,
      catalogTableCount: 2,
      newReleaseTableCount: 0,
      excludedTableCount: 0,
      genreCount: 2,
      filmCount: 4,
      newReleaseFilmCount: 0,
    },
    films: [
      createFilm(10_693, "action", "/Game/Action.uasset", "action-last"),
      createFilm(10_694, "action", "/Game/Action.uasset", "action-first"),
      createFilm(10_695, "adventure", "/Game/Adventure.uasset", "adventure-first"),
      createFilm(10_696, "adventure", "/Game/Adventure.uasset", "adventure-last"),
    ],
    newReleaseFilms: [],
  });
}

function createFilm(
  sku: number,
  genre: "action" | "adventure",
  tablePath: string,
  rowKey: string,
) {
  return {
    sku,
    genre,
    productName: `Film ${sku}`,
    subjectName: "Subject",
    backgroundImage: "Background",
    subjectImage: "Subject image",
    colorPalette: "Palette",
    layoutStyle: 1,
    layoutStyleColor: 2,
    subjectPlacement: "Placement",
    newToUnlock: false,
    evidence: { kind: "data-table" as const, tablePath, rowKey },
  };
}

function createStructuredValues() {
  return {
    artifactType: "structured-values" as const,
    schemaVersion: 1 as const,
    build: {
      manifestSha256: "f".repeat(64),
      manifestSchemaVersion: 1 as const,
      steamAppId: "3552140",
      steamBuildId: "23896268",
    },
    structuredIndex: {
      fileName: "structured-asset-index.v1.json",
      sizeBytes: 100,
      sha256: "1".repeat(64),
      schemaVersion: 1 as const,
    },
    mappings: {
      fileName: "mappings.usmap",
      sizeBytes: 100,
      sha256: "2".repeat(64),
      formatVersion: 4 as const,
    },
    engine: {
      version: "5.4" as const,
      cue4ParseProfile: "GAME_UE5_4" as const,
      source: "configured" as const,
      confidence: "probable" as const,
    },
    extractor: {
      name: "NeonRetroRewind.StaticExtractor" as const,
      version: "0.0.1",
      cue4ParseVersion: "test",
    },
    totals: {
      candidatePackageCount: 2,
      extractedPackageCount: 2,
      failedPackageCount: 0,
      dataTableCount: 2,
      dataTableRowCount: 4,
      dataTableRowPropertyCount: 0,
      stringTableCount: 0,
      stringTableEntryCount: 0,
      stringTableMetadataCount: 0,
    },
    dataTables: [
      createTable("Action", "/Game/Action.uasset", ["action-first", "action-last"]),
      createTable(
        "Adventure",
        "/Game/Adventure.uasset",
        ["adventure-first", "adventure-last"],
      ),
    ],
    stringTables: [],
    failures: [],
    failureTypes: [],
  };
}

function createTable(name: string, path: string, rowKeys: readonly string[]) {
  return {
    path,
    name,
    type: "DataTable",
    rowStruct: "ExampleRecordStruct",
    rows: rowKeys.map((key) => ({ key, values: {} })),
  };
}

function createMechanics() {
  return MarketMechanicsSchema.assert({
    artifactType: "market-mechanics",
    build: { steamAppId: "3552140", steamBuildId: "23896268" },
    sources: {
      research: {
        fileName: "market-mechanics-research.json",
        sha256: "e".repeat(64),
        sizeBytes: 500,
        artifactType: "market-mechanics-research",
      },
      evidence: [mechanicsStructuredIdentity],
    },
    scope: "daily-movie-market",
    evidenceLevel: "curated-static-analysis",
    runtimeValidation: "not-run",
    daily: {
      savedMarket: "restore-without-regeneration",
      movies: {
        generatorCalls: 1,
        attemptCountDistribution: [{ value: 1, probability: 1 }],
        successfulAttempt: "append-and-continue",
        clearing: "remove-all",
      },
      bundles: {
        generatorCalls: 1,
        countDistribution: [{ value: 1, probability: 1 }],
        completedBundle: "append-and-continue",
        firstSaveDayCalls: [
          { forcedCount: 1, free: true, movieAttemptsPerBundle: 10, randomMovieAttempts: false },
          { forcedCount: 1, free: false, movieAttemptsPerBundle: 5, randomMovieAttempts: false },
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
        { genre: "Action", selection: "ordinary", rowCount: 2, reachableRowCount: 1 },
        { genre: "Adventure", selection: "explicit-only", rowCount: 2, reachableRowCount: 1 },
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
        { minimumSuccessfulMovies: 0, maximumSuccessfulMovies: 5, priceRule: "fixed", pricePennies: 6_000 },
        { minimumSuccessfulMovies: 6, maximumSuccessfulMovies: 10, priceRule: "fixed", pricePennies: 10_000 },
        { minimumSuccessfulMovies: 11, maximumSuccessfulMovies: 15, priceRule: "fixed", pricePennies: 12_000 },
        { minimumSuccessfulMovies: 16, maximumSuccessfulMovies: 20, priceRule: "fixed", pricePennies: 14_000 },
        { minimumSuccessfulMovies: 21, maximumSuccessfulMovies: null, priceRule: "successful-movie-count-times-price", pricePennies: 1_000 },
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
          { minimumDraw: 2, maximumDraw: 40, rarity: "limited-edition", enumValue: 2 },
          { minimumDraw: 41, maximumDraw: 50, rarity: "rare", enumValue: 1 },
          { minimumDraw: 51, maximumDraw: 100, rarity: "common", enumValue: 0 },
        ],
      },
      criticScore: {
        input: "positive-sku-modulo-100",
        bands: [
          { minimumRemainder: 0, maximumRemainder: 90, score: 5 },
          { minimumRemainder: 91, maximumRemainder: 99, score: 9 },
        ],
      },
      customerReviewScore: 0,
    },
    moviePrice: {
      currency: "pennies",
      dateBoundary: "1990-01-01",
      modernDateComparison: "on-or-after-boundary",
      seededRandom: { seed: "sku", drawMinimum: 0, drawMaximum: 500, roundDownMultiple: 50 },
      modernBasePennies: 2_500,
      oldBasePennies: 500,
      modernFormula: "truncate-base-plus-random-times-rarity",
      oldFormula: "truncate-base-plus-critic-plus-genre-plus-random-times-rarity-times-age",
      modernRarityMultipliers: [{ key: "Common", value: 1 }],
      oldRarityMultipliers: [
        { key: "Common", value: 1 },
        { key: "Rare", value: 1.1 },
        { key: "Limited Edition", value: 1.5 },
        { key: "Exclusive", value: 4 },
      ],
      criticBonuses: [
        { key: "5", value: 50 },
        { key: "9", value: 1_000 },
      ],
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
