import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  validateMovieReturnFiles,
  type MovieReturnValidationOptions,
} from "../src/index.ts";
import { compileMovieReturnMechanics } from "../../data-compiler/src/movie-return-mechanics.ts";
import {
  createCallerBodies,
  createCallSites,
  createFunctionTrace,
  movieReturnSources,
} from "../../data-compiler/test/movie-return-fixtures.ts";
import { createRentalFunctionTrace } from "../../data-compiler/test/movie-rental-trace-fixture.ts";
import {
  createBlueprintBodies,
  createRentalEvidence,
} from "../../data-compiler/test/rental-fixtures.ts";
import {
  captured,
  createObservation,
  movie,
} from "./movie-return-fixture.ts";

const observationSchemaPath = new URL(
  "../../../../game-data-exporter/schemas/runtime/movie-return-observation.schema.json",
  import.meta.url,
);
const mechanicsSchemaSourcePath = new URL(
  "../../core/schemas/movie-return-mechanics.schema.json",
  import.meta.url,
);
const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const execFileAsync = promisify(execFile);

test("writes a deterministic passed validation report", async (context) => {
  const fixture = await createFiles(context);

  const first = await validateMovieReturnFiles(fixture.options);
  const second = await validateMovieReturnFiles(fixture.options);

  assert.equal(first.writeStatus, "created");
  assert.equal(second.writeStatus, "unchanged");
  assert.equal(first.artifact.validation.outcome, "passed");
  assert.deepEqual(first.artifact, second.artifact);
  assert.equal(
    JSON.parse(await readFile(fixture.options.outputPath, "utf8")).artifactType,
    "movie-return-runtime-validation",
  );
});

test("rejects an observation linked to another mechanics hash", async (context) => {
  const fixture = await createFiles(context, {
    mutateObservation: (observation) => {
      observation.targetMechanics.sha256 = "b".repeat(64);
    },
  });

  await assert.rejects(
    validateMovieReturnFiles(fixture.options),
    /does not reference the supplied mechanics artifact/u,
  );
});

test("rejects observation and mechanics artifacts from different builds", async (context) => {
  const fixture = await createFiles(context, { mechanicsBuildId: "99999999" });

  await assert.rejects(
    validateMovieReturnFiles(fixture.options),
    /use different game builds/u,
  );
});

test("rejects private fields through the observation schema", async (context) => {
  const fixture = await createFiles(context, {
    mutateObservation: (observation) => {
      (observation.events[0] as unknown as Record<string, unknown>).playerName = "private";
    },
  });

  await assert.rejects(
    validateMovieReturnFiles(fixture.options),
    /does not match its schema/u,
  );
});

test("writes a mismatch report without rewriting the observation", async (context) => {
  const fixture = await createFiles(context, {
    mutateObservation: (observation) => {
      const event = observation.events.find(
        (candidate) => candidate.eventType === "selection-observed",
      );
      if (event?.eventType !== "selection-observed") {
        throw new Error("Fixture selection event is missing.");
      }
      event.result.selectedMovies = captured(movie("movie-9999"));
    },
  });
  const before = await readFile(fixture.options.observationPath);

  const result = await validateMovieReturnFiles(fixture.options);

  assert.equal(result.writeStatus, "created");
  assert.equal(result.artifact.validation.outcome, "mismatch");
  assert.deepEqual(await readFile(fixture.options.observationPath), before);
});

test("reports a conflict when different output already exists", async (context) => {
  const fixture = await createFiles(context);
  await writeFile(fixture.options.outputPath, "{}\n", "utf8");

  const result = await validateMovieReturnFiles(fixture.options);

  assert.equal(result.writeStatus, "conflict");
  assert.equal(await readFile(fixture.options.outputPath, "utf8"), "{}\n");
});

test("accepts and reports a duplicate selector result", async (context) => {
  const fixture = await createFiles(context, {
    mutateObservation: (observation) => {
      const event = observation.events.find(
        (candidate) => candidate.eventType === "selection-observed",
      );
      if (event?.eventType !== "selection-observed") {
        throw new Error("Fixture selection event is missing.");
      }
      event.result.selectedMovies = captured(
        movie("movie-0001"),
        movie("movie-0001"),
      );
    },
  });

  const result = await validateMovieReturnFiles(fixture.options);

  assert.equal(result.artifact.validation.outcome, "mismatch");
  assert.ok(
    result.artifact.validation.issues.some(
      (issue) => issue.code === "selection-result-duplicate",
    ),
  );
});

test("accepts and reports a truncated queue capture", async (context) => {
  const fixture = await createFiles(context, {
    mutateObservation: (observation) => {
      const event = observation.events.find(
        (candidate) => candidate.eventType === "selection-observed",
      );
      if (event?.eventType !== "selection-observed") {
        throw new Error("Fixture selection event is missing.");
      }
      event.preState.readyMovies = {
        totalCount: 257,
        truncated: true,
        movies: [movie("movie-0001")],
      };
    },
  });

  const result = await validateMovieReturnFiles(fixture.options);

  assert.equal(result.artifact.validation.outcome, "incomplete");
  assert.ok(
    result.artifact.validation.issues.some(
      (issue) => issue.code === "capture-truncated",
    ),
  );
});

test("rejects more than 256 captured movie references", async (context) => {
  const fixture = await createFiles(context, {
    mutateObservation: (observation) => {
      const event = observation.events.find(
        (candidate) => candidate.eventType === "selection-observed",
      );
      if (event?.eventType !== "selection-observed") {
        throw new Error("Fixture selection event is missing.");
      }
      const movies = Array.from({ length: 257 }, (_, index) =>
        movie(`movie-${index.toString().padStart(4, "0")}`),
      );
      event.preState.readyMovies = captured(...movies);
    },
  });

  await assert.rejects(
    validateMovieReturnFiles(fixture.options),
    /does not match its schema/u,
  );
});

test("rejects a schema with the wrong identity", async (context) => {
  const fixture = await createFiles(context);
  const schema = JSON.parse(
    await readFile(fixture.options.mechanicsSchemaPath, "utf8"),
  );
  schema.$id = "urn:wrong";
  await writeJson(fixture.options.mechanicsSchemaPath, schema);

  await assert.rejects(
    validateMovieReturnFiles(fixture.options),
    /does not have the expected \$id/u,
  );
});

test("command exits zero after writing a passed report", async (context) => {
  const fixture = await createFiles(context);

  const result = await execFileAsync(
    process.execPath,
    [cliPath, "movie-return", ...commandArguments(fixture.options)],
    { encoding: "utf8" },
  );

  assert.match(result.stdout, /\(passed\)/u);
  assert.equal(result.stderr, "");
});

test("command writes a mismatch report and exits eight", async (context) => {
  const fixture = await createFiles(context, {
    mutateObservation: (observation) => {
      const event = observation.events.find(
        (candidate) => candidate.eventType === "selection-observed",
      );
      if (event?.eventType !== "selection-observed") {
        throw new Error("Fixture selection event is missing.");
      }
      event.result.selectedMovies = captured(movie("movie-9999"));
    },
  });

  await assert.rejects(
    execFileAsync(
      process.execPath,
      [cliPath, "movie-return", ...commandArguments(fixture.options)],
      { encoding: "utf8" },
    ),
    (error: unknown) => {
      assert.ok(isExecError(error));
      assert.equal(error.code, 8);
      assert.match(error.stdout, /\(mismatch\)/u);
      return true;
    },
  );
  assert.equal(
    JSON.parse(await readFile(fixture.options.outputPath, "utf8")).validation.outcome,
    "mismatch",
  );
});

interface FixtureOptions {
  readonly mechanicsBuildId?: string;
  readonly mutateObservation?: (
    observation: ReturnType<typeof createObservation>,
  ) => void;
}

async function createFiles(
  context: TestContext,
  fixtureOptions: FixtureOptions = {},
): Promise<{ readonly options: MovieReturnValidationOptions }> {
  const directory = await mkdtemp(join(tmpdir(), "neonretrorewind-validator-"));
  context.after(() => rm(directory, { recursive: true, force: true }));

  const mechanicsPath = join(directory, "movie-return-mechanics.json");
  const mechanicsSchemaPath = join(directory, "movie-return-mechanics.schema.json");
  const observationPath = join(directory, "movie-return-observation.json");
  const outputPath = join(directory, "movie-return-validation.json");
  const compiledMechanics = compileMovieReturnMechanics(
    createRentalEvidence(),
    createBlueprintBodies(),
    createCallSites(),
    createCallerBodies(),
    createFunctionTrace(),
    createRentalFunctionTrace(),
    movieReturnSources,
  );
  const mechanics = fixtureOptions.mechanicsBuildId === undefined
    ? compiledMechanics
    : {
        ...compiledMechanics,
        build: {
          ...compiledMechanics.build,
          steamBuildId: fixtureOptions.mechanicsBuildId,
        },
      };
  const mechanicsContent = json(mechanics);
  await writeFile(mechanicsPath, mechanicsContent, "utf8");
  await writeFile(mechanicsSchemaPath, await readFile(mechanicsSchemaSourcePath));

  const observation = createObservation();
  observation.targetMechanics.sizeBytes = Buffer.byteLength(mechanicsContent);
  observation.targetMechanics.sha256 = sha256(mechanicsContent);
  fixtureOptions.mutateObservation?.(observation);
  await writeJson(observationPath, observation);

  return {
    options: {
      observationPath,
      observationSchemaPath: fileURLToPath(observationSchemaPath),
      mechanicsPath,
      mechanicsSchemaPath,
      outputPath,
    },
  };
}

function commandArguments(options: MovieReturnValidationOptions): readonly string[] {
  return [
    "--observation",
    options.observationPath,
    "--observation-schema",
    options.observationSchemaPath,
    "--mechanics",
    options.mechanicsPath,
    "--mechanics-schema",
    options.mechanicsSchemaPath,
    "--output",
    options.outputPath,
  ];
}

function isExecError(
  error: unknown,
): error is Error & { readonly code: number; readonly stdout: string } {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "number" &&
    "stdout" in error &&
    typeof error.stdout === "string"
  );
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, json(value), "utf8");
}

function json(value: unknown): string {
  return `${JSON.stringify(value, undefined, 2)}\n`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
