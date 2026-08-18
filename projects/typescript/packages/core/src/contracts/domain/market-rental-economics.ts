import { type } from "arktype";

const sha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const nonEmptyString = type("string").atLeastLength(1);
const integer = type("number.integer");
const nonNegativeInteger = integer.atLeast(0);
const positiveInteger = integer.atLeast(1);
const safeSku = positiveInteger.atMost(2_147_483_647);
const pennies = nonNegativeInteger;
const isoDate = type("string").matching(new RegExp("^[0-9]{4}-[0-9]{2}-[0-9]{2}$"));

const build = type({
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();

const artifactIdentity = type({
  fileName: type("string")
    .matching(new RegExp("^[^/\\\\]+\\.json$"))
    .atLeastLength(1),
  sha256,
  sizeBytes: positiveInteger,
  artifactType: type.enumerated(
    "blueprint-call-sites",
    "blueprint-property-references",
    "blueprint-selected-function-trace",
    "checkout-income",
    "level-progression-category-enums",
    "market-guide-findings",
    "market-rental-economics-research",
    "market-value-analysis",
  ),
  "+": "reject",
}).readonly();

const selectedFunctionTraceIdentity = artifactIdentity.and({
  artifactType: type.unit("blueprint-selected-function-trace"),
});

const classificationEvidence = type({
  classificationReaders: selectedFunctionTraceIdentity,
  filmIsNew: selectedFunctionTraceIdentity,
  productStructureReferences: artifactIdentity.and({
    artifactType: type.unit("blueprint-property-references"),
  }),
  cartridgeProductPath: selectedFunctionTraceIdentity,
  spawnMovieCallSites: artifactIdentity.and({
    artifactType: type.unit("blueprint-call-sites"),
  }),
  marketPurchaseSpawn: selectedFunctionTraceIdentity,
  createFilmData: selectedFunctionTraceIdentity,
  movieGenreEnum: artifactIdentity.and({
    artifactType: type.unit("level-progression-category-enums"),
  }),
  "+": "reject",
}).readonly();

const basePricePriority = type([
  type.unit("new"),
  type.unit("special-genre"),
  type.unit("old"),
  type.unit("default"),
]).readonly();

export const MarketRentalEconomicsResearchSchema = type({
  artifactType: type.unit("market-rental-economics-research"),
  build,
  evidence: classificationEvidence,
  classification: type({
    scope: type.unit("regular-market-film-purchases"),
    productStructureTransfer: type.unit(
      "market-product-structure-passed-unchanged-to-spawned-cartridge",
    ),
    regularFilmAvailabilityDay: type.unit(-999),
    normalGameDayMinimum: type.unit(0),
    new: type({
      elapsedDays: type.unit("days-passed-minus-available-in-game-day"),
      comparison: type.unit("less-than-or-equal"),
      durationDays: type.unit(7),
      lowerBound: type.unit("none"),
      regularMarketResult: type.unit("false-on-normal-game-days"),
      "+": "reject",
    }).readonly(),
    basePricePriority,
    specialGenre: type({
      rawEnumValue: type.unit(16),
      displayLabel: type.unit("Adult"),
      normalizedGenre: type.unit("adult"),
      "+": "reject",
    }).readonly(),
    old: type({
      comparison: type.unit("release-date-less-than-or-equal"),
      cutoff: type.unit("1940-12-29"),
      "+": "reject",
    }).readonly(),
    holographic: type({
      rawRarityValue: type.unit(3),
      normalizedRarity: type.unit("exclusive"),
      adjustment: type.unit("add-after-base-price"),
      "+": "reject",
    }).readonly(),
    runtimeValidation: type.unit("not-run"),
    "+": "reject",
  }).readonly(),
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

const baseBranch = type.enumerated("adult", "old", "default");

const routeSummary = type({
  route: type.enumerated("ordinary", "explicit-only"),
  filmCount: positiveInteger,
  "+": "reject",
}).readonly();

const branchSummary = type({
  baseBranch,
  filmCount: nonNegativeInteger,
  exclusiveFilmCount: nonNegativeInteger,
  "+": "reject",
}).readonly();

const distributionEntry = type({
  value: positiveInteger,
  filmCount: positiveInteger,
  "+": "reject",
}).readonly();

const film = type({
  sku: safeSku,
  genre,
  productName: nonEmptyString,
  marketRoute: type.enumerated("ordinary", "explicit-only"),
  releaseDate: isoDate,
  rarity,
  acquisitionCostPennies: pennies,
  rental: type({
    baseBranch,
    basePricePennies: pennies,
    exclusiveSurchargeApplied: type("boolean"),
    exclusiveSurchargePennies: pennies,
    exactChangeRevenuePennies: positiveInteger,
    "+": "reject",
  }).readonly(),
  exactChangeRecovery: type({
    formula: type.unit("ceil-acquisition-cost-divided-by-rental-revenue"),
    rentalsRequired: positiveInteger,
    cumulativeRevenuePennies: positiveInteger,
    surplusAfterRecoveryPennies: pennies,
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

export const MarketRentalEconomicsSchema = type({
  artifactType: type.unit("market-rental-economics"),
  build,
  sources: type({
    research: artifactIdentity.and({
      artifactType: type.unit("market-rental-economics-research"),
    }),
    marketValueAnalysis: artifactIdentity.and({
      artifactType: type.unit("market-value-analysis"),
    }),
    marketGuideFindings: artifactIdentity.and({
      artifactType: type.unit("market-guide-findings"),
    }),
    checkoutIncome: artifactIdentity.and({
      artifactType: type.unit("checkout-income"),
    }),
    "+": "reject",
  }).readonly(),
  scope: type.unit("reachable-regular-market-film-acquisition-and-rental-recovery"),
  evidenceLevel: type.unit("compiled-static-analysis"),
  runtimeValidation: type.unit("not-run"),
  classification: type({
    regularFilmAvailabilityDay: type.unit(-999),
    normalGameDayMinimum: type.unit(0),
    newBranch: type.unit("false-on-normal-game-days"),
    basePricePriority,
    specialGenre: type.unit("adult"),
    oldReleaseCutoff: type.unit("1940-12-29"),
    exclusiveRarity: type.unit("exclusive"),
    exclusiveAdjustment: type.unit("add-after-base-price"),
    "+": "reject",
  }).readonly(),
  totals: type({
    reachableFilmCount: positiveInteger,
    byRoute: routeSummary.array().readonly().atLeastLength(2),
    byBaseBranch: branchSummary.array().readonly().atLeastLength(3),
    exclusiveFilmCount: nonNegativeInteger,
    oneRentalRecoveryCount: nonNegativeInteger,
    minimumRentalsRequired: positiveInteger,
    maximumRentalsRequired: positiveInteger,
    averageRentalsRequired: type("number").atLeast(1),
    "+": "reject",
  }).readonly(),
  distributions: type({
    exactChangeRevenuePennies: distributionEntry.array().readonly().atLeastLength(1),
    rentalsRequired: distributionEntry.array().readonly().atLeastLength(1),
    "+": "reject",
  }).readonly(),
  films: film.array().readonly().atLeastLength(1),
  guideClaimStatus: type({
    perSkuAcquisitionCost: type.unit("eligible-with-build-limit"),
    perRentalBill: type.unit("eligible-with-build-limit"),
    exactChangeRecoveryCount: type.unit("eligible-with-build-limit"),
    expectedRentalIncome: type.unit("unsupported-by-inputs"),
    stockingRecommendation: type.unit("unsupported-by-inputs"),
    recommendationLimit: type.unit(
      "inputs-do-not-cover-rental-frequency-or-actual-change",
    ),
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

export type MarketRentalEconomicsResearch =
  typeof MarketRentalEconomicsResearchSchema.infer;
export type MarketRentalEconomics = typeof MarketRentalEconomicsSchema.infer;
export type MarketRentalEconomicsEvidenceIdentity =
  MarketRentalEconomicsResearch["evidence"][keyof MarketRentalEconomicsResearch["evidence"]];
export type MarketRentalEconomicsSourceIdentity =
  MarketRentalEconomics["sources"][keyof MarketRentalEconomics["sources"]];
