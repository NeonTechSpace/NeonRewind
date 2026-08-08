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

export type FilmGenre = (typeof filmGenres)[number];

export interface AcquisitionArtifactIdentity {
  readonly fileName: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly artifactType: "structured-values";
  readonly schemaVersion: 1;
}

export interface FilmEvidence {
  readonly kind: "data-table";
  readonly tablePath: string;
  readonly rowKey: string;
}

export interface FilmRecord {
  readonly sku: number;
  readonly genre: FilmGenre;
  readonly productName: string;
  readonly subjectName: string;
  readonly backgroundImage: string;
  readonly subjectImage: string;
  readonly colorPalette: string;
  readonly layoutStyle: number;
  readonly layoutStyleColor: number;
  readonly subjectPlacement: string;
  readonly newToUnlock: boolean;
  readonly evidence: FilmEvidence;
}

export interface FilmCatalog {
  readonly artifactType: "film-catalog";
  readonly schemaVersion: 1;
  readonly build: {
    readonly steamAppId: string;
    readonly steamBuildId: string;
  };
  readonly source: AcquisitionArtifactIdentity;
  readonly totals: {
    readonly sourceFilmTableCount: number;
    readonly catalogTableCount: number;
    readonly excludedTableCount: number;
    readonly genreCount: number;
    readonly filmCount: number;
  };
  readonly films: readonly FilmRecord[];
}
