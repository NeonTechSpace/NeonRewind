import { jsonSchemaToType } from "@ark/json-schema";
import type { Type } from "arktype";
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";

type JsonObject = { readonly [key: string]: JsonValue };
type JsonValue = JsonObject | readonly JsonValue[] | boolean | number | string | null;
type JsonPosition = "schema" | "schema-array" | "schema-map" | "value";
type DeepReadonly<Value> =
  Value extends bigint | boolean | null | number | string | symbol | undefined
    ? Value
    : Value extends (...arguments_: never[]) => unknown
    ? Value
    : Value extends readonly unknown[]
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value extends object
        ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
        : Value;

export function defineArtifactSchema<Contract>(
  schema: unknown,
): Type<DeepReadonly<Contract>> {
  const structural = jsonSchemaToType(prepareForArkType(schema as JsonObject));
  let exactValidator: ValidateFunction | undefined;
  return structural.narrow((data, context) => {
    exactValidator ??= new Ajv2020({
      allErrors: true,
      strict: true,
      strictTypes: false,
    }).compile(schema as object);
    return exactValidator(data)
      ? true
      : context.reject({
          expected: "an artifact satisfying its exact JSON Schema constraints",
        });
  }) as unknown as Type<DeepReadonly<Contract>>;
}

function prepareForArkType(root: JsonObject): JsonObject {
  return visit(root, root, new Set(), "schema") as JsonObject;
}

function visit(
  value: JsonValue,
  root: JsonObject,
  resolvingReferences: ReadonlySet<string>,
  position: JsonPosition,
): JsonValue {
  if (Array.isArray(value)) {
    const itemPosition = position === "schema-array" ? "schema" : "value";
    return value.map((item) => visit(item, root, resolvingReferences, itemPosition));
  }
  if (value === null || typeof value !== "object") {
    return value;
  }

  const object = value as JsonObject;
  if (position === "schema-map") {
    return Object.fromEntries(
      Object.entries(object).map(([key, item]) => [
        key,
        visit(item, root, resolvingReferences, "schema"),
      ]),
    );
  }
  if (position === "value") {
    return Object.fromEntries(
      Object.entries(object).map(([key, item]) => [
        key,
        visit(item, root, resolvingReferences, "value"),
      ]),
    );
  }

  const reference = object.$ref;
  if (typeof reference === "string") {
    if (!reference.startsWith("#/")) {
      throw new Error(`Only local artifact-schema references are supported: ${reference}`);
    }
    if (resolvingReferences.has(reference)) {
      throw new Error(`Recursive artifact-schema reference is not supported: ${reference}`);
    }

    const nextReferences = new Set(resolvingReferences);
    nextReferences.add(reference);
    const target = resolveLocalReference(root, reference);
    const siblings = Object.fromEntries(
      Object.entries(object).filter(([key]) => key !== "$ref"),
    ) as JsonObject;
    if (Object.keys(siblings).length === 0) {
      return visit(target, root, nextReferences, "schema");
    }
    return visit(
      { allOf: [target, siblings] },
      root,
      nextReferences,
      "schema",
    );
  }

  const visited = Object.fromEntries(
    Object.entries(object).map(([key, item]) => [
      key,
      visit(item, root, resolvingReferences, childPosition(key)),
    ]),
  ) as Record<string, JsonValue>;

  if (!("if" in visited)) {
    return addInferredType(visited);
  }

  const condition = visited.if;
  const thenSchema = visited.then ?? true;
  const elseSchema = visited.else ?? true;
  delete visited.if;
  delete visited.then;
  delete visited.else;
  const conditional: JsonObject = {
    anyOf: [
      { allOf: [condition, thenSchema] },
      { allOf: [{ not: condition }, elseSchema] },
    ],
  };
  const base = addInferredType(visited);
  return Object.keys(visited).length === 0
    ? conditional
    : { allOf: [base, conditional] };
}

function childPosition(keyword: string): JsonPosition {
  if (["$defs", "definitions", "properties", "patternProperties"].includes(keyword)) {
    return "schema-map";
  }
  if (["allOf", "anyOf", "oneOf", "prefixItems"].includes(keyword)) {
    return "schema-array";
  }
  if (
    [
      "additionalProperties",
      "contains",
      "else",
      "if",
      "items",
      "not",
      "propertyNames",
      "then",
    ].includes(keyword)
  ) {
    return "schema";
  }
  return "value";
}

function addInferredType(schema: Record<string, JsonValue>): JsonObject {
  if (
    ["type", "enum", "const", "allOf", "anyOf", "oneOf", "not"].some(
      (key) => key in schema,
    )
  ) {
    return schema;
  }
  if (
    ["properties", "required", "additionalProperties", "patternProperties"].some(
      (key) => key in schema,
    )
  ) {
    return { ...schema, type: "object" };
  }
  if (
    [
      "contains",
      "items",
      "prefixItems",
      "minItems",
      "maxItems",
      "minContains",
      "maxContains",
      "uniqueItems",
    ].some(
      (key) => key in schema,
    )
  ) {
    return { ...schema, type: "array" };
  }
  if (["pattern", "minLength", "maxLength"].some((key) => key in schema)) {
    return { ...schema, type: "string" };
  }
  if (
    ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"].some(
      (key) => key in schema,
    )
  ) {
    return { ...schema, type: "number" };
  }
  return schema;
}

function resolveLocalReference(root: JsonObject, reference: string): JsonValue {
  let current: JsonValue = root;
  for (const encodedSegment of reference.slice(2).split("/")) {
    const segment = encodedSegment.replaceAll("~1", "/").replaceAll("~0", "~");
    if (current === null || typeof current !== "object" || Array.isArray(current)) {
      throw new Error(`Artifact-schema reference does not resolve: ${reference}`);
    }
    const next: JsonValue | undefined = (current as JsonObject)[segment];
    if (next === undefined) {
      throw new Error(`Artifact-schema reference does not resolve: ${reference}`);
    }
    current = next;
  }
  return current;
}
