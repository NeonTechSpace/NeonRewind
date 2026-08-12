import { type } from "arktype";

const $definitionSourceIdentity = type({
  fileName: type("string").atLeastLength(1),
  sha256: type("string").matching(new RegExp("^[0-9a-f]{64}$")),
  sizeBytes: type("number.integer").atLeast(0),
  artifactType: type.unit("structured-values"),
  "+": "reject",
}).readonly();
const $definitionEvidence = type({
  kind: type.unit("data-table"),
  tablePath: type("string").atLeastLength(1),
  rowKey: type("string").atLeastLength(1),
  "+": "reject",
}).readonly();
const $definitionFilm = type({
  sku: type("number.integer")
    .atLeast(-9007199254740991)
    .atMost(9007199254740991),
  genre: type.enumerated(
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
  ),
  productName: type("string").atLeastLength(1),
  subjectName: type("string").atLeastLength(1),
  backgroundImage: type("string").atLeastLength(1),
  subjectImage: type("string").atLeastLength(1),
  colorPalette: type("string").atLeastLength(1),
  layoutStyle: type("number.integer")
    .atLeast(-9007199254740991)
    .atMost(9007199254740991),
  layoutStyleColor: type("number.integer")
    .atLeast(-9007199254740991)
    .atMost(9007199254740991),
  subjectPlacement: type("string").atLeastLength(1),
  newToUnlock: type("boolean"),
  evidence: $definitionEvidence,
  "+": "reject",
}).readonly();

export const FilmCatalogSchema = type({
  artifactType: type.unit("film-catalog"),
  build: type({
    steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
    steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
    "+": "reject",
  }).readonly(),
  source: $definitionSourceIdentity,
  totals: type({
    sourceFilmTableCount: type("number.integer").atLeast(0),
    catalogTableCount: type("number.integer").atLeast(0),
    excludedTableCount: type("number.integer").atLeast(0),
    genreCount: type("number.integer").atLeast(0),
    filmCount: type("number.integer").atLeast(0),
    "+": "reject",
  }).readonly(),
  films: $definitionFilm.array().readonly(),
  "+": "reject",
}).readonly();
export type FilmCatalog = typeof FilmCatalogSchema.infer;

export const filmGenres = [
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
] as const;
export type FilmGenre = FilmCatalog["films"][number]["genre"];
export type AcquisitionArtifactIdentity = FilmCatalog["source"];
export type FilmRecord = FilmCatalog["films"][number];
export type FilmEvidence = FilmRecord["evidence"];
