import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import {
  BlueprintFunctionTraceSchema,
  BlueprintPropertyReferenceTraceSchema,
  UnlockableManagerTraceSchema,
  type NewReleaseUnlockArtifactIdentity,
} from "@neonretrorewind/core";

import { writeImmutableArtifact } from "./immutable-artifact.ts";
import {
  compileNewReleaseUnlockMechanics,
  type NewReleaseUnlockSources,
} from "./new-release-unlock-mechanics.ts";
import { validateJsonSchema } from "./schema-validation.ts";

const invalidArgumentsExitCode = 2;
const inputFailureExitCode = 6;
const outputConflictExitCode = 7;

interface Options {
  readonly managerTracePath: string;
  readonly managerTraceSchemaPath: string;
  readonly wrapperTracePath: string;
  readonly wrapperTraceSchemaPath: string;
  readonly propertyReaderTracePath: string;
  readonly propertyReaderTraceSchemaPath: string;
  readonly requestGeneratorTracePath: string;
  readonly requestGeneratorTraceSchemaPath: string;
  readonly outputPath: string;
}

export async function runNewReleaseUnlockMechanics(
  arguments_: readonly string[],
): Promise<void> {
  const options = parseOptions(arguments_);
  if (typeof options === "string") {
    console.error(options);
    writeNewReleaseUnlockUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const [manager, wrapper, propertyReader, requestGenerator] = await Promise.all([
      readInput(options.managerTracePath, "Unlock manager trace"),
      readInput(options.wrapperTracePath, "Unlock wrapper trace"),
      readInput(options.propertyReaderTracePath, "Property-reader trace"),
      readInput(options.requestGeneratorTracePath, "Request-generator trace"),
    ]);
    await Promise.all([
      validateInput(manager, options.managerTraceSchemaPath, "Unlock manager trace"),
      validateInput(wrapper, options.wrapperTraceSchemaPath, "Unlock wrapper trace"),
      validateInput(
        propertyReader,
        options.propertyReaderTraceSchemaPath,
        "Property-reader trace",
      ),
      validateInput(
        requestGenerator,
        options.requestGeneratorTraceSchemaPath,
        "Request-generator trace",
      ),
    ]);

    const sources: NewReleaseUnlockSources = {
      managerTrace: createIdentity(manager, "unlockable-manager-trace"),
      wrapperTrace: createIdentity(wrapper, "blueprint-function-trace"),
      propertyReaderTrace: createIdentity(
        propertyReader,
        "blueprint-property-reference-trace",
      ),
      requestGeneratorTrace: createIdentity(
        requestGenerator,
        "blueprint-function-trace",
      ),
    };
    const mechanics = compileNewReleaseUnlockMechanics(
      UnlockableManagerTraceSchema.assert(manager.value),
      BlueprintFunctionTraceSchema.assert(wrapper.value),
      BlueprintPropertyReferenceTraceSchema.assert(propertyReader.value),
      BlueprintFunctionTraceSchema.assert(requestGenerator.value),
      sources,
    );
    const output = `${JSON.stringify(mechanics, undefined, 2)}\n`;

    await Promise.all(
      [manager, wrapper, propertyReader, requestGenerator].map((input) =>
        assertFileUnchanged(input)
      ),
    );
    const status = await writeImmutableArtifact(options.outputPath, output);
    if (status === "conflict") {
      console.error(
        `New-release unlock mechanics conflict with existing output: ${options.outputPath}`,
      );
      process.exitCode = outputConflictExitCode;
      return;
    }

    const verb = status === "created" ? "wrote" : "is unchanged";
    console.log(`New-release unlock mechanics ${verb}: ${options.outputPath}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown failure.";
    console.error(`New-release-unlock-mechanics compilation failed: ${message}`);
    process.exitCode = inputFailureExitCode;
  }
}

export function writeNewReleaseUnlockUsage(stream: NodeJS.WritableStream): void {
  stream.write(
    "  neonretrorewind-data-compiler new-release-unlock-mechanics --manager-trace <path> --manager-trace-schema <schema> --wrapper-trace <path> --wrapper-trace-schema <schema> --property-reader-trace <path> --property-reader-trace-schema <schema> --request-generator-trace <path> --request-generator-trace-schema <schema> --output <path>\n",
  );
}

async function readInput(path: string, label: string): Promise<InputFile> {
  const bytes = await readFile(path);
  return { path, bytes, sha256: sha256(bytes), value: parseJson(bytes, `${label} input`) };
}

async function validateInput(
  input: InputFile,
  schemaPath: string,
  label: string,
): Promise<void> {
  const schema = parseJson(await readFile(schemaPath), `${label} schema`);
  assertObject(schema, `${label} schema`);
  validateJsonSchema(input.value, schema, `${label} input`);
}

function createIdentity<
  ArtifactType extends NewReleaseUnlockArtifactIdentity["artifactType"],
>(input: InputFile, artifactType: ArtifactType): NewReleaseUnlockArtifactIdentity<ArtifactType> {
  return {
    fileName: basename(input.path),
    sha256: input.sha256,
    sizeBytes: input.bytes.length,
    artifactType,
  } as NewReleaseUnlockArtifactIdentity<ArtifactType>;
}

function parseOptions(arguments_: readonly string[]): Options | string {
  const names = [
    "--manager-trace",
    "--manager-trace-schema",
    "--wrapper-trace",
    "--wrapper-trace-schema",
    "--property-reader-trace",
    "--property-reader-trace-schema",
    "--request-generator-trace",
    "--request-generator-trace-schema",
    "--output",
  ] as const;
  const allowed = new Set<string>(names);
  const values = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !allowed.has(name)) {
      return `Unknown new-release-unlock-mechanics option ${name ?? "<missing>"}.`;
    }
    if (value === undefined || value.startsWith("--")) {
      return `Expected a value for ${name}.`;
    }
    if (values.has(name)) {
      return `Option ${name} was provided more than once.`;
    }
    values.set(name, value);
  }
  const missing = names.filter((name) => !values.has(name));
  if (missing.length > 0) {
    return `Expected manager, wrapper, property-reader, and request-generator traces, their schemas, and --output; missing ${missing.join(", ")}.`;
  }
  return {
    managerTracePath: values.get("--manager-trace")!,
    managerTraceSchemaPath: values.get("--manager-trace-schema")!,
    wrapperTracePath: values.get("--wrapper-trace")!,
    wrapperTraceSchemaPath: values.get("--wrapper-trace-schema")!,
    propertyReaderTracePath: values.get("--property-reader-trace")!,
    propertyReaderTraceSchemaPath: values.get("--property-reader-trace-schema")!,
    requestGeneratorTracePath: values.get("--request-generator-trace")!,
    requestGeneratorTraceSchemaPath: values.get("--request-generator-trace-schema")!,
    outputPath: values.get("--output")!,
  };
}

async function assertFileUnchanged(input: InputFile): Promise<void> {
  const finalBytes = await readFile(input.path);
  if (finalBytes.length !== input.bytes.length || sha256(finalBytes) !== input.sha256) {
    throw new Error(`Input changed during compilation: ${input.path}`);
  }
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

interface InputFile {
  readonly path: string;
  readonly bytes: Uint8Array;
  readonly sha256: string;
  readonly value: unknown;
}
