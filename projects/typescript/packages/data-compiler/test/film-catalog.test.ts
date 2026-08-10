import assert from "node:assert/strict";
import test from "node:test";

import {
  FilmCatalogSchema,
  type AcquisitionArtifactIdentity,
} from "@neonretrorewind/core";

import { compileFilmCatalog } from "../src/film-catalog.ts";
import type {
  StructuredDataTable,
  StructuredValuesArtifact,
} from "../src/structured-values.ts";

const tableDefinitions = [
  ["Action", "ExampleCategory::Value0"],
  ["Adult", "ExampleCategory::Value15"],
  ["Adventure", "ExampleCategory::Value30"],
  ["Comedy", "ExampleCategory::Value2"],
  ["Drama", "ExampleCategory::Value3"],
  ["Fantasy", "ExampleCategory::Value6"],
  ["Horror", "ExampleCategory::Value4"],
  ["Kid", "ExampleCategory::Value11"],
  ["Police", "ExampleCategory::Value13"],
  ["Romance", "ExampleCategory::Value9"],
  ["Sci-Fi", "ExampleCategory::Value5"],
  ["Western", "ExampleCategory::Value16"],
  ["ExampleSeasonalAsset", "ExampleCategory::Value17"],
] as const;

const sourceIdentity: AcquisitionArtifactIdentity = {
  fileName: "structured-values.json",
  sha256: "a".repeat(64),
  sizeBytes: 100,
  artifactType: "structured-values",
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
    tablePath: "/Game/ExampleSeasonalAsset.uasset",
    rowKey: "row-ExampleSeasonalAsset",
  });
  assert.equal("ExampleCatalogField03_test" in (catalog.films[0] ?? {}), false);

  assert.equal(FilmCatalogSchema.allows(catalog), true);
});

test("rejects a duplicate catalog SKU", () => {
  assert.throws(
    () => compileFilmCatalog(createInput({ duplicateSku: true }), sourceIdentity),
    /Duplicate catalog SKU/u,
  );
});

test("rejects an unclassified ExampleRecordStruct table", () => {
  assert.throws(
    () => compileFilmCatalog(createInput({ includeUnknownTable: true }), sourceIdentity),
    /Unclassified ExampleRecordStruct table/u,
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
      rowStruct: "ExampleRecordStruct",
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
    createExcludedTable("ExampleAuxiliaryTable"),
    createExcludedTable("ExampleScheduleTable"),
  );
  if (options.includeUnknownTable) {
    dataTables.push(createExcludedTable("Unexpected"));
  }

  return {
    artifactType: "structured-values",
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
    rowStruct: "ExampleRecordStruct",
    rows: [],
  };
}

function createValues(sku: number, genre: string): Record<string, unknown> {
  return {
    ExampleCatalogField01_test: "background",
    ExampleCatalogField02_test: "palette",
    ExampleCatalogField03_test: genre,
    ExampleCatalogField04_test: 1,
    ExampleCatalogField05_test: 2,
    ExampleCatalogField06_test: false,
    ExampleCatalogField07_test: "product",
    ExampleCatalogField08_test: sku,
    ExampleCatalogField09_test: "subject-image",
    ExampleCatalogField10_test: "subject",
    ExampleCatalogField11_test: "placement",
  };
}
