import { type } from "arktype";
import { withUniqueItems, without } from "../contract-constraints.ts";
import {
  BlueprintFunctionDeclarationSchema,
  BlueprintFunctionScanFailureSchema,
} from "./blueprint-function-declarations.ts";

const sha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const buildReference = type({
  manifestSha256: sha256,
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();
const fileName = type("string")
  .matching(new RegExp("^[^/\\\\]+$"))
  .atLeastLength(1);
const inputIdentity = type({
  fileName: type.and(
    fileName,
    type("string").matching(new RegExp("\\.json$")),
  ),
  sizeBytes: type("number.integer").atLeast(1),
  sha256,
  "+": "reject",
}).readonly();
const mappingIdentity = type({
  fileName: type.and(
    fileName,
    type("string").matching(new RegExp("\\.usmap$")),
  ),
  sizeBytes: type("number.integer").atLeast(16),
  sha256,
  formatVersion: type.unit(4),
  "+": "reject",
}).readonly();
const engineIdentity = type({
  version: type.unit("5.4"),
  cue4ParseProfile: type.unit("GAME_UE5_4"),
  source: type.unit("configured"),
  confidence: type.unit("probable"),
  "+": "reject",
}).readonly();
const nonEmptyString = type("string").atLeastLength(1);
const extractorIdentity = type({
  name: type.unit("NeonRetroRewind.StaticExtractor"),
  version: nonEmptyString,
  cue4ParseVersion: nonEmptyString,
  "+": "reject",
}).readonly();
const totals = type({
  candidatePackageCount: type("number.integer").atLeast(0),
  scannedPackageCount: type("number.integer").atLeast(0),
  failedPackageCount: type("number.integer").atLeast(0),
  rawFunctionExportCount: type("number.integer").atLeast(0),
  inventoriedFunctionCount: type("number.integer").atLeast(0),
  "+": "reject",
}).readonly();

const blueprintFunctionInventory = type.and(
  type({
    artifactType: type.unit("blueprint-function-inventory"),
    build: buildReference,
    staticCensus: inputIdentity,
    mappings: mappingIdentity,
    engine: engineIdentity,
    extractor: extractorIdentity,
    candidateRule: type.unit("parsed-packages-with-function-exports"),
    inventoryRule: type.unit("all-raw-function-exports"),
    coverage: type.enumerated("complete", "partial"),
    totals,
    functions: withUniqueItems(
      BlueprintFunctionDeclarationSchema.array().readonly(),
    ),
    failures: withUniqueItems(BlueprintFunctionScanFailureSchema.array().readonly()),
    "+": "reject",
  }).readonly(),
  type.or(
    type({ coverage: type.unit("complete") })
      .readonly()
      .and(
        type({
          "totals?": type({ "failedPackageCount?": type.unit(0) }).readonly(),
          "failures?": type("unknown").array().readonly().atMostLength(0),
        }).readonly(),
      ),
    without(
      type("unknown"),
      type({ coverage: type.unit("complete") }).readonly(),
    ).and(
      type({
        "totals?": type({
          "failedPackageCount?": type("number").atLeast(1),
        }).readonly(),
        "failures?": type([
          type("unknown"),
          "...",
          type("unknown").array(),
        ]).readonly(),
      }).readonly(),
    ),
  ),
);

export const BlueprintFunctionInventorySchema = blueprintFunctionInventory.narrow(
  (value, context) => {
    const { totals, functions, failures } = value;
    return totals.candidatePackageCount ===
      totals.scannedPackageCount + totals.failedPackageCount &&
      totals.failedPackageCount === failures.length &&
      totals.rawFunctionExportCount === totals.inventoriedFunctionCount &&
      totals.inventoriedFunctionCount === functions.length
      ? true
      : context.reject({
          expected: "totals derived from the function inventory",
        });
  },
);

export type BlueprintFunctionInventory =
  typeof BlueprintFunctionInventorySchema.infer;
