import {
  MarketRentalEconomicsSchema,
  type CheckoutIncome,
  type MarketGuideFindings,
  type MarketRentalEconomics,
  type MarketRentalEconomicsResearch,
  type MarketRentalEconomicsSourceIdentity,
  type MarketValueAnalysis,
} from "@neonretrorewind/core";

interface InputIdentity {
  readonly fileName: string;
  readonly sha256: string;
  readonly sizeBytes: number;
}

export interface MarketRentalEconomicsInputSources {
  readonly research: InputIdentity & {
    readonly artifactType: "market-rental-economics-research";
  };
  readonly marketValueAnalysis: InputIdentity & {
    readonly artifactType: "market-value-analysis";
  };
  readonly marketGuideFindings: InputIdentity & {
    readonly artifactType: "market-guide-findings";
  };
  readonly checkoutIncome: InputIdentity & {
    readonly artifactType: "checkout-income";
  };
}

type MarketFilm = MarketValueAnalysis["films"][number];
type CompiledFilm = MarketRentalEconomics["films"][number];
type BaseBranch = CompiledFilm["rental"]["baseBranch"];

const baseBranchOrder = ["adult", "old", "default"] as const;

export function compileMarketRentalEconomics(
  research: MarketRentalEconomicsResearch,
  values: MarketValueAnalysis,
  findings: MarketGuideFindings,
  checkout: CheckoutIncome,
  sources: MarketRentalEconomicsInputSources,
): MarketRentalEconomics {
  assertInputs(research, values, findings, checkout, sources);

  const films = values.films
    .filter((film) => isReachable(film.marketSelection))
    .map((film) => compileFilm(film, research, checkout))
    .sort((left, right) => left.sku - right.sku);
  assertUniqueSkus(films);

  const rentalsRequired = films.map(
    (film) => film.exactChangeRecovery.rentalsRequired,
  );
  const exclusiveFilmCount = films.filter(
    (film) => film.rental.exclusiveSurchargeApplied,
  ).length;

  return MarketRentalEconomicsSchema.assert({
    artifactType: "market-rental-economics",
    build: research.build,
    sources,
    scope: "reachable-regular-market-film-acquisition-and-rental-recovery",
    evidenceLevel: "compiled-static-analysis",
    runtimeValidation: "not-run",
    classification: {
      regularFilmAvailabilityDay:
        research.classification.regularFilmAvailabilityDay,
      normalGameDayMinimum: research.classification.normalGameDayMinimum,
      newBranch: research.classification.new.regularMarketResult,
      basePricePriority: research.classification.basePricePriority,
      specialGenre: research.classification.specialGenre.normalizedGenre,
      oldReleaseCutoff: research.classification.old.cutoff,
      exclusiveRarity: research.classification.holographic.normalizedRarity,
      exclusiveAdjustment: research.classification.holographic.adjustment,
    },
    totals: {
      reachableFilmCount: films.length,
      byRoute: [
        {
          route: "ordinary",
          filmCount: countRoute(films, "ordinary"),
        },
        {
          route: "explicit-only",
          filmCount: countRoute(films, "explicit-only"),
        },
      ],
      byBaseBranch: baseBranchOrder.map((baseBranch) => {
        const matching = films.filter(
          (film) => film.rental.baseBranch === baseBranch,
        );
        return {
          baseBranch,
          filmCount: matching.length,
          exclusiveFilmCount: matching.filter(
            (film) => film.rental.exclusiveSurchargeApplied,
          ).length,
        };
      }),
      exclusiveFilmCount,
      oneRentalRecoveryCount: rentalsRequired.filter((count) => count === 1).length,
      minimumRentalsRequired: Math.min(...rentalsRequired),
      maximumRentalsRequired: Math.max(...rentalsRequired),
      averageRentalsRequired:
        rentalsRequired.reduce((total, count) => total + count, 0) /
        rentalsRequired.length,
    },
    distributions: {
      exactChangeRevenuePennies: compileDistribution(
        films.map((film) => film.rental.exactChangeRevenuePennies),
      ),
      rentalsRequired: compileDistribution(rentalsRequired),
    },
    films,
    guideClaimStatus: {
      perSkuAcquisitionCost: "eligible-with-build-limit",
      perRentalBill: "eligible-with-build-limit",
      exactChangeRecoveryCount: "eligible-with-build-limit",
      expectedRentalIncome: "unsupported-by-inputs",
      stockingRecommendation: "unsupported-by-inputs",
      recommendationLimit:
        "inputs-do-not-cover-rental-frequency-or-actual-change",
    },
  });
}

function assertInputs(
  research: MarketRentalEconomicsResearch,
  values: MarketValueAnalysis,
  findings: MarketGuideFindings,
  checkout: CheckoutIncome,
  sources: MarketRentalEconomicsInputSources,
): void {
  const inputs = [values, findings, checkout];
  if (
    inputs.some(
      (input) =>
        input.build.steamAppId !== research.build.steamAppId ||
        input.build.steamBuildId !== research.build.steamBuildId,
    )
  ) {
    throw new Error("Market rental-economics inputs are from different game builds.");
  }
  if (
    !identitiesMatch(
      findings.sources.marketValueAnalysis,
      sources.marketValueAnalysis,
    )
  ) {
    throw new Error(
      "Market guide findings are not linked to the value-analysis input.",
    );
  }
  if (
    !identitiesMatch(
      findings.sources.marketMechanics,
      values.sources.marketMechanics,
    )
  ) {
    throw new Error(
      "Market guide findings and value analysis are linked to different mechanics inputs.",
    );
  }
  if (
    sources.research.artifactType !== "market-rental-economics-research" ||
    sources.marketValueAnalysis.artifactType !== "market-value-analysis" ||
    sources.marketGuideFindings.artifactType !== "market-guide-findings" ||
    sources.checkoutIncome.artifactType !== "checkout-income"
  ) {
    throw new Error("Market rental-economics source artifact types changed.");
  }
  assertClassification(research, checkout);
  assertReachableCounts(values, findings);
}

function assertClassification(
  research: MarketRentalEconomicsResearch,
  checkout: CheckoutIncome,
): void {
  const classification = research.classification;
  if (
    classification.scope !== "regular-market-film-purchases" ||
    classification.productStructureTransfer !==
      "market-product-structure-passed-unchanged-to-spawned-cartridge" ||
    classification.regularFilmAvailabilityDay !== -999 ||
    classification.normalGameDayMinimum !== 0 ||
    classification.new.elapsedDays !==
      "days-passed-minus-available-in-game-day" ||
    classification.new.comparison !== "less-than-or-equal" ||
    classification.new.durationDays !== 7 ||
    classification.new.lowerBound !== "none" ||
    classification.new.regularMarketResult !== "false-on-normal-game-days" ||
    classification.old.comparison !== "release-date-less-than-or-equal" ||
    classification.old.cutoff !== "1940-12-29" ||
    classification.specialGenre.rawEnumValue !== 16 ||
    classification.specialGenre.displayLabel !== "Adult" ||
    classification.specialGenre.normalizedGenre !== "adult" ||
    classification.holographic.rawRarityValue !== 3 ||
    classification.holographic.normalizedRarity !== "exclusive" ||
    classification.holographic.adjustment !== "add-after-base-price"
  ) {
    throw new Error("Market rental classification research changed.");
  }
  if (
    classification.normalGameDayMinimum -
      classification.regularFilmAvailabilityDay <=
    classification.new.durationDays
  ) {
    throw new Error("Regular Market films can still enter the new-price branch.");
  }
  if (
    !arraysEqual(
      classification.basePricePriority,
      checkout.cartridgeRentalPricing.basePricePriority,
    ) ||
    checkout.cartridgeRentalPricing.specialGenre.rawEnumValue !==
      classification.specialGenre.rawEnumValue ||
    checkout.cartridgeRentalPricing.holographicAdjustment !==
      classification.holographic.adjustment ||
    checkout.income.exactChangeNetRevenue !== "bill"
  ) {
    throw new Error("Checkout rental-price classification changed.");
  }
}

function assertReachableCounts(
  values: MarketValueAnalysis,
  findings: MarketGuideFindings,
): void {
  const ordinary = values.films.filter(
    (film) => film.marketSelection === "ordinary-reachable",
  ).length;
  const explicitOnly = values.films.filter(
    (film) => film.marketSelection === "explicit-reachable",
  ).length;
  if (
    ordinary !== values.totals.ordinary.reachableFilmCount ||
    explicitOnly !== values.totals.explicitOnly.reachableFilmCount ||
    ordinary !== findings.selection.ordinary.reachableFilmCount ||
    explicitOnly !== findings.selection.explicitOnly.reachableFilmCount
  ) {
    throw new Error("Reachable Market film counts changed between inputs.");
  }
}

function compileFilm(
  film: MarketFilm,
  research: MarketRentalEconomicsResearch,
  checkout: CheckoutIncome,
): CompiledFilm {
  const baseBranch = classifyBaseBranch(film, research);
  const basePricePennies = readBasePrice(baseBranch, checkout);
  const exclusiveSurchargeApplied =
    film.rarity === research.classification.holographic.normalizedRarity;
  const exclusiveSurchargePennies = exclusiveSurchargeApplied
    ? checkout.cartridgeRentalPricing.holographicSurcharge.pricePennies
    : 0;
  const exactChangeRevenuePennies =
    basePricePennies + exclusiveSurchargePennies;
  if (exactChangeRevenuePennies <= 0) {
    throw new Error(`Film SKU ${film.sku} has nonpositive rental revenue.`);
  }
  const rentalsRequired = Math.ceil(
    film.price.totalPennies / exactChangeRevenuePennies,
  );
  const cumulativeRevenuePennies =
    rentalsRequired * exactChangeRevenuePennies;

  return {
    sku: film.sku,
    genre: film.genre,
    productName: film.productName,
    marketRoute:
      film.marketSelection === "ordinary-reachable"
        ? "ordinary"
        : "explicit-only",
    releaseDate: film.releaseDate,
    rarity: film.rarity,
    acquisitionCostPennies: film.price.totalPennies,
    rental: {
      baseBranch,
      basePricePennies,
      exclusiveSurchargeApplied,
      exclusiveSurchargePennies,
      exactChangeRevenuePennies,
    },
    exactChangeRecovery: {
      formula: "ceil-acquisition-cost-divided-by-rental-revenue",
      rentalsRequired,
      cumulativeRevenuePennies,
      surplusAfterRecoveryPennies:
        cumulativeRevenuePennies - film.price.totalPennies,
    },
    evidence: film.evidence,
  };
}

function classifyBaseBranch(
  film: MarketFilm,
  research: MarketRentalEconomicsResearch,
): BaseBranch {
  if (film.genre === research.classification.specialGenre.normalizedGenre) {
    return "adult";
  }
  if (film.releaseDate <= research.classification.old.cutoff) {
    return "old";
  }
  return "default";
}

function readBasePrice(
  baseBranch: BaseBranch,
  checkout: CheckoutIncome,
): number {
  if (baseBranch === "adult") {
    return checkout.cartridgeRentalPricing.specialGenre.price.pricePennies;
  }
  if (baseBranch === "old") {
    return checkout.cartridgeRentalPricing.old.pricePennies;
  }
  return checkout.cartridgeRentalPricing.default.pricePennies;
}

function compileDistribution(values: readonly number[]) {
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts]
    .sort(([left], [right]) => left - right)
    .map(([value, filmCount]) => ({ value, filmCount }));
}

function countRoute(
  films: readonly CompiledFilm[],
  route: CompiledFilm["marketRoute"],
): number {
  return films.filter((film) => film.marketRoute === route).length;
}

function assertUniqueSkus(films: readonly CompiledFilm[]): void {
  const skus = new Set<number>();
  for (const film of films) {
    if (skus.has(film.sku)) {
      throw new Error(`Reachable Market films contain duplicate SKU ${film.sku}.`);
    }
    skus.add(film.sku);
  }
}

function isReachable(selection: MarketFilm["marketSelection"]): boolean {
  return selection === "ordinary-reachable" || selection === "explicit-reachable";
}

function identitiesMatch(left: InputIdentity, right: InputIdentity): boolean {
  return (
    left.fileName === right.fileName &&
    left.sha256 === right.sha256 &&
    left.sizeBytes === right.sizeBytes
  );
}

function arraysEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export type MarketRentalEconomicsResearchSource = Extract<
  MarketRentalEconomicsSourceIdentity,
  { readonly artifactType: "market-rental-economics-research" }
>;
