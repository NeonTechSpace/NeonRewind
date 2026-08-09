import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test, { type TestContext } from "node:test";

import type { MovieReturnMechanics } from "@neonretrorewind/core";

import { compileMovieReturnMechanics } from "../src/movie-return-mechanics.ts";
import { linkMovieReturnValidatedMechanics } from "../src/movie-return-validated-mechanics.ts";
import { validateJsonSchema } from "../src/schema-validation.ts";
import {
  createCallerBodies,
  createCallSites,
  createFunctionTrace,
  movieReturnSources,
} from "./movie-return-fixtures.ts";
import { createRentalFunctionTrace } from "./movie-rental-trace-fixture.ts";
import { createBlueprintBodies, createRentalEvidence } from "./rental-fixtures.ts";

const mechanicsSchemaPath = fileURLToPath(
  new URL("../../core/schemas/movie-return-mechanics.schema.json", import.meta.url),
);
const validationSchemaPath = fileURLToPath(
  new URL(
    "../../../../game-data-exporter/schemas/validation/movie-return-validation.schema.json",
    import.meta.url,
  ),
);

test("links one clean passing report without changing the base evidence level", async (context) => {
  const fixture = await createFixture(context);

  assert.equal(await linkMovieReturnValidatedMechanics(fixture.options), "created");
  assert.equal(await linkMovieReturnValidatedMechanics(fixture.options), "unchanged");

  const output = JSON.parse(await readFile(fixture.options.outputPath, "utf8")) as MovieReturnMechanics;
  assert.equal(output.evidenceLevel, "decompiled-blueprint");
  assert.deepEqual(output.runtimeValidation, {
    outcome: "passed",
    checkedEventCount: 4,
    sources: {
      baseMechanics: {
        fileName: "movie-return-mechanics.json",
        sizeBytes: fixture.mechanicsBytes.length,
        sha256: sha256(fixture.mechanicsBytes),
        artifactType: "movie-return-mechanics",
      },
      observation: fixture.report.sources.observation,
      report: {
        fileName: "movie-return-validation.json",
        sizeBytes: fixture.validationBytes.length,
        sha256: sha256(fixture.validationBytes),
        artifactType: "movie-return-runtime-validation",
      },
    },
  });

  const schema = JSON.parse(await readFile(mechanicsSchemaPath, "utf8")) as object;
  assert.doesNotThrow(() => validateJsonSchema(output, schema, "Linked mechanics"));
});

test("rejects a report whose result did not pass", async (context) => {
  const fixture = await createFixture(context, "mismatch");

  await assert.rejects(
    linkMovieReturnValidatedMechanics(fixture.options),
    /not a clean passing result/u,
  );
  await assert.rejects(readFile(fixture.options.outputPath), { code: "ENOENT" });
});

test("rejects a report linked to different mechanics bytes", async (context) => {
  const fixture = await createFixture(context, "passed", "f".repeat(64));

  await assert.rejects(
    linkMovieReturnValidatedMechanics(fixture.options),
    /does not identify the supplied mechanics bytes/u,
  );
});

test("rejects validation chains whose input already contains runtime evidence", async (context) => {
  const fixture = await createFixture(context);
  const mechanics = JSON.parse(fixture.mechanicsBytes.toString("utf8")) as MovieReturnMechanics;
  const linkedMechanics: MovieReturnMechanics = {
    ...mechanics,
    runtimeValidation: {
      outcome: "passed",
      checkedEventCount: 4,
      sources: {
        baseMechanics: {
          fileName: "movie-return-mechanics.json",
          sizeBytes: 1,
          sha256: "a".repeat(64),
          artifactType: "movie-return-mechanics",
        },
        observation: fixture.report.sources.observation,
        report: {
          fileName: "movie-return-validation.json",
          sizeBytes: 1,
          sha256: "b".repeat(64),
          artifactType: "movie-return-runtime-validation",
        },
      },
    },
  };
  const mechanicsBytes = Buffer.from(`${JSON.stringify(linkedMechanics, undefined, 2)}\n`);
  const report = {
    ...fixture.report,
    sources: {
      ...fixture.report.sources,
      mechanics: {
        ...fixture.report.sources.mechanics,
        sizeBytes: mechanicsBytes.length,
        sha256: sha256(mechanicsBytes),
      },
    },
  };
  await Promise.all([
    writeFile(fixture.options.mechanicsPath, mechanicsBytes),
    writeFile(
      fixture.options.validationPath,
      `${JSON.stringify(report, undefined, 2)}\n`,
      "utf8",
    ),
  ]);

  await assert.rejects(
    linkMovieReturnValidatedMechanics(fixture.options),
    /already contains runtime-validation evidence/u,
  );
});

test("retains a different existing output", async (context) => {
  const fixture = await createFixture(context);
  await writeFile(fixture.options.outputPath, "existing\n", "utf8");

  assert.equal(await linkMovieReturnValidatedMechanics(fixture.options), "conflict");
  assert.equal(await readFile(fixture.options.outputPath, "utf8"), "existing\n");
});

async function createFixture(
  context: TestContext,
  outcome: "passed" | "mismatch" = "passed",
  mechanicsHash?: string,
) {
  const root = await mkdtemp(join(tmpdir(), "neonretrorewind-validated-mechanics-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const baseDirectory = join(root, "base");
  const reportDirectory = join(root, "report");
  const outputDirectory = join(root, "validated");
  const mechanicsPath = join(baseDirectory, "movie-return-mechanics.json");
  const validationPath = join(reportDirectory, "movie-return-validation.json");
  const outputPath = join(outputDirectory, "movie-return-mechanics.json");

  const mechanics = compileMovieReturnMechanics(
    createRentalEvidence(),
    createBlueprintBodies(),
    createCallSites(),
    createCallerBodies(),
    createFunctionTrace(),
    createRentalFunctionTrace(),
    movieReturnSources,
  );
  const mechanicsBytes = Buffer.from(`${JSON.stringify(mechanics, undefined, 2)}\n`);
  const report = {
    artifactType: "movie-return-runtime-validation",
    build: mechanics.build,
    validator: {
      name: "@neonretrorewind/validator",
      version: "0.0.0",
    },
    sources: {
      observation: {
        fileName: "movie-return-observation.json",
        sizeBytes: 16_369,
        sha256: "e".repeat(64),
        artifactType: "movie-return-runtime-observation",
      },
      mechanics: {
        fileName: "movie-return-mechanics.json",
        sizeBytes: mechanicsBytes.length,
        sha256: mechanicsHash ?? sha256(mechanicsBytes),
        artifactType: "movie-return-mechanics",
      },
    },
    validation: {
      outcome,
      checkedEventCount: 4,
      issues:
        outcome === "passed"
          ? []
          : [
              {
                kind: "mismatch",
                code: "customer-inventory-mismatch",
                sequence: 4,
                message: "Fixture mismatch.",
              },
            ],
    },
  } as const;
  const validationBytes = Buffer.from(`${JSON.stringify(report, undefined, 2)}\n`);
  await Promise.all([
    mkdir(baseDirectory, { recursive: true }),
    mkdir(reportDirectory, { recursive: true }),
    mkdir(outputDirectory, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(mechanicsPath, mechanicsBytes),
    writeFile(validationPath, validationBytes),
  ]);

  return {
    mechanicsBytes,
    validationBytes,
    report,
    options: {
      mechanicsPath,
      mechanicsSchemaPath,
      validationPath,
      validationSchemaPath,
      outputPath,
    },
  };
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
