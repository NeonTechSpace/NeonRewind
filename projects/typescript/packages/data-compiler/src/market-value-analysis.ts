import { isDeepStrictEqual } from "node:util";

import type {
  FilmCatalog,
  MarketMechanics,
  MarketValueAnalysis,
  StructuredValues,
} from "@neonretrorewind/core";
import { MarketValueAnalysisSchema } from "@neonretrorewind/core";

import {
  compileMarketFilmValue,
  type CompiledMarketFilm,
  type MarketRowSelection,
  type MarketSelection,
  readFilmGenre,
} from "./market-film-value.ts";
import {
  unrealRandomStreamSeedIncrement,
  unrealRandomStreamSeedMultiplier,
} from "./unreal-random-stream.ts";

interface InputIdentity {
  readonly fileName: string;
  readonly sha256: string;
  readonly sizeBytes: number;
}

export interface MarketValueInputSources {
  readonly filmCatalog: InputIdentity & { readonly artifactType: "film-catalog" };
  readonly marketMechanics: InputIdentity & {
    readonly artifactType: "market-mechanics";
  };
  readonly catalogStructuredValues: InputIdentity & {
    readonly artifactType: "structured-values";
  };
  readonly mechanicsStructuredValues: InputIdentity & {
    readonly artifactType: "structured-values";
  };
}

type StructuredValuesInput = Pick<
  StructuredValues,
  "artifactType" | "dataTables" | "engine"
> & {
  readonly build: Pick<StructuredValues["build"], "steamAppId" | "steamBuildId">;
};

type CandidateTable = MarketMechanics["candidates"]["tables"][number];
type Rarity = MarketValueAnalysis["films"][number]["rarity"];

const rarityOrder: readonly Rarity[] = [
  "common",
  "rare",
  "limited-edition",
  "exclusive",
];

export function compileMarketValueAnalysis(
  catalog: FilmCatalog,
  mechanics: MarketMechanics,
  catalogStructuredValues: StructuredValuesInput,
  mechanicsStructuredValues: StructuredValuesInput,
  sources: MarketValueInputSources,
): MarketValueAnalysis {
  assertInputs(
    catalog,
    mechanics,
    catalogStructuredValues,
    mechanicsStructuredValues,
    sources,
  );
  const rowSelections = classifyMarketRows(
    catalog,
    mechanics,
    catalogStructuredValues,
  );
  const films = catalog.films.map((film) =>
    compileMarketFilmValue(film, rowSelections.get(film.sku), mechanics),
  );
  const ordinaryReachable = films.filter(
    (film) => film.marketSelection === "ordinary-reachable",
  );

  const ordinaryTables = mechanics.candidates.tables.filter(
    (table) => table.selection === "ordinary",
  );
  const explicitTables = mechanics.candidates.tables.filter(
    (table) => table.selection === "explicit-only",
  );

  return MarketValueAnalysisSchema.assert({
    artifactType: "market-value-analysis",
    build: catalog.build,
    sources,
    scope: "regular-film-market-value",
    evidenceLevel: "compiled-static-analysis",
    randomStream: {
      engineVersion: "5.4",
      implementation: "FRandomStream",
      seedMultiplier: unrealRandomStreamSeedMultiplier,
      seedIncrement: unrealRandomStreamSeedIncrement,
      fractionConstruction: "float32-one-or-seed-shift-right-9-minus-one",
      integerRange: "truncate-float32-fraction-times-inclusive-range",
    },
    totals: {
      regularFilmCount: films.length,
      ordinary: summarizeSelection(ordinaryTables),
      explicitOnly: summarizeSelection(explicitTables),
    },
    films,
    summaries: {
      allRegularPrices: summarizePrices(films),
      ordinaryReachablePrices: summarizePrices(ordinaryReachable),
      byGenre: mechanics.candidates.tables.map((table) => {
        const filmGenre = readFilmGenre(table.genre);
        const reachable = films.filter((film) =>
          film.genre === filmGenre && film.marketSelection.endsWith("-reachable"),
        );
        return {
          genre: filmGenre,
          route: table.selection,
          sourceFilmCount: table.rowCount,
          reachableFilmCount: table.reachableRowCount,
          unreachableFinalRowCount: table.rowCount - table.reachableRowCount,
          reachablePrices: summarizePrices(reachable),
        };
      }),
      ordinaryReachableByRarity: rarityOrder.flatMap((rarity) => {
        const matching = ordinaryReachable.filter((film) => film.rarity === rarity);
        return matching.length === 0
          ? []
          : [{ rarity, reachablePrices: summarizePrices(matching) }];
      }),
    },
    bundleEconomics: {
      currency: "pennies",
      freeBundlePricePennies: mechanics.bundles.freePricePennies,
      nonFreeBySuccessfulMovieCount: compileBundleValues(mechanics),
    },
  });
}

function assertInputs(
  catalog: FilmCatalog,
  mechanics: MarketMechanics,
  catalogStructuredValues: StructuredValuesInput,
  mechanicsStructuredValues: StructuredValuesInput,
  sources: MarketValueInputSources,
): void {
  if (catalog.films.length !== catalog.totals.filmCount) {
    throw new Error("Film catalog total does not match its regular films.");
  }
  const builds = [
    catalog.build,
    mechanics.build,
    catalogStructuredValues.build,
    mechanicsStructuredValues.build,
  ];
  if (
    builds.some(
      (build) =>
        build.steamAppId !== catalog.build.steamAppId ||
        build.steamBuildId !== catalog.build.steamBuildId,
    )
  ) {
    throw new Error("Market value inputs are from different game builds.");
  }
  if (
    catalogStructuredValues.engine.version !== "5.4" ||
    mechanicsStructuredValues.engine.version !== "5.4"
  ) {
    throw new Error("Market value analysis requires Unreal Engine 5.4.");
  }
  if (!identitiesMatch(catalog.source, sources.catalogStructuredValues)) {
    throw new Error("Film catalog is not linked to the structured-values input.");
  }
  const mechanicsStructuredSources = mechanics.sources.evidence.filter(
    (source) => source.artifactType === "structured-values",
  );
  if (
    mechanicsStructuredSources.length !== 1 ||
    !identitiesMatch(
      mechanicsStructuredSources[0]!,
      sources.mechanicsStructuredValues,
    )
  ) {
    throw new Error("Market mechanics are not linked to the structured-values input.");
  }
  if (
    !isDeepStrictEqual(
      catalogStructuredValues.dataTables,
      mechanicsStructuredValues.dataTables,
    )
  ) {
    throw new Error("Catalog and Market structured-values tables differ.");
  }
  if (mechanics.generatedMovie.releaseDate.priceFormulaBranch !== "old-film") {
    throw new Error("Regular generated films no longer use only the old-film formula.");
  }
  if (
    sources.filmCatalog.artifactType !== "film-catalog" ||
    sources.marketMechanics.artifactType !== "market-mechanics" ||
    sources.catalogStructuredValues.artifactType !== "structured-values" ||
    sources.mechanicsStructuredValues.artifactType !== "structured-values"
  ) {
    throw new Error("Market value source artifact types changed.");
  }
}

function identitiesMatch(left: InputIdentity, right: InputIdentity): boolean {
  return (
    left.fileName === right.fileName &&
    left.sha256 === right.sha256 &&
    left.sizeBytes === right.sizeBytes
  );
}

function classifyMarketRows(
  catalog: FilmCatalog,
  mechanics: MarketMechanics,
  structuredValues: StructuredValuesInput,
): ReadonlyMap<number, MarketRowSelection> {
  if (mechanics.candidates.tables.length !== catalog.totals.genreCount) {
    throw new Error("Market candidate tables do not cover every catalog genre.");
  }
  const result = new Map<number, MarketRowSelection>();
  let ordinarySourceCount = 0;
  let ordinaryReachableCount = 0;

  for (const candidateTable of mechanics.candidates.tables) {
    const filmGenre = readFilmGenre(candidateTable.genre);
    const catalogFilms = catalog.films.filter((film) => film.genre === filmGenre);
    if (catalogFilms.length !== candidateTable.rowCount) {
      throw new Error(`Catalog count changed for Market genre ${candidateTable.genre}.`);
    }
    const tablePaths = new Set(catalogFilms.map((film) => film.evidence.tablePath));
    if (tablePaths.size !== 1) {
      throw new Error(`Catalog genre ${candidateTable.genre} spans multiple source tables.`);
    }
    const tablePath = catalogFilms[0]?.evidence.tablePath;
    const sourceTables = structuredValues.dataTables.filter(
      (table) => table.path === tablePath,
    );
    if (sourceTables.length !== 1) {
      throw new Error(`Expected one structured source table for ${candidateTable.genre}.`);
    }
    const sourceTable = sourceTables[0]!;
    if (sourceTable.rows.length !== candidateTable.rowCount) {
      throw new Error(`Structured row count changed for Market genre ${candidateTable.genre}.`);
    }
    if (
      candidateTable.reachableRowCount !==
      candidateTable.rowCount - mechanics.candidates.excludedRowPerTable
    ) {
      throw new Error(`Reachable row count changed for Market genre ${candidateTable.genre}.`);
    }
    const filmByRowKey = new Map(
      catalogFilms.map((film) => [film.evidence.rowKey, film]),
    );
    if (filmByRowKey.size !== catalogFilms.length) {
      throw new Error(`Duplicate catalog row key for Market genre ${candidateTable.genre}.`);
    }
    sourceTable.rows.forEach((row, sourceRowIndex) => {
      const film = filmByRowKey.get(row.key);
      if (film === undefined) {
        throw new Error(`Structured row is missing from catalog genre ${candidateTable.genre}.`);
      }
      const reachable = sourceRowIndex < candidateTable.reachableRowCount;
      const marketSelection = readMarketSelection(candidateTable, reachable);
      result.set(film.sku, {
        marketSelection,
        sourceRowIndex,
        sourceRowCount: sourceTable.rows.length,
      });
      filmByRowKey.delete(row.key);
    });
    if (filmByRowKey.size !== 0) {
      throw new Error(`Catalog rows are missing from source genre ${candidateTable.genre}.`);
    }
    if (candidateTable.selection === "ordinary") {
      ordinarySourceCount += candidateTable.rowCount;
      ordinaryReachableCount += candidateTable.reachableRowCount;
    }
  }
  if (
    result.size !== catalog.films.length ||
    ordinarySourceCount !== mechanics.candidates.ordinarySourceRowCount ||
    ordinaryReachableCount !== mechanics.candidates.ordinaryReachableRowCount
  ) {
    throw new Error("Market candidate totals do not match the film catalog.");
  }
  return result;
}

function readMarketSelection(
  table: CandidateTable,
  reachable: boolean,
): MarketSelection {
  if (table.selection === "ordinary") {
    return reachable ? "ordinary-reachable" : "ordinary-unreachable-final-row";
  }
  return reachable ? "explicit-reachable" : "explicit-unreachable-final-row";
}

function summarizeSelection(tables: readonly CandidateTable[]) {
  const sourceFilmCount = sum(tables.map((table) => table.rowCount));
  const reachableFilmCount = sum(tables.map((table) => table.reachableRowCount));
  const unreachableFinalRowCount = sourceFilmCount - reachableFilmCount;
  return { sourceFilmCount, reachableFilmCount, unreachableFinalRowCount };
}

function summarizePrices(films: readonly CompiledMarketFilm[]) {
  if (films.length === 0) {
    throw new Error("Cannot summarize an empty film group.");
  }
  const prices = films.map((film) => film.price.totalPennies);
  const totalPricePennies = sum(prices);
  return {
    filmCount: films.length,
    totalPricePennies,
    minimumPricePennies: Math.min(...prices),
    maximumPricePennies: Math.max(...prices),
    averagePricePennies: totalPricePennies / films.length,
  };
}

function compileBundleValues(mechanics: MarketMechanics) {
  const maximumSuccessfulMovies = Math.max(
    ...mechanics.bundles.sizeDistribution.map((entry) => entry.value),
  );
  const targetProbability = new Map(
    mechanics.bundles.sizeDistribution.map((entry) => [entry.value, entry.probability]),
  );
  const values = [];
  let previousPrice = readBundlePrice(mechanics, 0);
  let previousCostPerMovie: number | undefined;
  for (let count = 1; count <= maximumSuccessfulMovies; count += 1) {
    const bundlePricePennies = readBundlePrice(mechanics, count);
    const additionalBundlePriceFromPreviousCountPennies =
      bundlePricePennies - previousPrice;
    if (additionalBundlePriceFromPreviousCountPennies < 0) {
      throw new Error("Bundle prices decrease as successful movie count increases.");
    }
    const pricePerSuccessfulMoviePennies = bundlePricePennies / count;
    const costPerMovieTrend = previousCostPerMovie === undefined
      ? "first"
      : pricePerSuccessfulMoviePennies < previousCostPerMovie
        ? "lower"
        : pricePerSuccessfulMoviePennies > previousCostPerMovie
          ? "higher"
          : "unchanged";
    values.push({
      successfulMovieCount: count,
      configuredTargetProbability: targetProbability.get(count) ?? null,
      bundlePricePennies,
      pricePerSuccessfulMoviePennies,
      additionalBundlePriceFromPreviousCountPennies,
      costPerMovieTrend,
    });
    previousPrice = bundlePricePennies;
    previousCostPerMovie = pricePerSuccessfulMoviePennies;
  }
  return values;
}

function readBundlePrice(mechanics: MarketMechanics, successfulMovies: number): number {
  const tiers = mechanics.bundles.priceTiers.filter(
    (tier) =>
      successfulMovies >= tier.minimumSuccessfulMovies &&
      (tier.maximumSuccessfulMovies === null ||
        successfulMovies <= tier.maximumSuccessfulMovies),
  );
  if (tiers.length !== 1) {
    throw new Error(`Expected one bundle price tier for ${successfulMovies} movies.`);
  }
  const tier = tiers[0]!;
  return tier.priceRule === "fixed"
    ? tier.pricePennies
    : successfulMovies * tier.pricePennies;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
