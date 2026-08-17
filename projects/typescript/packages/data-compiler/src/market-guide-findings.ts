import type {
  MarketGuideFindings,
  MarketMechanics,
  MarketValueAnalysis,
} from "@neonretrorewind/core";
import { MarketGuideFindingsSchema } from "@neonretrorewind/core";

interface InputIdentity {
  readonly fileName: string;
  readonly sha256: string;
  readonly sizeBytes: number;
}

export interface MarketGuideFindingsInputSources {
  readonly marketMechanics: InputIdentity & {
    readonly artifactType: "market-mechanics";
  };
  readonly marketValueAnalysis: InputIdentity & {
    readonly artifactType: "market-value-analysis";
  };
}

type MarketFilm = MarketValueAnalysis["films"][number];
type PriceSummary = MarketValueAnalysis["summaries"]["ordinaryReachablePrices"];
type DistributionEntry = MarketMechanics["daily"]["movies"][
  "attemptCountDistribution"
][number];

export function compileMarketGuideFindings(
  mechanics: MarketMechanics,
  values: MarketValueAnalysis,
  sources: MarketGuideFindingsInputSources,
): MarketGuideFindings {
  assertInputs(mechanics, values, sources);

  const ordinaryReachable = values.films.filter(
    (film) => film.marketSelection === "ordinary-reachable",
  );
  const ordinaryExcluded = values.films.filter(
    (film) => film.marketSelection === "ordinary-unreachable-final-row",
  );
  const explicitExcluded = values.films.filter(
    (film) => film.marketSelection === "explicit-unreachable-final-row",
  );
  const configuredMovieAttemptTargets = [...mechanics.bundles.sizeDistribution]
    .sort((left, right) => left.value - right.value)
    .map(
      (target) => {
        const value = requireBundleValue(values, target.value);
        if (
          !approximatelyEqual(
            value.configuredTargetProbability,
            target.probability,
          )
        ) {
          throw new Error(
            `Bundle target probability changed for ${target.value} attempts.`,
          );
        }
        return {
          movieAttemptCount: target.value,
          probability: target.probability,
          allAttemptsSuccessful: {
            successfulMovieCount: target.value,
            bundlePricePennies: value.bundlePricePennies,
            pricePerMoviePennies: value.pricePerSuccessfulMoviePennies,
            ordinaryPriceComparison: compareOrdinaryPrices(
              ordinaryReachable,
              value.pricePerSuccessfulMoviePennies,
            ),
          },
        };
      },
    );
  const lowestConfiguredFullSuccessUnitCost = configuredMovieAttemptTargets.reduce(
    (best, candidate) =>
      candidate.allAttemptsSuccessful.pricePerMoviePennies <
      best.allAttemptsSuccessful.pricePerMoviePennies
        ? candidate
        : best,
  );

  return MarketGuideFindingsSchema.assert({
    artifactType: "market-guide-findings",
    build: mechanics.build,
    sources,
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
      savedStock: mechanics.daily.savedMarket,
      regularMovieAttempts: summarizeDistribution(
        mechanics.daily.movies.attemptCountDistribution,
      ),
      paidBundleOffers: summarizeDistribution(
        mechanics.daily.bundles.countDistribution,
      ),
      firstSaveDayBundleCalls: mechanics.daily.bundles.firstSaveDayCalls,
      clearing: {
        regularMovies: mechanics.daily.movies.clearing,
        positivePriceBundles: mechanics.daily.bundles.positivePriceClearing,
        nonpositivePriceBundles: mechanics.daily.bundles.nonpositivePriceClearing,
      },
    },
    selection: {
      excludedFinalRowPerTable: mechanics.candidates.excludedRowPerTable,
      ordinary: {
        ...values.totals.ordinary,
        unreachableFinalRows: ordinaryExcluded.map(readExcludedFilm),
      },
      explicitOnly: {
        ...values.totals.explicitOnly,
        unreachableFinalRows: explicitExcluded.map(readExcludedFilm),
      },
    },
    individualPricing: {
      currency: mechanics.moviePrice.currency,
      generatedPriceBranch: mechanics.generatedMovie.releaseDate.priceFormulaBranch,
      seededBy: mechanics.moviePrice.seededRandom.seed,
      ordinaryReachable: values.summaries.ordinaryReachablePrices,
      byGenre: values.summaries.byGenre,
      ordinaryReachableByRarity: values.summaries.ordinaryReachableByRarity,
    },
    bundleEconomics: {
      currency: values.bundleEconomics.currency,
      configuredMovieAttemptTargets,
      underfilledTierJumps: compileTierJumps(values),
      lowestConfiguredFullSuccessUnitCost: {
        movieAttemptCount: lowestConfiguredFullSuccessUnitCost.movieAttemptCount,
        pricePerMoviePennies:
          lowestConfiguredFullSuccessUnitCost.allAttemptsSuccessful.pricePerMoviePennies,
      },
    },
    purchases: {
      individualMovie: mechanics.purchases.movie,
      bundle: mechanics.purchases.bundle,
    },
  });
}

function assertInputs(
  mechanics: MarketMechanics,
  values: MarketValueAnalysis,
  sources: MarketGuideFindingsInputSources,
): void {
  if (
    mechanics.build.steamAppId !== values.build.steamAppId ||
    mechanics.build.steamBuildId !== values.build.steamBuildId
  ) {
    throw new Error("Market guide inputs are from different game builds.");
  }
  if (!identitiesMatch(values.sources.marketMechanics, sources.marketMechanics)) {
    throw new Error("Market value analysis is not linked to the mechanics input.");
  }
  if (
    sources.marketMechanics.artifactType !== "market-mechanics" ||
    sources.marketValueAnalysis.artifactType !== "market-value-analysis"
  ) {
    throw new Error("Market guide source artifact types changed.");
  }
  if (
    values.totals.regularFilmCount !== values.films.length ||
    values.totals.ordinary.sourceFilmCount !==
      mechanics.candidates.ordinarySourceRowCount ||
    values.totals.ordinary.reachableFilmCount !==
      mechanics.candidates.ordinaryReachableRowCount
  ) {
    throw new Error("Market guide candidate totals do not match.");
  }

  const ordinaryReachable = values.films.filter(
    (film) => film.marketSelection === "ordinary-reachable",
  );
  const ordinaryExcluded = values.films.filter(
    (film) => film.marketSelection === "ordinary-unreachable-final-row",
  );
  const explicitReachable = values.films.filter(
    (film) => film.marketSelection === "explicit-reachable",
  );
  const explicitExcluded = values.films.filter(
    (film) => film.marketSelection === "explicit-unreachable-final-row",
  );
  if (
    ordinaryReachable.length !== values.totals.ordinary.reachableFilmCount ||
    ordinaryExcluded.length !== values.totals.ordinary.unreachableFinalRowCount ||
    explicitReachable.length !== values.totals.explicitOnly.reachableFilmCount ||
    explicitExcluded.length !== values.totals.explicitOnly.unreachableFinalRowCount
  ) {
    throw new Error("Market guide film classifications do not match their totals.");
  }
  assertPriceSummary(
    values.summaries.ordinaryReachablePrices,
    ordinaryReachable,
    "ordinary reachable",
  );
  assertDistribution(mechanics.daily.movies.attemptCountDistribution, "movie attempts");
  assertDistribution(mechanics.daily.bundles.countDistribution, "bundle offers");
  assertDistribution(mechanics.bundles.sizeDistribution, "bundle targets");

  const maximumTarget = Math.max(
    ...mechanics.bundles.sizeDistribution.map((entry) => entry.value),
  );
  if (values.bundleEconomics.nonFreeBySuccessfulMovieCount.length < maximumTarget) {
    throw new Error("Market value analysis does not cover every bundle target.");
  }
  if (
    values.bundleEconomics.freeBundlePricePennies !== mechanics.bundles.freePricePennies
  ) {
    throw new Error("Market guide free-bundle price changed between inputs.");
  }
}

function identitiesMatch(left: InputIdentity, right: InputIdentity): boolean {
  return (
    left.fileName === right.fileName &&
    left.sha256 === right.sha256 &&
    left.sizeBytes === right.sizeBytes
  );
}

function summarizeDistribution(entries: readonly DistributionEntry[]) {
  const values = entries.map((entry) => entry.value);
  return {
    minimum: Math.min(...values),
    maximum: Math.max(...values),
    expected: entries.reduce(
      (total, entry) => total + entry.value * entry.probability,
      0,
    ),
    distribution: entries,
  };
}

function assertDistribution(
  entries: readonly DistributionEntry[],
  label: string,
): void {
  const values = new Set(entries.map((entry) => entry.value));
  const probabilityTotal = entries.reduce(
    (total, entry) => total + entry.probability,
    0,
  );
  if (values.size !== entries.length) {
    throw new Error(`Market guide ${label} contain duplicate values.`);
  }
  if (!approximatelyEqual(probabilityTotal, 1)) {
    throw new Error(`Market guide ${label} probabilities do not total one.`);
  }
}

function assertPriceSummary(
  summary: PriceSummary,
  films: readonly MarketFilm[],
  label: string,
): void {
  const prices = films.map((film) => film.price.totalPennies);
  const total = prices.reduce((sum, price) => sum + price, 0);
  if (
    summary.filmCount !== films.length ||
    summary.totalPricePennies !== total ||
    summary.minimumPricePennies !== Math.min(...prices) ||
    summary.maximumPricePennies !== Math.max(...prices) ||
    summary.averagePricePennies !== total / films.length
  ) {
    throw new Error(`Market guide ${label} price summary does not match its films.`);
  }
}

function readExcludedFilm(film: MarketFilm) {
  return {
    sku: film.sku,
    genre: film.genre,
    productName: film.productName,
    sourceRowIndex: film.sourceRowIndex,
    sourceRowCount: film.sourceRowCount,
    pricePennies: film.price.totalPennies,
  };
}

function compareOrdinaryPrices(
  films: readonly MarketFilm[],
  bundlePricePerMovie: number,
) {
  const individualPriceLowerCount = films.filter(
    (film) => film.price.totalPennies < bundlePricePerMovie,
  ).length;
  const individualPriceEqualCount = films.filter(
    (film) => film.price.totalPennies === bundlePricePerMovie,
  ).length;
  const individualPriceHigherCount =
    films.length - individualPriceLowerCount - individualPriceEqualCount;
  return {
    ordinaryReachableFilmCount: films.length,
    individualPriceLowerCount,
    individualPriceEqualCount,
    individualPriceHigherCount,
    individualPriceLowerProportion: individualPriceLowerCount / films.length,
    individualPriceEqualProportion: individualPriceEqualCount / films.length,
    individualPriceHigherProportion: individualPriceHigherCount / films.length,
  };
}

function requireBundleValue(values: MarketValueAnalysis, successfulMovieCount: number) {
  const matches = values.bundleEconomics.nonFreeBySuccessfulMovieCount.filter(
    (value) => value.successfulMovieCount === successfulMovieCount,
  );
  if (matches.length !== 1) {
    throw new Error(`Expected one bundle value for ${successfulMovieCount} movies.`);
  }
  return matches[0]!;
}

function compileTierJumps(values: MarketValueAnalysis) {
  return values.bundleEconomics.nonFreeBySuccessfulMovieCount.flatMap(
    (current, index, entries) => {
      if (current.costPerMovieTrend !== "higher") {
        return [];
      }
      const previous = entries[index - 1];
      if (
        previous === undefined ||
        current.successfulMovieCount !== previous.successfulMovieCount + 1
      ) {
        throw new Error("Bundle tier jump is missing its preceding successful count.");
      }
      return [
        {
          previousSuccessfulMovieCount: previous.successfulMovieCount,
          successfulMovieCount: current.successfulMovieCount,
          previousBundlePricePennies: previous.bundlePricePennies,
          bundlePricePennies: current.bundlePricePennies,
          bundlePriceIncreasePennies:
            current.bundlePricePennies - previous.bundlePricePennies,
          previousPricePerMoviePennies: previous.pricePerSuccessfulMoviePennies,
          pricePerMoviePennies: current.pricePerSuccessfulMoviePennies,
          pricePerMovieIncreasePennies:
            current.pricePerSuccessfulMoviePennies -
            previous.pricePerSuccessfulMoviePennies,
        },
      ];
    },
  );
}

function approximatelyEqual(left: number | null, right: number): boolean {
  return left !== null && Math.abs(left - right) <= 1e-12;
}
