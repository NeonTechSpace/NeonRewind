import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import type { AcquisitionArtifactIdentity } from "@neonrewind/core";

import { compileFilmCatalog } from "./film-catalog.ts";
import { writeImmutableArtifact } from "./immutable-artifact.ts";
import { validateJsonSchema } from "./schema-validation.ts";
import type { StructuredValuesArtifact } from "./structured-values.ts";

const invalidArgumentsExitCode = 2;
const inputFailureExitCode = 6;
const outputConflictExitCode = 7;

interface FilmCatalogOptions {
  readonly inputPath: string;
  readonly inputSchemaPath: string;
  readonly outputPath: string;
}

await main(process.argv.slice(2));

async function main(arguments_: readonly string[]): Promise<void> {
  if (arguments_.length === 1 && ["--help", "-h"].includes(arguments_[0] ?? "")) {
    writeUsage(process.stdout);
    return;
  }

  if (arguments_[0] !== "film-catalog") {
    console.error("Expected the film-catalog command.");
    writeUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  const options = parseFilmCatalogOptions(arguments_.slice(1));
  if (typeof options === "string") {
    console.error(options);
    writeUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const inputBytes = await readFile(options.inputPath);
    const inputHash = sha256(inputBytes);
    const input = parseJson(inputBytes, "Structured-values input");
    const inputSchema = parseJson(
      await readFile(options.inputSchemaPath),
      "Structured-values schema",
    );
    assertObject(inputSchema, "Structured-values schema");
    validateJsonSchema(input, inputSchema, "Structured-values input");

    const structuredValues = input as StructuredValuesArtifact;
    const source: AcquisitionArtifactIdentity = {
      fileName: basename(options.inputPath),
      sha256: inputHash,
      sizeBytes: inputBytes.length,
      artifactType: "structured-values",
      schemaVersion: 1,
    };
    const catalog = compileFilmCatalog(structuredValues, source);
    const output = `${JSON.stringify(catalog, undefined, 2)}\n`;

    const finalInputBytes = await readFile(options.inputPath);
    if (finalInputBytes.length !== inputBytes.length || sha256(finalInputBytes) !== inputHash) {
      throw new Error("Structured-values input changed during compilation.");
    }

    const status = await writeImmutableArtifact(options.outputPath, output);
    if (status === "conflict") {
      console.error(`Film catalog conflicts with existing output: ${options.outputPath}`);
      process.exitCode = outputConflictExitCode;
      return;
    }

    const verb = status === "created" ? "wrote" : "is unchanged";
    console.log(`Film catalog ${verb}: ${options.outputPath}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown failure.";
    console.error(`Film-catalog compilation failed: ${message}`);
    process.exitCode = inputFailureExitCode;
  }
}

function parseFilmCatalogOptions(
  arguments_: readonly string[],
): FilmCatalogOptions | string {
  const values = new Map<string, string>();
  const allowed = new Set(["--input", "--input-schema", "--output"]);

  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !allowed.has(name)) {
      return `Unknown film-catalog option ${name ?? "<missing>"}.`;
    }
    if (value === undefined || value.startsWith("--")) {
      return `Expected a value for ${name}.`;
    }
    if (values.has(name)) {
      return `Option ${name} was provided more than once.`;
    }

    values.set(name, value);
  }

  const inputPath = values.get("--input");
  const inputSchemaPath = values.get("--input-schema");
  const outputPath = values.get("--output");
  if (inputPath === undefined || inputSchemaPath === undefined || outputPath === undefined) {
    return "Expected --input, --input-schema, and --output.";
  }

  return { inputPath, inputSchemaPath, outputPath };
}

function parseJson(bytes: Uint8Array, label: string): unknown {
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
}

function assertObject(value: unknown, label: string): asserts value is object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function writeUsage(stream: NodeJS.WritableStream): void {
  stream.write("Usage:\n");
  stream.write(
    "  neonrewind-data-compiler film-catalog --input <structured-values> --input-schema <schema> --output <film-catalog>\n",
  );
}
