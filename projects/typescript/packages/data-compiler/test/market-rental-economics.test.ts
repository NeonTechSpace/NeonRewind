import assert from "node:assert/strict";
import test from "node:test";

import {
  CheckoutIncomeSchema,
  MarketGuideFindingsSchema,
  MarketRentalEconomicsResearchSchema,
  MarketRentalEconomicsSchema,
  MarketValueAnalysisSchema,
  type CheckoutIncome,
  type MarketGuideFindings,
  type MarketRentalEconomicsResearch,
  type MarketValueAnalysis,
} from "@neonretrorewind/core";

import { assertMarketRentalEconomicsEvidenceFiles } from "../src/market-rental-economics-cli.ts";
import {
  compileMarketRentalEconomics,
  type MarketRentalEconomicsInputSources,
} from "../src/market-rental-economics.ts";

const build = { steamAppId: "123", steamBuildId: "456" } as const;
const marketValueSource = {
  fileName: "market-value-analysis.json",
  sha256: "b".repeat(64),
  sizeBytes: 2_000,
  artifactType: "market-value-analysis" as const,
};
const sources: MarketRentalEconomicsInputSources = {
  research: {
    fileName: "market-rental-economics-research.json",
    sha256: "a".repeat(64),
    sizeBytes: 1_000,
    artifactType: "market-rental-economics-research",
  },
  marketValueAnalysis: marketValueSource,
  marketGuideFindings: {
    fileName: "market-guide-findings.json",
    sha256: "c".repeat(64),
    sizeBytes: 3_000,
    artifactType: "market-guide-findings",
  },
  checkoutIncome: {
    fileName: "checkout-income.json",
    sha256: "d".repeat(64),
    sizeBytes: 4_000,
    artifactType: "checkout-income",
  },
};

test("compiles reachable per-SKU exact-change rental recovery", () => {
  const economics = compileMarketRentalEconomics(
    createResearch(),
    createValues(),
    createFindings(),
    createCheckout(),
    sources,
  );

  assert.equal(MarketRentalEconomicsSchema.allows(economics), true);
  assert.deepEqual(economics.films.map((film) => film.sku), [101, 102, 103, 104, 201]);
  assert.equal(economics.totals.reachableFilmCount, 5);
  assert.deepEqual(economics.totals.byRoute, [
    { route: "ordinary", filmCount: 4 },
    { route: "explicit-only", filmCount: 1 },
  ]);
  assert.deepEqual(economics.totals.byBaseBranch, [
    { baseBranch: "adult", filmCount: 2, exclusiveFilmCount: 1 },
    { baseBranch: "old", filmCount: 1, exclusiveFilmCount: 0 },
    { baseBranch: "default", filmCount: 2, exclusiveFilmCount: 1 },
  ]);
  assert.equal(economics.totals.exclusiveFilmCount, 2);
  assert.equal(economics.totals.oneRentalRecoveryCount, 1);
  assert.equal(economics.totals.minimumRentalsRequired, 1);
  assert.equal(economics.totals.maximumRentalsRequired, 3);
  assert.equal(economics.totals.averageRentalsRequired, 2.2);
  assert.deepEqual(economics.distributions.rentalsRequired, [
    { value: 1, filmCount: 1 },
    { value: 2, filmCount: 2 },
    { value: 3, filmCount: 2 },
  ]);

  const adultExclusive = economics.films.find((film) => film.sku === 101);
  assert.deepEqual(adultExclusive?.rental, {
    baseBranch: "adult",
    basePricePennies: 600,
    exclusiveSurchargeApplied: true,
    exclusiveSurchargePennies: 100,
    exactChangeRevenuePennies: 700,
  });
  assert.deepEqual(adultExclusive?.exactChangeRecovery, {
    formula: "ceil-acquisition-cost-divided-by-rental-revenue",
    rentalsRequired: 1,
    cumulativeRevenuePennies: 700,
    surplusAfterRecoveryPennies: 50,
  });

  const oldFilm = economics.films.find((film) => film.sku === 102);
  assert.equal(oldFilm?.rental.baseBranch, "old");
  assert.equal(oldFilm?.rental.exactChangeRevenuePennies, 350);
  assert.equal(oldFilm?.exactChangeRecovery.rentalsRequired, 2);

  const defaultExclusive = economics.films.find((film) => film.sku === 103);
  assert.equal(defaultExclusive?.rental.baseBranch, "default");
  assert.equal(defaultExclusive?.rental.exactChangeRevenuePennies, 500);
  assert.equal(defaultExclusive?.exactChangeRecovery.rentalsRequired, 3);
  assert.equal(
    economics.guideClaimStatus.expectedRentalIncome,
    "unsupported-by-inputs",
  );
});

test("gives the Adult branch priority over the old cutoff", () => {
  const economics = compileMarketRentalEconomics(
    createResearch(),
    createValues(),
    createFindings(),
    createCheckout(),
    sources,
  );

  const film = economics.films.find((entry) => entry.sku === 101);
  assert.equal(film?.releaseDate, "1935-01-01");
  assert.equal(film?.rental.baseBranch, "adult");
});

test("rejects inputs from another build", () => {
  const checkout = createCheckout();
  checkout.build.steamBuildId = "999";

  assert.throws(
    () => compileMarketRentalEconomics(
      createResearch(),
      createValues(),
      createFindings(),
      checkout,
      sources,
    ),
    /different game builds/u,
  );
});

test("rejects guide findings not linked to the supplied value analysis", () => {
  const findings = createFindings();
  findings.sources.marketValueAnalysis.sha256 = "e".repeat(64);

  assert.throws(
    () => compileMarketRentalEconomics(
      createResearch(),
      createValues(),
      findings,
      createCheckout(),
      sources,
    ),
    /not linked to the value-analysis input/u,
  );
});

test("rejects guide findings linked to different Market mechanics", () => {
  const findings = createFindings();
  findings.sources.marketMechanics.sha256 = "a".repeat(64);

  assert.throws(
    () => compileMarketRentalEconomics(
      createResearch(),
      createValues(),
      findings,
      createCheckout(),
      sources,
    ),
    /different mechanics inputs/u,
  );
});

test("rejects changed checkout classification", () => {
  const checkout = createCheckout();
  checkout.cartridgeRentalPricing.basePricePriority = [
    "special-genre",
    "new",
    "old",
    "default",
  ] as unknown as typeof checkout.cartridgeRentalPricing.basePricePriority;

  assert.throws(
    () => compileMarketRentalEconomics(
      createResearch(),
      createValues(),
      createFindings(),
      checkout,
      sources,
    ),
    /Checkout rental-price classification changed/u,
  );
});

test("rejects duplicate reachable SKUs", () => {
  const values = createValues();
  values.films[1]!.sku = values.films[0]!.sku;

  assert.throws(
    () => compileMarketRentalEconomics(
      createResearch(),
      values,
      createFindings(),
      createCheckout(),
      sources,
    ),
    /duplicate SKU/u,
  );
});

test("rejects classification evidence from another build", () => {
  const research = createResearch();
  const identities = Object.values(research.evidence);

  assert.throws(
    () => assertMarketRentalEconomicsEvidenceFiles(
      research.build,
      research.evidence,
      identities.map((identity, index) => ({
        path: `evidence/${identity.fileName}`,
        bytes: new Uint8Array(identity.sizeBytes),
        sha256: identity.sha256,
        value: {
          artifactType: identity.artifactType,
          build: index === 0
            ? { steamAppId: "123", steamBuildId: "999" }
            : research.build,
        },
      })),
    ),
    /evidence identity changed/u,
  );
});

function createResearch(): Mutable<MarketRentalEconomicsResearch> {
  const trace = (
    fileName: string,
    character: string,
  ) => ({
    fileName,
    sha256: character.repeat(64),
    sizeBytes: 100,
    artifactType: "blueprint-selected-function-trace" as const,
  });
  return structuredClone(MarketRentalEconomicsResearchSchema.assert({
    artifactType: "market-rental-economics-research",
    build,
    evidence: {
      classificationReaders: trace("classification-readers.json", "1"),
      filmIsNew: trace("film-is-new.json", "2"),
      productStructureReferences: {
        fileName: "product-structure-references.json",
        sha256: "3".repeat(64),
        sizeBytes: 100,
        artifactType: "blueprint-property-references",
      },
      cartridgeProductPath: trace("cartridge-product-path.json", "4"),
      spawnMovieCallSites: {
        fileName: "spawn-movie-call-sites.json",
        sha256: "5".repeat(64),
        sizeBytes: 100,
        artifactType: "blueprint-call-sites",
      },
      marketPurchaseSpawn: trace("market-purchase-spawn.json", "6"),
      createFilmData: trace("create-film-data.json", "7"),
      movieGenreEnum: {
        fileName: "movie-genre-enum.json",
        sha256: "8".repeat(64),
        sizeBytes: 100,
        artifactType: "level-progression-category-enums",
      },
    },
    classification: {
      scope: "regular-market-film-purchases",
      productStructureTransfer:
        "market-product-structure-passed-unchanged-to-spawned-cartridge",
      regularFilmAvailabilityDay: -999,
      normalGameDayMinimum: 0,
      new: {
        elapsedDays: "days-passed-minus-available-in-game-day",
        comparison: "less-than-or-equal",
        durationDays: 7,
        lowerBound: "none",
        regularMarketResult: "false-on-normal-game-days",
      },
      basePricePriority: ["new", "special-genre", "old", "default"],
      specialGenre: {
        rawEnumValue: 16,
        displayLabel: "Adult",
        normalizedGenre: "adult",
      },
      old: {
        comparison: "release-date-less-than-or-equal",
        cutoff: "1940-12-29",
      },
      holographic: {
        rawRarityValue: 3,
        normalizedRarity: "exclusive",
        adjustment: "add-after-base-price",
      },
      runtimeValidation: "not-run",
    },
  })) as Mutable<MarketRentalEconomicsResearch>;
}

function createValues(): Mutable<MarketValueAnalysis> {
  const films = [
    film(101, "adult", "1935-01-01", "exclusive", 650, "ordinary-reachable"),
    film(102, "adventure", "1935-01-01", "common", 700, "ordinary-reachable"),
    film(103, "comedy", "1950-01-01", "exclusive", 1_200, "ordinary-reachable"),
    film(104, "adult", "1980-01-01", "common", 1_300, "ordinary-reachable"),
    film(105, "drama", "1980-01-01", "common", 900, "ordinary-unreachable-final-row"),
    film(201, "drama", "1980-01-01", "common", 800, "explicit-reachable"),
    film(202, "horror", "1970-01-01", "rare", 900, "explicit-unreachable-final-row"),
  ];
  return structuredClone(MarketValueAnalysisSchema.assert({
    artifactType: "market-value-analysis",
    build,
    sources: {
      filmCatalog: identity("film-catalog.json", "f", "film-catalog"),
      marketMechanics: identity("market-mechanics.json", "e", "market-mechanics"),
      catalogStructuredValues: identity(
        "catalog-structured-values.json",
        "d",
        "structured-values",
      ),
      mechanicsStructuredValues: identity(
        "mechanics-structured-values.json",
        "c",
        "structured-values",
      ),
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
      regularFilmCount: 7,
      ordinary: {
        sourceFilmCount: 5,
        reachableFilmCount: 4,
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
      allRegularPrices: priceSummary(films),
      ordinaryReachablePrices: priceSummary(films.slice(0, 4)),
      byGenre: [],
      ordinaryReachableByRarity: [],
    },
    bundleEconomics: {
      currency: "pennies",
      freeBundlePricePennies: 0,
      nonFreeBySuccessfulMovieCount: [],
    },
  })) as Mutable<MarketValueAnalysis>;
}

function createFindings(): Mutable<MarketGuideFindings> {
  return structuredClone(MarketGuideFindingsSchema.assert({
    artifactType: "market-guide-findings",
    build,
    sources: {
      marketMechanics: identity(
        "market-mechanics.json",
        "e",
        "market-mechanics",
      ),
      marketValueAnalysis: marketValueSource,
    },
    scope: "daily-movie-market-acquisition-cost-and-availability",
    evidenceLevel: "compiled-static-analysis",
    runtimeValidation: "not-run",
    guideClaimStatus: {
      availability: "eligible-with-build-limit",
      selection: "eligible-with-build-limit",
      acquisitionCost: "eligible-with-build-limit",
      realizedBundleComposition: "conditional-until-runtime-validation",
      realizedBundleDelivery: "conditional-until-runtime-validation",
      profitRecommendation: "unsupported-by-inputs",
      profitRecommendationLimit: "inputs-do-not-cover-income-or-demand",
    },
    availability: {
      savedStock: "restore-without-regeneration",
      regularMovieAttempts: distributionSummary(2, 3),
      paidBundleOffers: distributionSummary(1, 2),
      firstSaveDayBundleCalls: [
        {
          forcedCount: 1,
          free: true,
          movieAttemptsPerBundle: 5,
          randomMovieAttempts: false,
        },
      ],
      clearing: {
        regularMovies: "remove-all",
        positivePriceBundles: "remove",
        nonpositivePriceBundles: "retain",
      },
    },
    selection: {
      excludedFinalRowPerTable: 1,
      ordinary: {
        sourceFilmCount: 5,
        reachableFilmCount: 4,
        unreachableFinalRowCount: 1,
        unreachableFinalRows: [excludedFilm(105, "drama", 900, 4, 5)],
      },
      explicitOnly: {
        sourceFilmCount: 2,
        reachableFilmCount: 1,
        unreachableFinalRowCount: 1,
        unreachableFinalRows: [excludedFilm(202, "horror", 900, 1, 2)],
      },
    },
    individualPricing: {
      currency: "pennies",
      generatedPriceBranch: "old-film",
      seededBy: "sku",
      ordinaryReachable: priceSummary([
        { price: { totalPennies: 650 } },
        { price: { totalPennies: 700 } },
        { price: { totalPennies: 1_200 } },
        { price: { totalPennies: 1_300 } },
      ]),
      byGenre: [
        {
          genre: "adult",
          route: "ordinary",
          sourceFilmCount: 3,
          reachableFilmCount: 2,
          unreachableFinalRowCount: 1,
          reachablePrices: priceSummary([
            { price: { totalPennies: 650 } },
            { price: { totalPennies: 1_300 } },
          ]),
        },
      ],
      ordinaryReachableByRarity: [
        {
          rarity: "common",
          reachablePrices: priceSummary([
            { price: { totalPennies: 700 } },
            { price: { totalPennies: 1_300 } },
          ]),
        },
      ],
    },
    bundleEconomics: {
      currency: "pennies",
      configuredMovieAttemptTargets: [
        {
          movieAttemptCount: 5,
          probability: 1,
          allAttemptsSuccessful: {
            successfulMovieCount: 5,
            bundlePricePennies: 6_000,
            pricePerMoviePennies: 1_200,
            ordinaryPriceComparison: {
              ordinaryReachableFilmCount: 4,
              individualPriceLowerCount: 2,
              individualPriceEqualCount: 1,
              individualPriceHigherCount: 1,
              individualPriceLowerProportion: 0.5,
              individualPriceEqualProportion: 0.25,
              individualPriceHigherProportion: 0.25,
            },
          },
        },
      ],
      underfilledTierJumps: [],
      lowestConfiguredFullSuccessUnitCost: {
        movieAttemptCount: 5,
        pricePerMoviePennies: 1_200,
      },
    },
    purchases: {
      individualMovie: {
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
  })) as Mutable<MarketGuideFindings>;
}

function createCheckout(): Mutable<CheckoutIncome> {
  return structuredClone(CheckoutIncomeSchema.assert({
    artifactType: "checkout-income",
    build,
    sources: {
      research: identity(
        "checkout-income-research.json",
        "1",
        "checkout-income-research",
      ),
      evidence: {
        pricing: identity(
          "checkout-pricing.json",
          "2",
          "blueprint-selected-function-trace",
        ),
        cashFlow: identity(
          "checkout-cash-flow.json",
          "3",
          "blueprint-selected-function-trace",
        ),
      },
    },
    scope: "checkout-bill-tender-returned-cash-and-completion",
    evidenceLevel: "curated-static-analysis",
    runtimeValidation: "not-run",
    bill: {
      productPriceInput: "gathered-product-price",
      aggregation: "sum-every-scanned-product",
      conversion: {
        sourceCurrency: "game-price-units",
        targetCurrency: "pennies",
        multiplierToPennies: 100,
        integerConversion: "round-to-nearest",
      },
    },
    cartridgeRentalPricing: {
      applicability: "not-selling-back",
      basePricePriority: ["new", "special-genre", "old", "default"],
      new: price(700),
      specialGenre: {
        rawEnumValue: 16,
        displayLabel: "unresolved",
        price: price(600),
      },
      old: price(350),
      default: price(400),
      holographicSurcharge: price(100),
      holographicAdjustment: "add-after-base-price",
      sellingPath: "separate-selling-price",
    },
    tender: {
      coreMoneyMutation: "credit-customer-tender",
      rounding: "strict-next-multiple",
      roundingFormula: "integer-divide-plus-one-times-denomination",
      exactPaymentProbability: 0.1,
      roundUpOutcomes: [
        { denominationPennies: 500, probability: 0.9 },
      ],
      probabilityTotal: 1,
    },
    returnedCash: {
      denominationsPennies: [1, 500],
      selection: {
        fundsCheck: "negative-denomination-before-mutation",
        mutation: "debit-core-money",
        allowDebt: true,
        paybackUpdate: "add-denomination",
      },
      undo: {
        actorSelection: "latest-returned-actor-with-matching-denomination",
        mutation: "credit-core-money",
        paybackUpdate: "subtract-denomination",
      },
    },
    finalization: {
      requiredPayback: "customer-tender-minus-bill",
      closeCondition: "actual-payback-greater-than-or-equal-required-payback",
      closeContinuation: [
        "clear-returned-cash-actors",
        "reset-checkout-values",
        "refresh-display",
        "broadcast-transaction-ended",
      ],
      cleanupCoreMoneyMutation: "none",
    },
    income: {
      completedTransactionNetChange: "customer-tender-minus-actual-payback",
      exactChangeNetRevenue: "bill",
      excessChangeNetRevenue: "less-than-bill",
      excessChangeAccepted: true,
      excessChangeCanReduceCoreMoneyBelowZero: true,
    },
    guideClaimStatus: {
      billFormation: "eligible-with-build-limit",
      tenderDistribution: "eligible-with-build-limit",
      transactionIncome: "eligible-with-build-limit",
      specialGenreLabel: "unsupported-by-inputs",
      runtimePresentation: "conditional-until-runtime-validation",
      profitRecommendation: "unsupported-by-inputs",
      profitRecommendationLimit: "inputs-do-not-cover-demand-or-rental-frequency",
    },
  })) as Mutable<CheckoutIncome>;
}

function film(
  sku: number,
  genre: "adult" | "adventure" | "comedy" | "drama" | "horror",
  releaseDate: string,
  rarity: "common" | "rare" | "exclusive",
  totalPennies: number,
  marketSelection:
    | "ordinary-reachable"
    | "ordinary-unreachable-final-row"
    | "explicit-reachable"
    | "explicit-unreachable-final-row",
) {
  return {
    sku,
    genre,
    productName: `Film ${sku}`,
    marketSelection,
    sourceRowIndex: 0,
    sourceRowCount: 1,
    releaseDate,
    rarity,
    criticScore: 0,
    customerReviewScore: 0,
    price: {
      currency: "pennies",
      basePennies: totalPennies,
      criticBonusPennies: 0,
      genreBonusPennies: 0,
      seededRandomDraw: 0,
      seededRandomPennies: 0,
      rarityMultiplier: 1,
      ageMultiplier: 1,
      totalPennies,
    },
    evidence: {
      kind: "data-table",
      tablePath: `Example/Film${sku}.uasset`,
      rowKey: String(sku),
    },
  };
}

function priceSummary(
  films: readonly { readonly price: { readonly totalPennies: number } }[],
) {
  const prices = films.map((film) => film.price.totalPennies);
  const totalPricePennies = prices.reduce((total, value) => total + value, 0);
  return {
    filmCount: films.length,
    totalPricePennies,
    minimumPricePennies: Math.min(...prices),
    maximumPricePennies: Math.max(...prices),
    averagePricePennies: totalPricePennies / films.length,
  };
}

function identity<ArtifactType extends string>(
  fileName: string,
  character: string,
  artifactType: ArtifactType,
) {
  return {
    fileName,
    sha256: character.repeat(64),
    sizeBytes: 100,
    artifactType,
  };
}

function distributionSummary(minimum: number, maximum: number) {
  return {
    minimum,
    maximum,
    expected: (minimum + maximum) / 2,
    distribution: [
      { value: minimum, probability: 0.5 },
      { value: maximum, probability: 0.5 },
    ],
  };
}

function excludedFilm(
  sku: number,
  genre: "drama" | "horror",
  pricePennies: number,
  sourceRowIndex: number,
  sourceRowCount: number,
) {
  return {
    sku,
    genre,
    productName: `Film ${sku}`,
    sourceRowIndex,
    sourceRowCount,
    pricePennies,
  };
}

function price(pricePennies: number) {
  return { priceUnits: pricePennies / 100, pricePennies };
}

type Mutable<Value> = Value extends object
  ? { -readonly [Key in keyof Value]: Mutable<Value[Key]> }
  : Value;
