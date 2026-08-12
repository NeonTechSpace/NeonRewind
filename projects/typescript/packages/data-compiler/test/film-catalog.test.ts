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
  assert.equal(catalog.totals.newReleaseTableCount, 1);
  assert.equal(catalog.totals.excludedTableCount, 1);
  assert.equal(catalog.totals.filmCount, 13);
  assert.equal(catalog.totals.newReleaseFilmCount, 2);
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
  assert.deepEqual(
    catalog.newReleaseFilms.map((film) => film.sku),
    [1_000, 1_001],
  );
  assert.equal(catalog.newReleaseFilms[0]?.genre, "sci-fi");
  assert.equal(catalog.newReleaseFilms[0]?.newToUnlock, true);
  assert.deepEqual(catalog.newReleaseFilms[0]?.evidence, {
    kind: "data-table",
    tablePath: "/Game/ExampleScheduleTable.uasset",
    rowKey: "row-NewRelease-2",
  });

  assert.equal(FilmCatalogSchema.allows(catalog), true);
});

test("rejects a duplicate film SKU", () => {
  assert.throws(
    () => compileFilmCatalog(createInput({ duplicateSku: true }), sourceIdentity),
    /Duplicate film SKU/u,
  );
});

test("rejects a new-release SKU that overlaps the general catalog", () => {
  assert.throws(
    () => compileFilmCatalog(createInput({ overlappingNewReleaseSku: true }), sourceIdentity),
    /Duplicate film SKU/u,
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

test("rejects an unknown new-release source genre", () => {
  assert.throws(
    () => compileFilmCatalog(createInput({ unknownNewReleaseGenre: true }), sourceIdentity),
    /Unexpected Genre value/u,
  );
});

interface FixtureOptions {
  readonly duplicateSku?: boolean;
  readonly includeUnknownTable?: boolean;
  readonly mismatchGenre?: boolean;
  readonly overlappingNewReleaseSku?: boolean;
  readonly unknownNewReleaseGenre?: boolean;
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
    {
      path: "/Game/ExampleScheduleTable.uasset",
      name: "ExampleScheduleTable",
      type: "DataTable",
      rowStruct: "ExampleRecordStruct",
      rows: [
        {
          key: "row-NewRelease-1",
          values: createValues(
            options.overlappingNewReleaseSku
              ? 100 + tableDefinitions.length
              : 1_001,
            options.unknownNewReleaseGenre
              ? "unexpected"
              : tableDefinitions[0][1],
            true,
          ),
        },
        {
          key: "row-NewRelease-2",
          values: createValues(1_000, tableDefinitions[10][1], true),
        },
      ],
    },
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

function createValues(
  sku: number,
  genre: string,
  newToUnlock = false,
): Record<string, unknown> {
  return {
    ExampleCatalogField01_test: "background",
    ExampleCatalogField02_test: "palette",
    ExampleCatalogField03_test: genre,
    ExampleCatalogField04_test: 1,
    ExampleCatalogField05_test: 2,
    ExampleCatalogField06_test: newToUnlock,
    ExampleCatalogField07_test: "product",
    ExampleCatalogField08_test: sku,
    ExampleCatalogField09_test: "subject-image",
    ExampleCatalogField10_test: "subject",
    ExampleCatalogField11_test: "placement",
  };
}
