// Generated from src/contracts/domain/film-catalog.ts by pnpm contracts:generate. Do not edit.

export interface FilmCatalogContract {
  artifactType: "film-catalog";
  build: {
    steamAppId: string;
    steamBuildId: string;
  };
  source: SourceIdentity;
  totals: {
    sourceFilmTableCount: number;
    catalogTableCount: number;
    excludedTableCount: number;
    genreCount: number;
    filmCount: number;
  };
  films: Film[];
}
export interface SourceIdentity {
  fileName: string;
  sha256: string;
  sizeBytes: number;
  artifactType: "structured-values";
}
export interface Film {
  sku: number;
  genre:
    | "action"
    | "adult"
    | "adventure"
    | "comedy"
    | "drama"
    | "fantasy"
    | "horror"
    | "kid"
    | "police"
    | "romance"
    | "sci-fi"
    | "western"
    | "xmas";
  productName: string;
  subjectName: string;
  backgroundImage: string;
  subjectImage: string;
  colorPalette: string;
  layoutStyle: number;
  layoutStyleColor: number;
  subjectPlacement: string;
  newToUnlock: boolean;
  evidence: Evidence;
}
export interface Evidence {
  kind: "data-table";
  tablePath: string;
  rowKey: string;
}
