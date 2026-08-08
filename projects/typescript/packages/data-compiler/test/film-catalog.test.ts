import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { AcquisitionArtifactIdentity } from "@neonrewind/core";

import { compileFilmCatalog } from "../src/film-catalog.ts";
import { validateJsonSchema } from "../src/schema-validation.ts";
import type {
  StructuredDataTable,
  StructuredValuesArtifact,
} from "../src/structured-values.ts";

const tableDefinitions = [
  ["Action", "Movie_Genre_Tags::NewEnumerator0"],
  ["Adult", "Movie_Genre_Tags::NewEnumerator15"],
  ["Adventure", "Movie_Genre_Tags::NewEnumerator30"],
  ["Comedy", "Movie_Genre_Tags::NewEnumerator2"],
  ["Drama", "Movie_Genre_Tags::NewEnumerator3"],
  ["Fantasy", "Movie_Genre_Tags::NewEnumerator6"],
  ["Horror", "Movie_Genre_Tags::NewEnumerator4"],
  ["Kid", "Movie_Genre_Tags::NewEnumerator11"],
  ["Police", "Movie_Genre_Tags::NewEnumerator13"],
  ["Romance", "Movie_Genre_Tags::NewEnumerator9"],
  ["Sci-Fi", "Movie_Genre_Tags::NewEnumerator5"],
  ["Western", "Movie_Genre_Tags::NewEnumerator16"],
  ["Xmas", "Movie_Genre_Tags::NewEnumerator17"],
] as const;

const sourceIdentity: AcquisitionArtifactIdentity = {
  fileName: "structured-values.v1.json",
  sha256: "a".repeat(64),
  sizeBytes: 100,
  artifactType: "structured-values",
  schemaVersion: 1,
};

test("compiles stable film records and preserves row evidence", async () => {
  const catalog = compileFilmCatalog(createInput(), sourceIdentity);

  assert.equal(catalog.totals.sourceFilmTableCount, 15);
  assert.equal(catalog.totals.catalogTableCount, 13);
  assert.equal(catalog.totals.excludedTableCount, 2);
  assert.equal(catalog.totals.filmCount, 13);
  assert.deepEqual(
    catalog.films.map((film) => film.sku),
    [...catalog.films.map((film) => film.sku)].sort((left, right) => left - right),
  );
  assert.equal(catalog.films[0]?.genre, "xmas");
  assert.deepEqual(catalog.films[0]?.evidence, {
    kind: "data-table",
    tablePath: "/Game/Xmas.uasset",
    rowKey: "row-Xmas",
  });
  assert.equal("Genre_test" in (catalog.films[0] ?? {}), false);

  const schemaPath = new URL(
    "../../core/schemas/film-catalog.v1.schema.json",
    import.meta.url,
  );
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  validateJsonSchema(catalog, schema, "Film catalog");
});

test("rejects a duplicate catalog SKU", () => {
  assert.throws(
    () => compileFilmCatalog(createInput({ duplicateSku: true }), sourceIdentity),
    /Duplicate catalog SKU/u,
  );
});

test("rejects an unclassified Film_DataStructure table", () => {
  assert.throws(
    () => compileFilmCatalog(createInput({ includeUnknownTable: true }), sourceIdentity),
    /Unclassified Film_DataStructure table/u,
  );
});

test("rejects a source genre that conflicts with its catalog table", () => {
  assert.throws(
    () => compileFilmCatalog(createInput({ mismatchGenre: true }), sourceIdentity),
    /Unexpected Genre value/u,
  );
});

interface FixtureOptions {
  readonly duplicateSku?: boolean;
  readonly includeUnknownTable?: boolean;
  readonly mismatchGenre?: boolean;
}

function createInput(options: FixtureOptions = {}): StructuredValuesArtifact {
  const dataTables: StructuredDataTable[] = tableDefinitions.map(
    ([name, sourceGenre], index) => ({
      path: `/Game/${name}.uasset`,
      name,
      type: "DataTable",
      rowStruct: "Film_DataStructure",
      rows: [
        {
          key: `row-${name}`,
          values: createValues(
            options.duplicateSku && index === 1
              ? 100 + tableDefinitions.length
              : 100 + tableDefinitions.length - index,
            options.mismatchGenre && index === 0 ? "unexpected" : sourceGenre,
          ),
        },
      ],
    }),
  );

  dataTables.push(
    createExcludedTable("Film_SKU_generator_-_Data"),
    createExcludedTable("NewRelease_Details_-_Data"),
  );
  if (options.includeUnknownTable) {
    dataTables.push(createExcludedTable("Unexpected"));
  }

  return {
    artifactType: "structured-values",
    schemaVersion: 1,
    build: {
      steamAppId: "3552140",
      steamBuildId: "23896268",
    },
    dataTables,
  };
}

function createExcludedTable(name: string) {
  return {
    path: `/Game/${name}.uasset`,
    name,
    type: "DataTable",
    rowStruct: "Film_DataStructure",
    rows: [],
  };
}

function createValues(sku: number, genre: string): Record<string, unknown> {
  return {
    BackgroundImage_test: "background",
    ColorPalette_test: "palette",
    Genre_test: genre,
    LayoutStyle_test: 1,
    LayoutStyleColor_test: 2,
    NewToUnlock_test: false,
    ProductName_test: "product",
    SKU_test: sku,
    SubjectImage_test: "subject-image",
    SubjectName_test: "subject",
    SubjectPlacement_test: "placement",
  };
}
