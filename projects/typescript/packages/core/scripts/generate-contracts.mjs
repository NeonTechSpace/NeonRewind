import { compile } from "json-schema-to-typescript";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryDirectory = resolve(packageDirectory, "../../../..");
const checkOnly = process.argv.includes("--check");

const contracts = [
  ["acquisition", "blueprint-call-sites", "BlueprintCallSites"],
  ["acquisition", "blueprint-call-candidate-trace", "BlueprintCallCandidateTrace"],
  ["acquisition", "blueprint-call-target-trace", "BlueprintCallTargetTrace"],
  ["acquisition", "blueprint-caller-bodies", "BlueprintCallerBodies"],
  ["acquisition", "blueprint-function-trace", "BlueprintFunctionTrace"],
  ["acquisition", "blueprint-function-declarations", "BlueprintFunctionDeclarations"],
  ["acquisition", "blueprint-property-reference-trace", "BlueprintPropertyReferenceTrace"],
  ["acquisition", "blueprint-property-references", "BlueprintPropertyReferences"],
  ["acquisition", "build-manifest", "BuildManifest"],
  ["acquisition", "rental-blueprint-bodies", "RentalBlueprintBodies"],
  ["acquisition", "rental-evidence", "RentalEvidence"],
  ["acquisition", "rental-function-trace", "RentalFunctionTrace"],
  ["acquisition", "static-census", "StaticCensus"],
  ["acquisition", "structured-asset-index", "StructuredAssetIndex"],
  ["acquisition", "structured-values", "StructuredValues"],
  ["acquisition", "unlockable-evidence", "UnlockableEvidence"],
  ["acquisition", "unlockable-function-trace", "UnlockableFunctionTrace"],
  ["acquisition", "unlockable-implementation-sites", "UnlockableImplementationSites"],
  ["acquisition", "unlockable-manager-trace", "UnlockableManagerTrace"],
  ["runtime", "movie-return-observation", "MovieReturnObservation"],
  ["runtime", "movie-return-runtime-collector-config", "MovieReturnRuntimeCollectorConfig"],
  ["runtime", "runtime-host-installation", "RuntimeHostInstallation"],
  ["runtime", "runtime-host-staging", "RuntimeHostStaging"],
  ["validation", "movie-return-validation", "MovieReturnValidation"],
  ["domain", "console-return-mechanics", "ConsoleReturnMechanics"],
  ["domain", "film-catalog", "FilmCatalog"],
  ["domain", "membership-fee-mechanics", "MembershipFeeMechanics"],
  ["domain", "movie-return-mechanics", "MovieReturnMechanics"],
  ["domain", "new-release-mechanics", "NewReleaseMechanics"],
];

const standaloneSchemas = new Map([
  [
    "runtime/movie-return-observation",
    resolve(repositoryDirectory, "projects/game-data-exporter/schemas/runtime/movie-return-observation.schema.json"),
  ],
  [
    "runtime/movie-return-runtime-collector-config",
    resolve(repositoryDirectory, "projects/game-data-exporter/schemas/runtime/movie-return-runtime-collector-config.schema.json"),
  ],
  [
    "domain/movie-return-mechanics",
    resolve(packageDirectory, "schemas/movie-return-mechanics.schema.json"),
  ],
]);

const staleStandaloneSchemas = [
  resolve(repositoryDirectory, "projects/game-data-exporter/schemas/validation/movie-return-validation.schema.json"),
  ...contracts
    .filter(([category]) => category === "acquisition")
    .map(([, fileName]) => resolve(
      repositoryDirectory,
      "projects/game-data-exporter/schemas/acquisition",
      `${fileName}.schema.json`,
    )),
  ...["runtime-host-installation", "runtime-host-staging"].map((name) => resolve(
    repositoryDirectory,
    "projects/game-data-exporter/schemas/runtime",
    `${name}.schema.json`,
  )),
  ...[
    "console-return-mechanics",
    "film-catalog",
    "membership-fee-mechanics",
    "new-release-mechanics",
  ].map((name) => resolve(packageDirectory, "schemas", `${name}.schema.json`)),
];

const errors = [];
for (const [category, fileName, symbol] of contracts) {
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

  const schemaDestination = standaloneSchemas.get(`${category}/${fileName}`);
  if (schemaDestination !== undefined) {
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
