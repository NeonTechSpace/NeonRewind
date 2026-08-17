import { type } from "arktype";

const sha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const nonEmptyString = type("string").atLeastLength(1);
const nonNegativeInteger = type("number.integer").atLeast(0);
const positiveInteger = type("number.integer").atLeast(1);
const safeSku = positiveInteger.atMost(2_147_483_647);
const probability = type("number").atLeast(0).atMost(1);
const pennies = nonNegativeInteger;

const build = type({
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();

const sourceIdentity = type({
  fileName: nonEmptyString,
  sha256,
  sizeBytes: positiveInteger,
  artifactType: type.enumerated("market-mechanics", "market-value-analysis"),
  "+": "reject",
}).readonly();

const genre = type.enumerated(
  "action",
  "adult",
  "adventure",
  "comedy",
  "drama",
  "fantasy",
  "horror",
  "kid",
  "police",
  "romance",
  "sci-fi",
  "western",
  "xmas",
);

const rarity = type.enumerated(
  "common",
  "rare",
  "limited-edition",
  "exclusive",
);

const priceSummary = type({
  filmCount: positiveInteger,
  totalPricePennies: pennies,
  minimumPricePennies: pennies,
  maximumPricePennies: pennies,
  averagePricePennies: type("number").atLeast(0),
  "+": "reject",
}).readonly();

const distributionEntry = type({
  value: positiveInteger,
  probability,
  "+": "reject",
}).readonly();

const distributionSummary = type({
  minimum: positiveInteger,
  maximum: positiveInteger,
  expected: type("number").moreThan(0),
  distribution: distributionEntry.array().readonly().atLeastLength(1),
  "+": "reject",
}).readonly();

const forcedBundleCall = type({
  forcedCount: positiveInteger,
  free: type("boolean"),
  movieAttemptsPerBundle: positiveInteger,
  randomMovieAttempts: type.unit(false),
  "+": "reject",
}).readonly();

const excludedFilm = type({
  sku: safeSku,
  genre,
  productName: nonEmptyString,
  sourceRowIndex: nonNegativeInteger,
  sourceRowCount: positiveInteger,
  pricePennies: pennies,
  "+": "reject",
}).readonly();

const selectionRoute = type({
  sourceFilmCount: positiveInteger,
  reachableFilmCount: positiveInteger,
  unreachableFinalRowCount: positiveInteger,
  unreachableFinalRows: excludedFilm.array().readonly().atLeastLength(1),
  "+": "reject",
}).readonly();

const rarityPriceSummary = type({
  rarity,
  reachablePrices: priceSummary,
  "+": "reject",
}).readonly();

const genrePriceSummary = type({
  genre,
  route: type.enumerated("ordinary", "explicit-only"),
  sourceFilmCount: positiveInteger,
  reachableFilmCount: positiveInteger,
  unreachableFinalRowCount: positiveInteger,
  reachablePrices: priceSummary,
  "+": "reject",
}).readonly();

const ordinaryPriceComparison = type({
  ordinaryReachableFilmCount: positiveInteger,
  individualPriceLowerCount: nonNegativeInteger,
  individualPriceEqualCount: nonNegativeInteger,
  individualPriceHigherCount: nonNegativeInteger,
  individualPriceLowerProportion: probability,
  individualPriceEqualProportion: probability,
  individualPriceHigherProportion: probability,
  "+": "reject",
}).readonly();

const configuredBundleTarget = type({
  movieAttemptCount: positiveInteger,
  probability,
  allAttemptsSuccessful: type({
    successfulMovieCount: positiveInteger,
    bundlePricePennies: pennies,
    pricePerMoviePennies: type("number").atLeast(0),
    ordinaryPriceComparison,
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

const tierJump = type({
  previousSuccessfulMovieCount: positiveInteger,
  successfulMovieCount: positiveInteger,
  previousBundlePricePennies: pennies,
  bundlePricePennies: pennies,
  bundlePriceIncreasePennies: pennies,
  previousPricePerMoviePennies: type("number").atLeast(0),
  pricePerMoviePennies: type("number").atLeast(0),
  pricePerMovieIncreasePennies: type("number").moreThan(0),
  "+": "reject",
}).readonly();

export const MarketGuideFindingsSchema = type({
  artifactType: type.unit("market-guide-findings"),
  build,
  sources: type({
    marketMechanics: sourceIdentity.and({
      artifactType: type.unit("market-mechanics"),
    }),
    marketValueAnalysis: sourceIdentity.and({
      artifactType: type.unit("market-value-analysis"),
    }),
    "+": "reject",
  }).readonly(),
  scope: type.unit("daily-movie-market-acquisition-cost-and-availability"),
  evidenceLevel: type.unit("compiled-static-analysis"),
  runtimeValidation: type.unit("not-run"),
  guideClaimStatus: type({
    availability: type.unit("eligible-with-build-limit"),
    selection: type.unit("eligible-with-build-limit"),
    acquisitionCost: type.unit("eligible-with-build-limit"),
    realizedBundleComposition: type.unit("conditional-until-runtime-validation"),
    realizedBundleDelivery: type.unit("conditional-until-runtime-validation"),
    profitRecommendation: type.unit("unsupported-by-inputs"),
    profitRecommendationLimit: type.unit("inputs-do-not-cover-income-or-demand"),
    "+": "reject",
  }).readonly(),
  availability: type({
    savedStock: type.unit("restore-without-regeneration"),
    regularMovieAttempts: distributionSummary,
    paidBundleOffers: distributionSummary,
    firstSaveDayBundleCalls: forcedBundleCall.array().readonly().atLeastLength(1),
    clearing: type({
      regularMovies: type.unit("remove-all"),
      positivePriceBundles: type.unit("remove"),
      nonpositivePriceBundles: type.unit("retain"),
      "+": "reject",
    }).readonly(),
    "+": "reject",
  }).readonly(),
  selection: type({
    excludedFinalRowPerTable: type.unit(1),
    ordinary: selectionRoute,
    explicitOnly: selectionRoute,
    "+": "reject",
  }).readonly(),
  individualPricing: type({
    currency: type.unit("pennies"),
    generatedPriceBranch: type.unit("old-film"),
    seededBy: type.unit("sku"),
    ordinaryReachable: priceSummary,
    byGenre: genrePriceSummary.array().readonly().atLeastLength(1),
    ordinaryReachableByRarity: rarityPriceSummary.array().readonly().atLeastLength(1),
    "+": "reject",
  }).readonly(),
  bundleEconomics: type({
    currency: type.unit("pennies"),
    configuredMovieAttemptTargets: configuredBundleTarget.array().readonly().atLeastLength(1),
    underfilledTierJumps: tierJump.array().readonly(),
    lowestConfiguredFullSuccessUnitCost: type({
      movieAttemptCount: positiveInteger,
      pricePerMoviePennies: type("number").atLeast(0),
      "+": "reject",
    }).readonly(),
    "+": "reject",
  }).readonly(),
  purchases: type({
    individualMovie: type({
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
  }).readonly(),
  "+": "reject",
}).readonly();

export type MarketGuideFindings = typeof MarketGuideFindingsSchema.infer;
export type MarketGuideFindingsSourceIdentity = MarketGuideFindings["sources"][
  keyof MarketGuideFindings["sources"]
];
