import type {
  AcquisitionArtifactIdentity,
  FilmCatalog,
  FilmGenre,
  FilmRecord,
} from "@neonrewind/core";

import type {
  StructuredDataTable,
  StructuredDataTableRow,
  StructuredValuesArtifact,
} from "./structured-values.ts";

interface CatalogTableDefinition {
  readonly sourceName: string;
  readonly sourceGenre: string;
  readonly genre: FilmGenre;
}

const catalogTableDefinitions: readonly CatalogTableDefinition[] = [
  {
    sourceName: "Action",
    sourceGenre: "Movie_Genre_Tags::NewEnumerator0",
    genre: "action",
  },
  {
    sourceName: "Adult",
    sourceGenre: "Movie_Genre_Tags::NewEnumerator15",
    genre: "adult",
  },
  {
    sourceName: "Adventure",
    sourceGenre: "Movie_Genre_Tags::NewEnumerator30",
    genre: "adventure",
  },
  {
    sourceName: "Comedy",
    sourceGenre: "Movie_Genre_Tags::NewEnumerator2",
    genre: "comedy",
  },
  {
    sourceName: "Drama",
    sourceGenre: "Movie_Genre_Tags::NewEnumerator3",
    genre: "drama",
  },
  {
    sourceName: "Fantasy",
    sourceGenre: "Movie_Genre_Tags::NewEnumerator6",
    genre: "fantasy",
  },
  {
    sourceName: "Horror",
    sourceGenre: "Movie_Genre_Tags::NewEnumerator4",
    genre: "horror",
  },
  {
    sourceName: "Kid",
    sourceGenre: "Movie_Genre_Tags::NewEnumerator11",
    genre: "kid",
  },
  {
    sourceName: "Police",
    sourceGenre: "Movie_Genre_Tags::NewEnumerator13",
    genre: "police",
  },
  {
    sourceName: "Romance",
    sourceGenre: "Movie_Genre_Tags::NewEnumerator9",
    genre: "romance",
  },
  {
    sourceName: "Sci-Fi",
    sourceGenre: "Movie_Genre_Tags::NewEnumerator5",
    genre: "sci-fi",
  },
  {
    sourceName: "Western",
    sourceGenre: "Movie_Genre_Tags::NewEnumerator16",
    genre: "western",
  },
  {
    sourceName: "Xmas",
    sourceGenre: "Movie_Genre_Tags::NewEnumerator17",
    genre: "xmas",
  },
];

const excludedTableNames = new Set([
  "Film_SKU_generator_-_Data",
  "NewRelease_Details_-_Data",
]);

const sourceFieldPrefixes = [
  "BackgroundImage",
  "ColorPalette",
  "Genre",
  "LayoutStyle",
  "LayoutStyleColor",
  "NewToUnlock",
  "ProductName",
  "SKU",
  "SubjectImage",
  "SubjectName",
  "SubjectPlacement",
] as const;

export function compileFilmCatalog(
  input: StructuredValuesArtifact,
  source: AcquisitionArtifactIdentity,
): FilmCatalog {
  assertInputIdentity(input);
  const filmTables = input.dataTables.filter(
    (table) => table.rowStruct === "Film_DataStructure",
  );
  const tablesByName = indexFilmTables(filmTables);
  assertExpectedTables(tablesByName);

  const films = catalogTableDefinitions.flatMap((definition) => {
    const table = tablesByName.get(definition.sourceName);
    if (table === undefined) {
      throw new Error(`Missing catalog table ${definition.sourceName}.`);
    }

    return table.rows.map((row) => compileFilm(row, table, definition));
  });

  assertUniqueSkus(films);
  films.sort((left, right) => left.sku - right.sku);

  return {
    artifactType: "film-catalog",
    schemaVersion: 1,
    build: {
      steamAppId: input.build.steamAppId,
      steamBuildId: input.build.steamBuildId,
    },
    source,
    totals: {
      sourceFilmTableCount: filmTables.length,
      catalogTableCount: catalogTableDefinitions.length,
      excludedTableCount: excludedTableNames.size,
      genreCount: catalogTableDefinitions.length,
      filmCount: films.length,
    },
    films,
  };
}

function assertInputIdentity(input: StructuredValuesArtifact): void {
  if (input.artifactType !== "structured-values" || input.schemaVersion !== 1) {
    throw new Error("Expected structured-values schema version 1.");
  }
}

function indexFilmTables(
  tables: readonly StructuredDataTable[],
): ReadonlyMap<string, StructuredDataTable> {
  const tablesByName = new Map<string, StructuredDataTable>();

  for (const table of tables) {
    if (tablesByName.has(table.name)) {
      throw new Error(`Duplicate Film_DataStructure table name ${table.name}.`);
    }

    tablesByName.set(table.name, table);
  }

  return tablesByName;
}

function assertExpectedTables(
  tablesByName: ReadonlyMap<string, StructuredDataTable>,
): void {
  const expectedNames = new Set([
    ...catalogTableDefinitions.map((definition) => definition.sourceName),
    ...excludedTableNames,
  ]);

  for (const name of expectedNames) {
    if (!tablesByName.has(name)) {
      throw new Error(`Missing expected Film_DataStructure table ${name}.`);
    }
  }

  for (const name of tablesByName.keys()) {
    if (!expectedNames.has(name)) {
      throw new Error(`Unclassified Film_DataStructure table ${name}.`);
    }
  }
}

function compileFilm(
  row: StructuredDataTableRow,
  table: StructuredDataTable,
  definition: CatalogTableDefinition,
): FilmRecord {
  assertSourceFields(row, table);
  const sourceGenre = readString(row, table, "Genre");
  if (sourceGenre !== definition.sourceGenre) {
    throw new Error(
      `Unexpected Genre value in ${table.path} row ${row.key}.`,
    );
  }

  return {
    sku: readInteger(row, table, "SKU"),
    genre: definition.genre,
    productName: readString(row, table, "ProductName"),
    subjectName: readString(row, table, "SubjectName"),
    backgroundImage: readString(row, table, "BackgroundImage"),
    subjectImage: readString(row, table, "SubjectImage"),
    colorPalette: readString(row, table, "ColorPalette"),
    layoutStyle: readInteger(row, table, "LayoutStyle"),
    layoutStyleColor: readInteger(row, table, "LayoutStyleColor"),
    subjectPlacement: readString(row, table, "SubjectPlacement"),
    newToUnlock: readBoolean(row, table, "NewToUnlock"),
    evidence: {
      kind: "data-table",
      tablePath: table.path,
      rowKey: row.key,
    },
  };
}

function assertSourceFields(
  row: StructuredDataTableRow,
  table: StructuredDataTable,
): void {
  const keys = Object.keys(row.values);
  if (keys.length !== sourceFieldPrefixes.length) {
    throw new Error(
      `Expected ${sourceFieldPrefixes.length} film fields in ${table.path} row ${row.key}.`,
    );
  }

  for (const key of keys) {
    const recognized = sourceFieldPrefixes.some((prefix) =>
      key.startsWith(`${prefix}_`),
    );
    if (!recognized) {
      throw new Error(`Unexpected film field in ${table.path} row ${row.key}.`);
    }
  }
}

function readSourceValue(
  row: StructuredDataTableRow,
  table: StructuredDataTable,
  prefix: (typeof sourceFieldPrefixes)[number],
): unknown {
  const matches = Object.entries(row.values).filter(([key]) =>
    key.startsWith(`${prefix}_`),
  );
  if (matches.length !== 1) {
    throw new Error(
      `Expected one ${prefix} field in ${table.path} row ${row.key}.`,
    );
  }

  return matches[0]?.[1];
}

function readString(
  row: StructuredDataTableRow,
  table: StructuredDataTable,
  prefix: (typeof sourceFieldPrefixes)[number],
): string {
  const value = readSourceValue(row, table, prefix);
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Expected non-empty ${prefix} in ${table.path} row ${row.key}.`);
  }

  return value;
}

function readInteger(
  row: StructuredDataTableRow,
  table: StructuredDataTable,
  prefix: (typeof sourceFieldPrefixes)[number],
): number {
  const value = readSourceValue(row, table, prefix);
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`Expected safe integer ${prefix} in ${table.path} row ${row.key}.`);
  }

  return value;
}

function readBoolean(
  row: StructuredDataTableRow,
  table: StructuredDataTable,
  prefix: (typeof sourceFieldPrefixes)[number],
): boolean {
  const value = readSourceValue(row, table, prefix);
  if (typeof value !== "boolean") {
    throw new Error(`Expected boolean ${prefix} in ${table.path} row ${row.key}.`);
  }

  return value;
}

function assertUniqueSkus(films: readonly FilmRecord[]): void {
  const skus = new Set<number>();

  for (const film of films) {
    if (skus.has(film.sku)) {
      throw new Error(`Duplicate catalog SKU ${film.sku}.`);
    }

    skus.add(film.sku);
  }
}
