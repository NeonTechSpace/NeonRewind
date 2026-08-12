import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";

export function validateJsonSchema(
  value: unknown,
  schema: object,
  label: string,
): void {
  const validator = new Ajv2020({
    allErrors: true,
    strict: true,
    strictTypes: false,
  }).compile(schema);
  if (validator(value)) {
    return;
  }

  const details = validator.errors
    ?.slice(0, 5)
    .map(
      (error: ErrorObject) =>
        `${error.instancePath || "/"} ${error.message ?? error.keyword}`,
    )
    .join(", ");
  throw new Error(`${label} does not match its schema${details ? `: ${details}` : "."}`);
}
