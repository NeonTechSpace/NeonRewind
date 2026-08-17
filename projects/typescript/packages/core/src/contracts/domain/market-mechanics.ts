import { type } from "arktype";

const sha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const nonEmptyString = type("string").atLeastLength(1);
const isoDate = type("string").matching(new RegExp("^[0-9]{4}-[0-9]{2}-[0-9]{2}$"));
const positiveInteger = type("number.integer").atLeast(1);
const nonNegativeInteger = type("number.integer").atLeast(0);
const probability = type("number").atLeast(0).atMost(1);

const build = type({
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();

const sourceIdentity = type({
  fileName: type("string")
    .matching(new RegExp("^[^/\\\\]+\\.json$"))
    .atLeastLength(1),
  sha256,
  sizeBytes: positiveInteger,
  artifactType: nonEmptyString,
  "+": "reject",
}).readonly();

const freshBoundLoop = type({
  minimum: nonNegativeInteger,
  maximum: positiveInteger,
  counterStart: nonNegativeInteger,
  comparison: type.unit("less-than-or-equal"),
  boundDraw: type.unit("each-condition"),
  "+": "reject",
}).readonly();

const forcedBundleCall = type({
  forcedCount: positiveInteger,
  free: type("boolean"),
  movieAttemptsPerBundle: positiveInteger,
  randomMovieAttempts: type.unit(false),
  "+": "reject",
}).readonly();

const candidateTable = type({
  genre: nonEmptyString,
  selection: type.enumerated("ordinary", "explicit-only"),
  rowCount: positiveInteger,
  "+": "reject",
}).readonly();

const bundleSizeBand = type({
  minimumDraw: nonNegativeInteger,
  maximumDraw: nonNegativeInteger,
  movieAttempts: positiveInteger,
  "+": "reject",
}).readonly();

const bundlePriceTier = type({
  minimumSuccessfulMovies: nonNegativeInteger,
  maximumSuccessfulMovies: type.or(nonNegativeInteger, type("null")),
  priceRule: type.enumerated("fixed", "successful-movie-count-times-price"),
  pricePennies: nonNegativeInteger,
  "+": "reject",
}).readonly();

const numericMap = type({
  key: nonEmptyString,
  value: type("number"),
  "+": "reject",
}).readonly().array().readonly();

const dateDraw = type({
  component: type.enumerated("year", "day", "month"),
  minimum: nonNegativeInteger,
  maximum: positiveInteger,
  "+": "reject",
}).readonly();

const rarityBand = type({
  minimumDraw: nonNegativeInteger,
  maximumDraw: nonNegativeInteger,
  rarity: type.enumerated("common", "rare", "limited-edition", "exclusive"),
  enumValue: nonNegativeInteger,
  "+": "reject",
}).readonly();

const criticScoreBand = type({
  minimumRemainder: nonNegativeInteger,
  maximumRemainder: nonNegativeInteger,
  score: nonNegativeInteger,
  "+": "reject",
}).readonly();

const generatedMovieResearch = type({
  source: type.unit("regular-create-film-data"),
  skuSource: type.unit("catalog-row-sku"),
  releaseDate: type({
    randomStreamSeed: type.unit("sku"),
    streamLifetime: type.unit("one-stream-for-all-draws"),
    draws: dateDraw.array().readonly().atLeastLength(1),
    timeOfDay: type.unit("midnight"),
    "+": "reject",
  }).readonly(),
  rarity: type({
    applicability: type.unit("nonzero-sku"),
    randomStreamSeed: type.unit("sku"),
    streamLifetime: type.unit("new-stream-for-each-tier"),
    tierDrawRelationship: type.unit("same-first-draw"),
    drawMinimum: type.unit(0),
    drawMaximum: positiveInteger,
    configuredExclusivePercentage: type.unit(0),
    effectiveExclusiveThreshold: positiveInteger,
    bands: rarityBand.array().readonly().atLeastLength(1),
    "+": "reject",
  }).readonly(),
  criticScore: type({
    input: type.unit("positive-sku-modulo-100"),
    bands: criticScoreBand.array().readonly().atLeastLength(1),
    "+": "reject",
  }).readonly(),
  customerReviewScore: type.unit(0),
  "+": "reject",
}).readonly();

const purchases = type({
  movie: type({
    fundsCheck: type.unit("negative-price-with-debt-disabled"),
    deduction: type.unit("after-successful-spawn"),
    failedSpawn: type.unit("no-deduction-and-offer-retained"),
    successfulSpawn: type.unit("deduct-and-remove-offer"),
    "+": "reject",
  }).readonly(),
  bundle: type({
    zeroPrice: type.unit("bypass-funds-check"),
    paidFundsCheck: type.unit("negative-price-with-debt-disabled"),
    offerRemoval: type.unit("before-spawn-loop"),
    spawnResultHandling: type.unit("ignored"),
    deduction: type.unit("full-price-after-spawn-loop"),
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

export const MarketMechanicsResearchSchema = type({
  artifactType: type.unit("market-mechanics-research"),
  build,
  evidence: sourceIdentity.array().readonly().atLeastLength(1),
  daily: type({
    savedMarket: type.unit("restore-without-regeneration"),
    ordinaryMovieGeneratorCalls: type.unit(1),
    movieAttempts: freshBoundLoop,
    successfulMovieAttempt: type.unit("append-and-continue"),
    ordinaryBundleGeneratorCalls: type.unit(1),
    bundleCount: freshBoundLoop,
    completedBundle: type.unit("append-and-continue"),
    firstSaveDayBundleCalls: type([
      forcedBundleCall,
      forcedBundleCall,
    ]).readonly(),
    clearing: type({
      movies: type.unit("remove-all"),
      positivePriceBundles: type.unit("remove"),
      nonpositivePriceBundles: type.unit("retain"),
      "+": "reject",
    }).readonly(),
    "+": "reject",
  }).readonly(),
  candidates: type({
    ordinaryFallbackGenres: nonEmptyString.array().readonly().atLeastLength(1),
    randomIndexInput: type.unit("row-count-minus-one"),
    randomIndexSemantics: type.unit("zero-inclusive-input-exclusive"),
    tables: candidateTable.array().readonly().atLeastLength(1),
    "+": "reject",
  }).readonly(),
  bundles: type({
    sizeDrawMinimum: type.unit(0),
    sizeDrawMaximum: type.unit(100),
    sizeBands: bundleSizeBand.array().readonly().atLeastLength(1),
    priceTiers: bundlePriceTier.array().readonly().atLeastLength(1),
    freePricePennies: type.unit(0),
    "+": "reject",
  }).readonly(),
  generatedMovie: generatedMovieResearch,
  moviePrice: type({
    currency: type.unit("pennies"),
    dateBoundary: type.unit("1990-01-01"),
    modernDateComparison: type.unit("on-or-after-boundary"),
    seededRandom: type({
      seed: type.unit("sku"),
      drawMinimum: type.unit(0),
      drawMaximum: type.unit(500),
      roundDownMultiple: type.unit(50),
      "+": "reject",
    }).readonly(),
    modernBasePennies: type.unit(2500),
    oldBasePennies: type.unit(500),
    modernFormula: type.unit("truncate-base-plus-random-times-rarity"),
    oldFormula: type.unit("truncate-base-plus-critic-plus-genre-plus-random-times-rarity-times-age"),
    modernRarityMultipliers: numericMap,
    oldRarityMultipliers: numericMap,
    criticBonuses: numericMap,
    genreBonuses: numericMap,
    genreDefaultBonusPennies: type.unit(0),
    ageBoundary: type.unit("1940-12-29"),
    olderAgeComparison: type.unit("on-or-before-boundary"),
    olderAgeMultiplier: type.unit(0.75),
    newerAgeMultiplier: type.unit(1),
    integerConversion: type.unit("truncate-toward-zero"),
    "+": "reject",
  }).readonly(),
  purchases,
  runtimeValidation: type.unit("not-run"),
  "+": "reject",
}).readonly();

const distributionEntry = type({
  value: positiveInteger,
  probability,
  "+": "reject",
}).readonly();

const compiledCandidateTable = type({
  genre: nonEmptyString,
  selection: type.enumerated("ordinary", "explicit-only"),
  rowCount: positiveInteger,
  reachableRowCount: nonNegativeInteger,
  "+": "reject",
}).readonly();

const generatedMovie = type({
  source: type.unit("regular-create-film-data"),
  skuSource: type.unit("catalog-row-sku"),
  releaseDate: type({
    randomStreamSeed: type.unit("sku"),
    streamLifetime: type.unit("one-stream-for-all-draws"),
    draws: dateDraw.array().readonly().atLeastLength(1),
    timeOfDay: type.unit("midnight"),
    earliest: isoDate,
    latest: isoDate,
    priceFormulaBranch: type.enumerated("old-film", "modern-film", "mixed"),
    "+": "reject",
  }).readonly(),
  rarity: generatedMovieResearch.get("rarity"),
  criticScore: generatedMovieResearch.get("criticScore"),
  customerReviewScore: type.unit(0),
  "+": "reject",
}).readonly();

export const MarketMechanicsSchema = type({
  artifactType: type.unit("market-mechanics"),
  build,
  sources: type({
    research: type.and(
      sourceIdentity,
      type({ "artifactType?": type.unit("market-mechanics-research") }).readonly(),
    ),
    evidence: sourceIdentity.array().readonly().atLeastLength(1),
    "+": "reject",
  }).readonly(),
  scope: type.unit("daily-movie-market"),
  evidenceLevel: type.unit("curated-static-analysis"),
  runtimeValidation: type.unit("not-run"),
  daily: type({
    savedMarket: type.unit("restore-without-regeneration"),
    movies: type({
      generatorCalls: type.unit(1),
      attemptCountDistribution: distributionEntry.array().readonly().atLeastLength(1),
      successfulAttempt: type.unit("append-and-continue"),
      clearing: type.unit("remove-all"),
      "+": "reject",
    }).readonly(),
    bundles: type({
      generatorCalls: type.unit(1),
      countDistribution: distributionEntry.array().readonly().atLeastLength(1),
      completedBundle: type.unit("append-and-continue"),
      firstSaveDayCalls: type([forcedBundleCall, forcedBundleCall]).readonly(),
      positivePriceClearing: type.unit("remove"),
      nonpositivePriceClearing: type.unit("retain"),
      "+": "reject",
    }).readonly(),
    "+": "reject",
  }).readonly(),
  candidates: type({
    ordinaryFallbackGenres: nonEmptyString.array().readonly().atLeastLength(1),
    excludedRowPerTable: type.unit(1),
    ordinarySourceRowCount: positiveInteger,
    ordinaryReachableRowCount: nonNegativeInteger,
    tables: compiledCandidateTable.array().readonly().atLeastLength(1),
    "+": "reject",
  }).readonly(),
  bundles: type({
    sizeDistribution: distributionEntry.array().readonly().atLeastLength(1),
    priceTiers: bundlePriceTier.array().readonly().atLeastLength(1),
    freePricePennies: type.unit(0),
    "+": "reject",
  }).readonly(),
  generatedMovie,
  moviePrice: MarketMechanicsResearchSchema.get("moviePrice"),
  purchases,
  "+": "reject",
}).readonly();

export type MarketMechanicsResearch = typeof MarketMechanicsResearchSchema.infer;
export type MarketMechanics = typeof MarketMechanicsSchema.infer;
export type MarketMechanicsSourceIdentity = typeof sourceIdentity.infer;
