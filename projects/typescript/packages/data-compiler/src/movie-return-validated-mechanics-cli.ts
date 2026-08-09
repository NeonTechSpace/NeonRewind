import {
  linkMovieReturnValidatedMechanics,
  type MovieReturnValidatedMechanicsOptions,
} from "./movie-return-validated-mechanics.ts";

const invalidArgumentsExitCode = 2;
const inputFailureExitCode = 6;
const outputConflictExitCode = 7;

export async function runMovieReturnValidatedMechanics(
  arguments_: readonly string[],
): Promise<void> {
  const options = parseOptions(arguments_);
  if (typeof options === "string") {
    console.error(options);
    writeMovieReturnValidatedMechanicsUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const status = await linkMovieReturnValidatedMechanics(options);
    if (status === "conflict") {
      console.error(`Validated mechanics conflict with existing output: ${options.outputPath}`);
      process.exitCode = outputConflictExitCode;
      return;
    }

    const verb = status === "created" ? "wrote" : "is unchanged";
    console.log(`Validated movie-return mechanics ${verb}: ${options.outputPath}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown failure.";
    console.error(`Movie-return validation linking failed: ${message}`);
    process.exitCode = inputFailureExitCode;
  }
}

export function writeMovieReturnValidatedMechanicsUsage(
  stream: NodeJS.WritableStream,
): void {
  stream.write(
    "  neonretrorewind-data-compiler movie-return-validated-mechanics --mechanics <path> --mechanics-schema <schema> --validation <path> --validation-schema <schema> --output <path>\n",
  );
}

function parseOptions(
  arguments_: readonly string[],
): MovieReturnValidatedMechanicsOptions | string {
  const values = new Map<string, string>();
  const allowed = new Set([
    "--mechanics",
    "--mechanics-schema",
    "--validation",
    "--validation-schema",
    "--output",
  ]);

  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !allowed.has(name)) {
      return `Unknown movie-return-validated-mechanics option ${name ?? "<missing>"}.`;
    }
    if (value === undefined || value.startsWith("--")) {
      return `Expected a value for ${name}.`;
    }
    if (values.has(name)) {
      return `Option ${name} was provided more than once.`;
    }
    values.set(name, value);
  }

  const mechanicsPath = values.get("--mechanics");
  const mechanicsSchemaPath = values.get("--mechanics-schema");
  const validationPath = values.get("--validation");
  const validationSchemaPath = values.get("--validation-schema");
  const outputPath = values.get("--output");
  if (
    mechanicsPath === undefined ||
    mechanicsSchemaPath === undefined ||
    validationPath === undefined ||
    validationSchemaPath === undefined ||
    outputPath === undefined
  ) {
    return "Expected mechanics, validation report, both schemas, and --output.";
  }

  return {
    mechanicsPath,
    mechanicsSchemaPath,
    validationPath,
    validationSchemaPath,
    outputPath,
  };
}
