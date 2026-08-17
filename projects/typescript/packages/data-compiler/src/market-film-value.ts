import type {
  FilmGenre,
  FilmRecord,
  MarketMechanics,
  MarketValueAnalysis,
} from "@neonretrorewind/core";

import { UnrealRandomStream } from "./unreal-random-stream.ts";

export type CompiledMarketFilm = MarketValueAnalysis["films"][number];
export type MarketSelection = CompiledMarketFilm["marketSelection"];
type Rarity = CompiledMarketFilm["rarity"];

export interface MarketRowSelection {
  readonly marketSelection: MarketSelection;
  readonly sourceRowIndex: number;
  readonly sourceRowCount: number;
}

const genreByMarketName = new Map<string, FilmGenre>([
  ["Action", "action"],
  ["Adult", "adult"],
  ["Adventure", "adventure"],
  ["Comedy", "comedy"],
  ["Drama", "drama"],
  ["Fantasy", "fantasy"],
  ["Horror", "horror"],
  ["Kid", "kid"],
  ["Police", "police"],
  ["Romance", "romance"],
  ["Sci-Fi", "sci-fi"],
  ["Western", "western"],
  ["Xmas", "xmas"],
]);

const marketNameByGenre = new Map(
  [...genreByMarketName].map(([marketName, filmGenre]) => [filmGenre, marketName]),
);

const rarityPriceKey = new Map<Rarity, string>([
  ["common", "Common"],
  ["rare", "Rare"],
  ["limited-edition", "Limited Edition"],
  ["exclusive", "Exclusive"],
]);

export function readFilmGenre(marketGenre: string): FilmGenre {
  const filmGenre = genreByMarketName.get(marketGenre);
  if (filmGenre === undefined) {
    throw new Error(`Unknown Market genre ${marketGenre}.`);
  }
  return filmGenre;
}

export function compileMarketFilmValue(
  film: FilmRecord,
  rowSelection: MarketRowSelection | undefined,
  mechanics: MarketMechanics,
): CompiledMarketFilm {
  if (rowSelection === undefined) {
    throw new Error(`Film SKU ${film.sku} has no Market row classification.`);
  }
  if (film.sku <= 0 || film.sku > 2_147_483_647) {
    throw new Error(`Film SKU ${film.sku} is not a positive signed 32-bit seed.`);
  }

  const dateStream = new UnrealRandomStream(film.sku);
  const year = drawDateComponent(dateStream, mechanics, "year");
  const day = drawDateComponent(dateStream, mechanics, "day");
  const month = drawDateComponent(dateStream, mechanics, "month");
  const releaseDate = formatDate(year, month, day);

  const rarityDraw = new UnrealRandomStream(film.sku).randRange(
    mechanics.generatedMovie.rarity.drawMinimum,
    mechanics.generatedMovie.rarity.drawMaximum,
  );
  const rarityBand = mechanics.generatedMovie.rarity.bands.find(
    (band) => rarityDraw >= band.minimumDraw && rarityDraw <= band.maximumDraw,
  );
  if (rarityBand === undefined) {
    throw new Error(`Rarity draw ${rarityDraw} is not covered for film SKU ${film.sku}.`);
  }
  const criticRemainder = film.sku % 100;
  const criticBand = mechanics.generatedMovie.criticScore.bands.find(
    (band) =>
      criticRemainder >= band.minimumRemainder &&
      criticRemainder <= band.maximumRemainder,
  );
  if (criticBand === undefined) {
    throw new Error(`Critic remainder ${criticRemainder} is not covered for film SKU ${film.sku}.`);
  }

  const seededRandomDraw = new UnrealRandomStream(film.sku).randRange(
    mechanics.moviePrice.seededRandom.drawMinimum,
    mechanics.moviePrice.seededRandom.drawMaximum,
  );
  const seededRandomPennies =
    Math.trunc(seededRandomDraw / mechanics.moviePrice.seededRandom.roundDownMultiple) *
    mechanics.moviePrice.seededRandom.roundDownMultiple;
  const marketGenre = marketNameByGenre.get(film.genre);
  const priceRarity = rarityPriceKey.get(rarityBand.rarity);
  if (marketGenre === undefined || priceRarity === undefined) {
    throw new Error(`Price mapping is missing for film SKU ${film.sku}.`);
  }
  const basePennies = mechanics.moviePrice.oldBasePennies;
  const criticBonusPennies = readNumericMap(
    mechanics.moviePrice.criticBonuses,
    criticBand.score.toString(),
    "critic bonus",
  );
  const genreBonusPennies = readOptionalNumericMap(
    mechanics.moviePrice.genreBonuses,
    marketGenre,
    mechanics.moviePrice.genreDefaultBonusPennies,
  );
  const rarityMultiplier = readNumericMap(
    mechanics.moviePrice.oldRarityMultipliers,
    priceRarity,
    "old-film rarity multiplier",
  );
  const ageMultiplier =
    releaseDate <= mechanics.moviePrice.ageBoundary
      ? mechanics.moviePrice.olderAgeMultiplier
      : mechanics.moviePrice.newerAgeMultiplier;
  const totalPennies = Math.trunc(
    (basePennies + criticBonusPennies + genreBonusPennies + seededRandomPennies) *
      rarityMultiplier *
      ageMultiplier,
  );
  if (!Number.isSafeInteger(totalPennies) || totalPennies < 0) {
    throw new Error(`Calculated price is invalid for film SKU ${film.sku}.`);
  }

  return {
    sku: film.sku,
    genre: film.genre,
    productName: film.productName,
    ...rowSelection,
    releaseDate,
    rarity: rarityBand.rarity,
    criticScore: criticBand.score,
    customerReviewScore: mechanics.generatedMovie.customerReviewScore,
    price: {
      currency: mechanics.moviePrice.currency,
      basePennies,
      criticBonusPennies,
      genreBonusPennies,
      seededRandomDraw,
      seededRandomPennies,
      rarityMultiplier,
      ageMultiplier,
      totalPennies,
    },
    evidence: film.evidence,
  };
}

function drawDateComponent(
  stream: UnrealRandomStream,
  mechanics: MarketMechanics,
  component: "year" | "day" | "month",
): number {
  const draws = mechanics.generatedMovie.releaseDate.draws.filter(
    (draw) => draw.component === component,
  );
  if (draws.length !== 1) {
    throw new Error(`Expected one generated movie ${component} draw.`);
  }
  return stream.randRange(draws[0]!.minimum, draws[0]!.maximum);
}

function formatDate(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function readNumericMap(
  entries: readonly Readonly<{ key: string; value: number }>[],
  key: string,
  label: string,
): number {
  const matches = entries.filter((entry) => entry.key === key);
  if (matches.length !== 1) {
    throw new Error(`Expected one ${label} for ${key}.`);
  }
  return matches[0]!.value;
}

function readOptionalNumericMap(
  entries: readonly Readonly<{ key: string; value: number }>[],
  key: string,
  defaultValue: number,
): number {
  const matches = entries.filter((entry) => entry.key === key);
  if (matches.length > 1) {
    throw new Error(`Duplicate genre bonus for ${key}.`);
  }
  return matches[0]?.value ?? defaultValue;
}
