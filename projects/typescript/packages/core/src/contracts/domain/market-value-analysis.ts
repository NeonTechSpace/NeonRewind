import { type } from "arktype";

const sha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const nonEmptyString = type("string").atLeastLength(1);
const nonNegativeInteger = type("number.integer").atLeast(0);
const positiveInteger = type("number.integer").atLeast(1);
const safeSku = positiveInteger.atMost(2_147_483_647);
const pennies = nonNegativeInteger;
const isoDate = type("string").matching(new RegExp("^[0-9]{4}-[0-9]{2}-[0-9]{2}$"));
const probability = type("number").atLeast(0).atMost(1);

const build = type({
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();

const sourceIdentity = type({
  fileName: nonEmptyString,
  sha256,
  sizeBytes: positiveInteger,
  artifactType: type.enumerated(
    "film-catalog",
    "market-mechanics",
    "structured-values",
  ),
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

const film = type({
  sku: safeSku,
  genre,
  productName: nonEmptyString,
  marketSelection: type.enumerated(
    "ordinary-reachable",
    "ordinary-unreachable-final-row",
    "explicit-reachable",
    "explicit-unreachable-final-row",
  ),
  sourceRowIndex: nonNegativeInteger,
  sourceRowCount: positiveInteger,
  releaseDate: isoDate,
  rarity,
  criticScore: nonNegativeInteger.atMost(10),
  customerReviewScore: type.unit(0),
  price: type({
    currency: type.unit("pennies"),
    basePennies: pennies,
    criticBonusPennies: pennies,
    genreBonusPennies: pennies,
    seededRandomDraw: nonNegativeInteger,
    seededRandomPennies: pennies,
    rarityMultiplier: type("number").moreThan(0),
    ageMultiplier: type("number").moreThan(0),
    totalPennies: pennies,
    "+": "reject",
  }).readonly(),
  evidence: type({
    kind: type.unit("data-table"),
    tablePath: nonEmptyString,
    rowKey: nonEmptyString,
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

const selectionSummary = type({
  sourceFilmCount: positiveInteger,
  reachableFilmCount: positiveInteger,
  unreachableFinalRowCount: positiveInteger,
  "+": "reject",
}).readonly();

const genreSummary = type({
  genre,
  route: type.enumerated("ordinary", "explicit-only"),
  sourceFilmCount: positiveInteger,
  reachableFilmCount: positiveInteger,
  unreachableFinalRowCount: positiveInteger,
  reachablePrices: priceSummary,
  "+": "reject",
}).readonly();

const raritySummary = type({
  rarity,
  reachablePrices: priceSummary,
  "+": "reject",
}).readonly();

const bundleValue = type({
  successfulMovieCount: positiveInteger,
  configuredTargetProbability: type.or(probability, type("null")),
  bundlePricePennies: pennies,
  pricePerSuccessfulMoviePennies: type("number").atLeast(0),
  additionalBundlePriceFromPreviousCountPennies: pennies,
  costPerMovieTrend: type.enumerated("first", "lower", "higher", "unchanged"),
  "+": "reject",
}).readonly();

export const MarketValueAnalysisSchema = type({
  artifactType: type.unit("market-value-analysis"),
  build,
  sources: type({
    filmCatalog: sourceIdentity.and({ artifactType: type.unit("film-catalog") }),
    marketMechanics: sourceIdentity.and({ artifactType: type.unit("market-mechanics") }),
    catalogStructuredValues: sourceIdentity.and({
      artifactType: type.unit("structured-values"),
    }),
    mechanicsStructuredValues: sourceIdentity.and({
      artifactType: type.unit("structured-values"),
    }),
    "+": "reject",
  }).readonly(),
  scope: type.unit("regular-film-market-value"),
  evidenceLevel: type.unit("compiled-static-analysis"),
  randomStream: type({
    engineVersion: type.unit("5.4"),
    implementation: type.unit("FRandomStream"),
    seedMultiplier: type.unit(196_314_165),
    seedIncrement: type.unit(907_633_515),
    fractionConstruction: type.unit(
      "float32-one-or-seed-shift-right-9-minus-one",
    ),
    integerRange: type.unit(
      "truncate-float32-fraction-times-inclusive-range",
    ),
    "+": "reject",
  }).readonly(),
  totals: type({
    regularFilmCount: positiveInteger,
    ordinary: selectionSummary,
    explicitOnly: selectionSummary,
    "+": "reject",
  }).readonly(),
  films: film.array().readonly(),
  summaries: type({
    allRegularPrices: priceSummary,
    ordinaryReachablePrices: priceSummary,
    byGenre: genreSummary.array().readonly(),
    ordinaryReachableByRarity: raritySummary.array().readonly(),
    "+": "reject",
  }).readonly(),
  bundleEconomics: type({
    currency: type.unit("pennies"),
    freeBundlePricePennies: type.unit(0),
    nonFreeBySuccessfulMovieCount: bundleValue.array().readonly(),
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

export type MarketValueAnalysis = typeof MarketValueAnalysisSchema.infer;
export type MarketValueSourceIdentity = MarketValueAnalysis["sources"][
  keyof MarketValueAnalysis["sources"]
];
