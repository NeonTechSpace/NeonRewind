import { type } from "arktype";
import { withUniqueItems } from "../contract-constraints.ts";
import { BlueprintTracedFunctionSchema } from "./blueprint-function-trace.ts";

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
const inventoryInput = type({
  fileName: type.and(
    fileName,
    type("string").matching(new RegExp("\\.json$")),
  ),
  sizeBytes: type("number.integer").atLeast(1),
  sha256,
  artifactType: type.unit("blueprint-function-inventory"),
  inventoryRule: type.unit("all-raw-function-exports"),
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
const nonEmptyString = type("string")
  .matching(new RegExp("^[^\\u0000-\\u001f\\u007f-\\u009f]+$"))
  .atLeastLength(1)
  .atMostLength(1024);
const extractorIdentity = type({
  name: type.unit("NeonRetroRewind.StaticExtractor"),
  version: nonEmptyString,
  cue4ParseVersion: nonEmptyString,
  "+": "reject",
}).readonly();
const totals = type({
  packageCount: type("number.integer").atLeast(1),
  classCount: type("number.integer").atLeast(1),
  functionCount: type("number.integer").atLeast(1),
  nodeCount: type("number.integer").atLeast(1),
  callCount: type("number.integer").atLeast(0),
  branchCount: type("number.integer").atLeast(0),
  entrypointCount: type("number.integer").atLeast(0),
  "+": "reject",
}).readonly();

const blueprintSelectedFunctionTrace = type({
  artifactType: type.unit("blueprint-selected-function-trace"),
  build: buildReference,
  functionInventory: inventoryInput,
  selectionRule: type.unit("exact-inventory-function-path"),
  requestedFunctionPaths: withUniqueItems(
    type([nonEmptyString, "...", nonEmptyString.array()]).readonly(),
  ),
  mappings: mappingIdentity,
  engine: engineIdentity,
  extractor: extractorIdentity,
  totals,
  functions: withUniqueItems(
    type([
      BlueprintTracedFunctionSchema,
      "...",
      BlueprintTracedFunctionSchema.array(),
    ]).readonly(),
  ),
  "+": "reject",
}).readonly();

export const BlueprintSelectedFunctionTraceSchema =
  blueprintSelectedFunctionTrace.narrow((value, context) => {
    const nodes = value.functions.flatMap((function_) => function_.nodes);
    const actualFunctionPaths = value.functions
      .map((function_) => function_.functionPath)
      .toSorted();
    const requestedFunctionPaths = value.requestedFunctionPaths.toSorted();
    const nodeIndexesAreUnique = value.functions.every(
      (function_) =>
        new Set(function_.nodes.map((node) => node.nodeIndex)).size ===
        function_.nodes.length,
    );
    const entrypointCount = nodes.filter(
      (node) =>
        node.call?.argumentCount === 1 &&
        node.call.integerArguments.length === 1 &&
        node.call.functionName.startsWith("ExecuteExampleGraph_") &&
        node.call.integerArguments[0]?.position === 0,
    ).length;

    return actualFunctionPaths.length === requestedFunctionPaths.length &&
      actualFunctionPaths.every(
        (path, index) => path === requestedFunctionPaths[index],
      ) &&
      nodeIndexesAreUnique &&
      value.totals.packageCount ===
        new Set(value.functions.map((function_) => function_.packagePath)).size &&
      value.totals.classCount ===
        new Set(value.functions.map((function_) => function_.classPath)).size &&
      value.totals.functionCount === value.functions.length &&
      value.totals.nodeCount === nodes.length &&
      value.totals.callCount ===
        nodes.filter((node) => node.call !== null).length &&
      value.totals.branchCount ===
        nodes.filter((node) => node.jump !== null).length &&
      value.totals.entrypointCount === entrypointCount
      ? true
      : context.reject({
          expected: "requested functions and totals derived from the selected trace",
        });
  });

export type BlueprintSelectedFunctionTrace =
  typeof BlueprintSelectedFunctionTraceSchema.infer;
