import type { Type } from "arktype";

type JsonValue =
  | boolean
  | number
  | string
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export function withUniqueItems<const Schema extends Type<readonly unknown[]>>(
  schema: Schema,
): Schema;
export function withUniqueItems(schema: Type): Type {
  return schema.narrow((value, context) => {
    const values = value as readonly JsonValue[];
    const seen = new Set<string>();
    for (const value of values) {
      const normalized = JSON.stringify(normalizeJson(value as JsonValue));
      if (seen.has(normalized)) {
        return context.reject({ expected: "an array of unique items" });
      }
      seen.add(normalized);
    }
    return true;
  });
}

export function withContains<const Schema extends Type<readonly unknown[]>>(
  schema: Schema,
  member: Type,
  minimum: number,
  maximum?: number,
): Schema;
export function withContains(
  schema: Type,
  member: Type,
  minimum: number,
  maximum?: number,
): Type {
  return schema.narrow((value, context) => {
    const values = value as readonly unknown[];
    const count = values.filter((value) => member.allows(value)).length;
    return count >= minimum && (maximum === undefined || count <= maximum)
      ? true
      : context.reject({
          expected:
            maximum === undefined
              ? `an array with at least ${minimum} matching items`
              : `an array with ${minimum} to ${maximum} matching items`,
        });
  });
}

export function withExactlyOneOf<const Schema extends Type>(
  schema: Schema,
  branches: readonly Type[],
): Schema;
export function withExactlyOneOf(
  schema: Type,
  branches: readonly Type[],
): Type {
  return schema.narrow((value, context) =>
    branches.filter((branch) => branch.allows(value)).length === 1
      ? true
      : context.reject({
          expected: "a value satisfying exactly one alternative",
        }),
  );
}

export function without<const Schema extends Type>(
  schema: Schema,
  excluded: Type,
): Schema;
export function without(schema: Type, excluded: Type): Type {
  return schema.narrow((value, context) =>
    excluded.allows(value)
      ? context.reject({ expected: "a value outside the excluded contract" })
      : true,
  );
}

function normalizeJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(normalizeJson);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, normalizeJson(item)]),
  );
}
