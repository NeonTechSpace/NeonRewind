import { compile } from "json-schema-to-typescript";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryDirectory = resolve(packageDirectory, "../../../..");
const checkOnly = process.argv.includes("--check");

const contracts = [
  ["acquisition", "blueprint-call-sites", "BlueprintCallSites", "game-data-exporter"],
  ["acquisition", "blueprint-call-candidate-trace", "BlueprintCallCandidateTrace", "game-data-exporter"],
  ["acquisition", "blueprint-call-target-trace", "BlueprintCallTargetTrace", "game-data-exporter"],
  ["acquisition", "blueprint-caller-bodies", "BlueprintCallerBodies", "game-data-exporter"],
  ["acquisition", "blueprint-function-trace", "BlueprintFunctionTrace", "game-data-exporter"],
  ["acquisition", "blueprint-function-declarations", "BlueprintFunctionDeclarations", "game-data-exporter"],
  ["acquisition", "blueprint-property-reference-trace", "BlueprintPropertyReferenceTrace", "game-data-exporter"],
  ["acquisition", "blueprint-property-references", "BlueprintPropertyReferences", "game-data-exporter"],
  ["acquisition", "build-manifest", "BuildManifest", "game-data-exporter"],
  ["acquisition", "rental-blueprint-bodies", "RentalBlueprintBodies", "game-data-exporter"],
  ["acquisition", "rental-evidence", "RentalEvidence", "game-data-exporter"],
  ["acquisition", "rental-function-trace", "RentalFunctionTrace", "game-data-exporter"],
  ["acquisition", "static-census", "StaticCensus", "game-data-exporter"],
  ["acquisition", "structured-asset-index", "StructuredAssetIndex", "game-data-exporter"],
  ["acquisition", "structured-values", "StructuredValues", "game-data-exporter"],
  ["acquisition", "unlockable-evidence", "UnlockableEvidence", "game-data-exporter"],
  ["acquisition", "unlockable-function-trace", "UnlockableFunctionTrace", "game-data-exporter"],
  ["acquisition", "unlockable-implementation-sites", "UnlockableImplementationSites", "game-data-exporter"],
  ["acquisition", "unlockable-manager-trace", "UnlockableManagerTrace", "game-data-exporter"],
  ["runtime", "movie-return-observation", "MovieReturnObservation", "game-data-exporter"],
  ["runtime", "movie-return-runtime-collector-config", "MovieReturnRuntimeCollectorConfig", "game-data-exporter"],
  ["runtime", "runtime-host-installation", "RuntimeHostInstallation", "game-data-exporter"],
  ["runtime", "runtime-host-staging", "RuntimeHostStaging", "game-data-exporter"],
  ["validation", "movie-return-validation", "MovieReturnValidation", null],
  ["domain", "console-return-mechanics", "ConsoleReturnMechanics", null],
  ["domain", "film-catalog", "FilmCatalog", null],
  ["domain", "membership-fee-mechanics", "MembershipFeeMechanics", null],
  ["domain", "movie-return-mechanics", "MovieReturnMechanics", "core"],
  ["domain", "new-release-unlock-mechanics", "NewReleaseUnlockMechanics", null],
];

const staleStandaloneSchemas = [
  resolve(repositoryDirectory, "projects/game-data-exporter/schemas/validation/movie-return-validation.schema.json"),
  ...[
    "console-return-mechanics",
    "film-catalog",
    "membership-fee-mechanics",
    "new-release-unlock-mechanics",
  ].map((name) => resolve(packageDirectory, "schemas", `${name}.schema.json`)),
];

const errors = [];
for (const [category, fileName, symbol, standaloneOwner] of contracts) {
  const source = resolve(packageDirectory, "src/contracts", category, `${fileName}.ts`);
  const module = await import(pathToFileURL(source));
  const definition = module[`${symbol}JsonSchema`];
  const typeDefinition = prepareForTypeGeneration(definition);
  const generatedType = await compile(
    { ...typeDefinition, title: `${symbol}Contract` },
    `${symbol}Contract`,
    {
      bannerComment: `// Generated from src/contracts/${category}/${fileName}.ts by pnpm contracts:generate. Do not edit.`,
      additionalProperties: false,
      unknownAny: true,
      style: { semi: true, singleQuote: false, tabWidth: 2 },
    },
  );
  const typeDestination = resolve(
    packageDirectory,
    "src/contracts/generated",
    category,
    `${fileName}.ts`,
  );
  await synchronize(typeDestination, generatedType);

  if (standaloneOwner !== null) {
    const schemaDestination = standaloneOwner === "core"
      ? resolve(packageDirectory, "schemas", `${fileName}.schema.json`)
      : resolve(
          repositoryDirectory,
          "projects/game-data-exporter/schemas",
          category,
          `${fileName}.schema.json`,
        );
    await synchronize(schemaDestination, `${JSON.stringify(definition, null, 2)}\n`);
  }
}

function prepareForTypeGeneration(root) {
  return visit(root);

  function visit(value) {
    if (Array.isArray(value)) {
      return value.map(visit);
    }
    if (value === null || typeof value !== "object") {
      return value;
    }

    const visited = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, visit(item)]),
    );
    if (Array.isArray(visited.prefixItems)) {
      const additionalItems = "items" in visited ? visited.items : false;
      visited.items = visited.prefixItems;
      visited.additionalItems = additionalItems;
      delete visited.prefixItems;
    }
    if (!("type" in visited || "const" in visited || "enum" in visited)) {
      if (
        typeof visited.pattern === "string" ||
        typeof visited.minLength === "number" ||
        typeof visited.maxLength === "number"
      ) {
        visited.type = "string";
      } else if (
        typeof visited.minimum === "number" ||
        typeof visited.maximum === "number" ||
        typeof visited.exclusiveMinimum === "number" ||
        typeof visited.exclusiveMaximum === "number"
      ) {
        visited.type = "number";
      } else if (
        typeof visited.minItems === "number" ||
        typeof visited.maxItems === "number" ||
        "contains" in visited
      ) {
        visited.type = "array";
      }
    }
    if (typeof visited.$ref === "string" && visited.$ref.startsWith("#/")) {
      const siblingProperties = visited.properties;
      if (siblingProperties && typeof siblingProperties === "object") {
        const referenced = resolveReference(root, visited.$ref);
        const required = new Set(referenced.required ?? []);
        const requiredSiblingProperties = Object.keys(siblingProperties).filter((key) =>
          required.has(key),
        );
        if (requiredSiblingProperties.length > 0) {
          visited.required = [
            ...new Set([...(visited.required ?? []), ...requiredSiblingProperties]),
          ];
        }
      }
    }
    if (Array.isArray(visited.allOf)) {
      const reference = visited.allOf.find(
        (item) => typeof item?.$ref === "string" && item.$ref.startsWith("#/"),
      )?.$ref;
      if (reference) {
        const required = new Set(resolveReference(root, reference).required ?? []);
        visited.allOf = visited.allOf.map((item) => {
          if (!item?.properties || typeof item.properties !== "object") {
            return item;
          }
          const requiredProperties = Object.keys(item.properties).filter((key) =>
            required.has(key),
          );
          return requiredProperties.length === 0
            ? item
            : {
                ...item,
                required: [...new Set([...(item.required ?? []), ...requiredProperties])],
              };
        });
      }
    }
    return visited;
  }
}

function resolveReference(root, reference) {
  let current = root;
  for (const encodedSegment of reference.slice(2).split("/")) {
    const segment = encodedSegment.replaceAll("~1", "/").replaceAll("~0", "~");
    current = current[segment];
  }
  return current;
}

for (const stalePath of staleStandaloneSchemas) {
  try {
    await readFile(stalePath);
    if (checkOnly) {
      errors.push(`${stalePath} must not exist`);
    } else {
      await unlink(stalePath);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

if (errors.length > 0) {
  throw new Error(`Generated artifact contracts are stale:\n${errors.join("\n")}`);
}

async function synchronize(destination, expected) {
  if (checkOnly) {
    let actual;
    try {
      actual = await readFile(destination, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") {
        errors.push(`${destination} is missing`);
        return;
      }
      throw error;
    }
    if (actual !== expected) {
      errors.push(`${destination} differs from its canonical TypeScript schema`);
    }
    return;
  }

  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, expected, "utf8");
}
