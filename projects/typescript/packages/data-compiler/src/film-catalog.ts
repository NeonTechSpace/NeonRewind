import type {
  AcquisitionArtifactIdentity,
  FilmCatalog,
  FilmGenre,
  FilmRecord,
} from "@neonretrorewind/core";

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
    sourceGenre: "ExampleCategory::Value0",
    genre: "action",
  },
  {
    sourceName: "Adult",
    sourceGenre: "ExampleCategory::Value15",
    genre: "adult",
  },
  {
    sourceName: "Adventure",
    sourceGenre: "ExampleCategory::Value30",
    genre: "adventure",
  },
  {
    sourceName: "Comedy",
    sourceGenre: "ExampleCategory::Value2",
    genre: "comedy",
  },
  {
    sourceName: "Drama",
    sourceGenre: "ExampleCategory::Value3",
    genre: "drama",
  },
  {
    sourceName: "Fantasy",
    sourceGenre: "ExampleCategory::Value6",
    genre: "fantasy",
  },
  {
    sourceName: "Horror",
    sourceGenre: "ExampleCategory::Value4",
    genre: "horror",
  },
  {
    sourceName: "Kid",
    sourceGenre: "ExampleCategory::Value11",
    genre: "kid",
  },
  {
    sourceName: "Police",
    sourceGenre: "ExampleCategory::Value13",
    genre: "police",
  },
  {
    sourceName: "Romance",
    sourceGenre: "ExampleCategory::Value9",
    genre: "romance",
  },
  {
    sourceName: "Sci-Fi",
    sourceGenre: "ExampleCategory::Value5",
    genre: "sci-fi",
  },
  {
    sourceName: "Western",
    sourceGenre: "ExampleCategory::Value16",
    genre: "western",
  },
  {
    sourceName: "ExampleSeasonalAsset",
    sourceGenre: "ExampleCategory::Value17",
    genre: "xmas",
  },
];

const excludedTableNames = new Set([
  "ExampleAuxiliaryTable",
  "ExampleScheduleTable",
]);

const sourceFieldPrefixes = [
  "ExampleCatalogField01",
  "ExampleCatalogField02",
  "ExampleCatalogField03",
  "ExampleCatalogField04",
  "ExampleCatalogField05",
  "ExampleCatalogField06",
  "ExampleCatalogField07",
  "ExampleCatalogField08",
  "ExampleCatalogField09",
  "ExampleCatalogField10",
  "ExampleCatalogField11",
] as const;

export function compileFilmCatalog(
  input: StructuredValuesArtifact,
  source: AcquisitionArtifactIdentity,
): FilmCatalog {
  assertInputIdentity(input);
  const filmTables = input.dataTables.filter(
    (table) => table.rowStruct === "ExampleRecordStruct",
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
  if (input.artifactType !== "structured-values") {
    throw new Error("Expected a structured-values artifact.");
  }
}

function indexFilmTables(
  tables: readonly StructuredDataTable[],
): ReadonlyMap<string, StructuredDataTable> {
  const tablesByName = new Map<string, StructuredDataTable>();

  for (const table of tables) {
    if (tablesByName.has(table.name)) {
      throw new Error(`Duplicate ExampleRecordStruct table name ${table.name}.`);
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
      throw new Error(`Missing expected ExampleRecordStruct table ${name}.`);
    }
  }

  for (const name of tablesByName.keys()) {
    if (!expectedNames.has(name)) {
      throw new Error(`Unclassified ExampleRecordStruct table ${name}.`);
    }
  }
}

function compileFilm(
  row: StructuredDataTableRow,
  table: StructuredDataTable,
  definition: CatalogTableDefinition,
): FilmRecord {
  assertSourceFields(row, table);
  const sourceGenre = readString(row, table, "ExampleCatalogField03");
  if (sourceGenre !== definition.sourceGenre) {
    throw new Error(
      `Unexpected Genre value in ${table.path} row ${row.key}.`,
    );
  }

  return {
    sku: readInteger(row, table, "ExampleCatalogField08"),
    genre: definition.genre,
    productName: readString(row, table, "ExampleCatalogField07"),
    subjectName: readString(row, table, "ExampleCatalogField10"),
    backgroundImage: readString(row, table, "ExampleCatalogField01"),
    subjectImage: readString(row, table, "ExampleCatalogField09"),
    colorPalette: readString(row, table, "ExampleCatalogField02"),
    layoutStyle: readInteger(row, table, "ExampleCatalogField04"),
    layoutStyleColor: readInteger(row, table, "ExampleCatalogField05"),
    subjectPlacement: readString(row, table, "ExampleCatalogField11"),
    newToUnlock: readBoolean(row, table, "ExampleCatalogField06"),
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
