import {
  MarketMechanicsSchema,
  type MarketMechanics,
  type MarketMechanicsResearch,
  type MarketMechanicsSourceIdentity,
} from "@neonretrorewind/core";

export function compileMarketMechanics(
  research: MarketMechanicsResearch,
  researchSource: MarketMechanicsSourceIdentity,
): MarketMechanics {
  assertResearch(research);

  const tables = research.candidates.tables.map((table) => ({
    ...table,
    reachableRowCount: table.rowCount - 1,
  }));
  const ordinaryTables = tables.filter((table) => table.selection === "ordinary");

  return MarketMechanicsSchema.assert({
    artifactType: "market-mechanics",
    build: research.build,
    sources: {
      research: researchSource,
      evidence: research.evidence,
    },
    scope: "daily-movie-market",
    evidenceLevel: "curated-static-analysis",
    runtimeValidation: research.runtimeValidation,
    daily: {
      savedMarket: research.daily.savedMarket,
      movies: {
        generatorCalls: research.daily.ordinaryMovieGeneratorCalls,
        attemptCountDistribution: compileFreshBoundDistribution(
          research.daily.movieAttempts,
        ),
        successfulAttempt: research.daily.successfulMovieAttempt,
        clearing: research.daily.clearing.movies,
      },
      bundles: {
        generatorCalls: research.daily.ordinaryBundleGeneratorCalls,
        countDistribution: compileFreshBoundDistribution(
          research.daily.bundleCount,
        ),
        completedBundle: research.daily.completedBundle,
        firstSaveDayCalls: research.daily.firstSaveDayBundleCalls,
        positivePriceClearing: research.daily.clearing.positivePriceBundles,
        nonpositivePriceClearing: research.daily.clearing.nonpositivePriceBundles,
      },
    },
    candidates: {
      ordinaryFallbackGenres: research.candidates.ordinaryFallbackGenres,
      excludedRowPerTable: 1,
      ordinarySourceRowCount: sum(ordinaryTables.map((table) => table.rowCount)),
      ordinaryReachableRowCount: sum(
        ordinaryTables.map((table) => table.reachableRowCount),
      ),
      tables,
    },
    bundles: {
      sizeDistribution: compileSizeDistribution(research),
      priceTiers: research.bundles.priceTiers,
      freePricePennies: research.bundles.freePricePennies,
    },
    generatedMovie: compileGeneratedMovie(research),
    moviePrice: research.moviePrice,
    purchases: research.purchases,
  });
}

function assertResearch(research: MarketMechanicsResearch): void {
  const evidenceNames = research.evidence.map((source) => source.fileName);
  if (new Set(evidenceNames).size !== evidenceNames.length) {
    throw new Error("Market research contains duplicate evidence filenames.");
  }
  if (research.daily.movieAttempts.minimum >= research.daily.movieAttempts.maximum) {
    throw new Error("Movie attempt bounds are not increasing.");
  }
  if (
    research.daily.bundleCount.minimum >= research.daily.bundleCount.maximum ||
    research.daily.bundleCount.counterStart !== research.daily.bundleCount.minimum
  ) {
    throw new Error("Bundle count loop does not start at its minimum bound.");
  }
  if (
    research.candidates.randomIndexInput !== "row-count-minus-one" ||
    research.candidates.randomIndexSemantics !== "zero-inclusive-input-exclusive"
  ) {
    throw new Error("Candidate row exclusion evidence changed.");
  }
  assertBandsCoverRange(
    research.bundles.sizeBands,
    research.bundles.sizeDrawMinimum,
    research.bundles.sizeDrawMaximum,
    "Bundle-size",
  );
  assertPriceTiers(research.bundles.priceTiers);
  assertGeneratedMovie(research);
}

function compileGeneratedMovie(research: MarketMechanicsResearch) {
  const [year, day, month] = research.generatedMovie.releaseDate.draws;
  if (year === undefined || day === undefined || month === undefined) {
    throw new Error("Generated movie date draws are incomplete.");
  }
  const earliest = formatDate(year.minimum, month.minimum, day.minimum);
  const latest = formatDate(year.maximum, month.maximum, day.maximum);
  const boundary = research.moviePrice.dateBoundary;
  const priceFormulaBranch = latest < boundary
    ? "old-film"
    : earliest >= boundary
      ? "modern-film"
      : "mixed";

  return {
    source: research.generatedMovie.source,
    skuSource: research.generatedMovie.skuSource,
    releaseDate: {
      ...research.generatedMovie.releaseDate,
      earliest,
      latest,
      priceFormulaBranch,
    },
    rarity: research.generatedMovie.rarity,
    criticScore: research.generatedMovie.criticScore,
    customerReviewScore: research.generatedMovie.customerReviewScore,
  } as const;
}

function assertGeneratedMovie(research: MarketMechanicsResearch): void {
  const draws = research.generatedMovie.releaseDate.draws;
  if (
    draws.length !== 3 ||
    draws[0]?.component !== "year" ||
    draws[1]?.component !== "day" ||
    draws[2]?.component !== "month"
  ) {
    throw new Error("Generated movie date draw order changed.");
  }
  for (const draw of draws) {
    if (draw.minimum > draw.maximum) {
      throw new Error(`Generated movie ${draw.component} bounds are inverted.`);
    }
  }
  const day = draws[1];
  const month = draws[2];
  const year = draws[0];
  if (
    year === undefined || year.minimum < 1 || year.maximum > 9999 ||
    day === undefined || day.minimum < 1 || day.maximum > 28 ||
    month === undefined || month.minimum < 1 || month.maximum > 12
  ) {
    throw new Error("Generated movie date bounds do not guarantee valid dates.");
  }

  assertBandsCoverRange(
    research.generatedMovie.rarity.bands.map((band) => ({
      minimumDraw: band.minimumDraw,
      maximumDraw: band.maximumDraw,
    })),
    research.generatedMovie.rarity.drawMinimum,
    research.generatedMovie.rarity.drawMaximum,
    "Generated movie rarity",
  );
  const expectedRarities = new Map([
    ["common", 0],
    ["rare", 1],
    ["limited-edition", 2],
    ["exclusive", 3],
  ]);
  for (const band of research.generatedMovie.rarity.bands) {
    if (expectedRarities.get(band.rarity) !== band.enumValue) {
      throw new Error(`Generated movie rarity mapping changed for ${band.rarity}.`);
    }
    expectedRarities.delete(band.rarity);
  }
  if (expectedRarities.size !== 0) {
    throw new Error("Generated movie rarity bands are incomplete.");
  }
  if (
    research.generatedMovie.rarity.bands[0]?.rarity !== "exclusive" ||
    research.generatedMovie.rarity.bands[0]?.maximumDraw !==
      research.generatedMovie.rarity.effectiveExclusiveThreshold
  ) {
    throw new Error("Generated movie exclusive threshold changed.");
  }

  let expectedRemainder = 0;
  const scores = new Set<number>();
  for (const band of research.generatedMovie.criticScore.bands) {
    if (
      band.minimumRemainder !== expectedRemainder ||
      band.maximumRemainder < band.minimumRemainder
    ) {
      throw new Error("Generated movie critic-score bands are not contiguous.");
    }
    expectedRemainder = band.maximumRemainder + 1;
    scores.add(band.score);
  }
  if (
    expectedRemainder !== 100 ||
    scores.size !== 11 ||
    [...scores].some((score) => score < 0 || score > 10)
  ) {
    throw new Error("Generated movie critic-score bands are incomplete.");
  }
}

function formatDate(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function compileFreshBoundDistribution(loop: {
  readonly minimum: number;
  readonly maximum: number;
  readonly counterStart: number;
}): readonly { readonly value: number; readonly probability: number }[] {
  const width = loop.maximum - loop.minimum + 1;
  let survival = 1;
  const distribution: { value: number; probability: number }[] = [];
  for (let counter = loop.counterStart; counter <= loop.maximum; counter += 1) {
    const pass = counter <= loop.minimum
      ? 1
      : (loop.maximum - counter + 1) / width;
    const attemptsAfterPass = counter - loop.counterStart + 1;
    const nextCounter = counter + 1;
    const nextFail = nextCounter > loop.maximum
      ? 1
      : (nextCounter - loop.minimum) / width;
    survival *= pass;
    distribution.push({ value: attemptsAfterPass, probability: survival * nextFail });
  }
  return distribution.filter((entry) => entry.probability > 0);
}

function compileSizeDistribution(
  research: MarketMechanicsResearch,
): readonly { readonly value: number; readonly probability: number }[] {
  const drawCount = research.bundles.sizeDrawMaximum -
    research.bundles.sizeDrawMinimum + 1;
  return research.bundles.sizeBands.map((band) => ({
    value: band.movieAttempts,
    probability: (band.maximumDraw - band.minimumDraw + 1) / drawCount,
  }));
}

function assertBandsCoverRange(
  bands: readonly {
    readonly minimumDraw: number;
    readonly maximumDraw: number;
  }[],
  minimum: number,
  maximum: number,
  label: string,
): void {
  let expected = minimum;
  for (const band of bands) {
    if (band.minimumDraw !== expected || band.maximumDraw < band.minimumDraw) {
      throw new Error(`${label} bands are not contiguous.`);
    }
    expected = band.maximumDraw + 1;
  }
  if (expected !== maximum + 1) {
    throw new Error(`${label} bands do not cover the complete draw range.`);
  }
}

function assertPriceTiers(
  tiers: MarketMechanicsResearch["bundles"]["priceTiers"],
): void {
  let expected = 0;
  for (const [index, tier] of tiers.entries()) {
    if (tier.minimumSuccessfulMovies !== expected) {
      throw new Error("Bundle price tiers are not contiguous.");
    }
    if (tier.maximumSuccessfulMovies === null) {
      if (
        index !== tiers.length - 1 ||
        tier.priceRule !== "successful-movie-count-times-price"
      ) {
        throw new Error("Only the final bundle price tier can be unbounded.");
      }
      return;
    }
    if (tier.priceRule !== "fixed") {
      throw new Error("Bounded bundle price tiers must use fixed prices.");
    }
    if (tier.maximumSuccessfulMovies < tier.minimumSuccessfulMovies) {
      throw new Error("Bundle price tier has an inverted range.");
    }
    expected = tier.maximumSuccessfulMovies + 1;
  }
  throw new Error("Bundle price tiers require an unbounded final tier.");
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
