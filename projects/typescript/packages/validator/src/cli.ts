import {
  validateMovieReturnFiles,
  type MovieReturnValidationOptions,
} from "./movie-return-cli.ts";

const invalidArgumentsExitCode = 2;
const inputFailureExitCode = 6;
const outputConflictExitCode = 7;
const validationNotPassedExitCode = 8;

await main(process.argv.slice(2));

async function main(arguments_: readonly string[]): Promise<void> {
  if (
    (arguments_.length === 1 && ["--help", "-h"].includes(arguments_[0] ?? "")) ||
    (arguments_.length === 2 &&
      arguments_[0] === "movie-return" &&
      ["--help", "-h"].includes(arguments_[1] ?? ""))
  ) {
    writeUsage(process.stdout);
    return;
  }
  if (arguments_[0] !== "movie-return") {
    console.error("Expected the movie-return command.");
    writeUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  const options = parseOptions(arguments_.slice(1));
  if (typeof options === "string") {
    console.error(options);
    writeUsage(process.stderr);
    process.exitCode = invalidArgumentsExitCode;
    return;
  }

  try {
    const result = await validateMovieReturnFiles(options);
    if (result.writeStatus === "conflict") {
      console.error(`Movie-return validation conflicts with existing output: ${options.outputPath}`);
      process.exitCode = outputConflictExitCode;
      return;
    }

    const verb = result.writeStatus === "created" ? "wrote" : "is unchanged";
    console.log(
      `Movie-return validation ${verb}: ${options.outputPath} (${result.artifact.validation.outcome})`,
    );
    if (result.artifact.validation.outcome !== "passed") {
      process.exitCode = validationNotPassedExitCode;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown failure.";
    console.error(`Movie-return validation failed: ${message}`);
    process.exitCode = inputFailureExitCode;
  }
}

function parseOptions(arguments_: readonly string[]): MovieReturnValidationOptions | string {
  const names = [
    "--observation",
    "--observation-schema",
    "--mechanics",
    "--mechanics-schema",
    "--report-schema",
    "--output",
  ] as const;
  const allowed = new Set<string>(names);
  const values = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (name === undefined || !allowed.has(name)) {
      return `Unknown movie-return validation option ${name ?? "<missing>"}.`;
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
    return `Expected all movie-return validation inputs, missing ${missing.join(", ")}.`;
  }
  return {
    observationPath: values.get("--observation")!,
    observationSchemaPath: values.get("--observation-schema")!,
    mechanicsPath: values.get("--mechanics")!,
    mechanicsSchemaPath: values.get("--mechanics-schema")!,
    reportSchemaPath: values.get("--report-schema")!,
    outputPath: values.get("--output")!,
  };
}

function writeUsage(stream: NodeJS.WritableStream): void {
  stream.write(
    "  neonretrorewind-validator movie-return --observation <path> --observation-schema <schema> --mechanics <path> --mechanics-schema <schema> --report-schema <schema> --output <path>\n",
  );
}
