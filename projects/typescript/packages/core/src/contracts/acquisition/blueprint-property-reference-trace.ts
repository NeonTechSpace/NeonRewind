import { type } from "arktype";
import { withExactlyOneOf, withUniqueItems } from "../contract-constraints.ts";

const $definitionSha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const $definitionBuildReference = type({
  manifestSha256: $definitionSha256,
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();
const $definitionFileName = type("string")
  .matching(new RegExp("^[^/\\\\]+$"))
  .atLeastLength(1);
const $definitionNonEmptyString = type("string")
  .matching(new RegExp("^[^\\u0000-\\u001f\\u007f-\\u009f]+$"))
  .atLeastLength(1)
  .atMostLength(1024);
const $definitionCallerBodyInput = type({
  fileName: type.and(
    $definitionFileName,
    type("string").matching(new RegExp("\\.json$")),
  ),
  sizeBytes: type("number.integer").atLeast(1),
  sha256: $definitionSha256,
  targetFunctionName: $definitionNonEmptyString,
  "+": "reject",
}).readonly();
const $definitionMappingIdentity = type({
  fileName: type.and(
    $definitionFileName,
    type("string").matching(new RegExp("\\.usmap$")),
  ),
  sizeBytes: type("number.integer").atLeast(16),
  sha256: $definitionSha256,
  formatVersion: type.unit(4),
  "+": "reject",
}).readonly();
const $definitionEngineIdentity = type({
  version: type.unit("5.4"),
  cue4ParseProfile: type.unit("GAME_UE5_4"),
  source: type.unit("configured"),
  confidence: type.unit("probable"),
  "+": "reject",
}).readonly();
const $definitionExtractorIdentity = type({
  name: type.unit("NeonRetroRewind.StaticExtractor"),
  version: $definitionNonEmptyString,
  cue4ParseVersion: $definitionNonEmptyString,
  "+": "reject",
}).readonly();
const $definitionTotals = type({
  packageCount: type("number.integer").atLeast(1),
  classCount: type("number.integer").atLeast(1),
  functionCount: type("number.integer").atLeast(1),
  nodeCount: type("number.integer").atLeast(1),
  callCount: type("number.integer").atLeast(0),
  branchCount: type("number.integer").atLeast(0),
  entrypointCount: type("number.integer").atLeast(0),
  "+": "reject",
}).readonly();
const $definitionIntegerArgument = type({
  position: type("number.integer").atLeast(0),
  value: type("string").matching(new RegExp("^-?(0|[1-9][0-9]*)$")),
  "+": "reject",
}).readonly();
const $definitionCall = type({
  callKind: type.enumerated("virtual", "local-virtual", "final", "local-final"),
  functionName: $definitionNonEmptyString,
  argumentCount: type("number.integer").atLeast(0),
  integerArguments: withUniqueItems(
    $definitionIntegerArgument.array().readonly(),
  ),
  "+": "reject",
}).readonly();
const $definitionJumpTarget = type({
  edge: type("string").atLeastLength(1),
  offset: type("number.integer").atLeast(0),
  "+": "reject",
}).readonly();
const $definitionJump = type({
  jumpKind: type.enumerated(
    "unconditional",
    "conditional-false",
    "computed",
    "push-flow",
    "pop-flow",
    "pop-flow-if-false",
    "switch",
  ),
  targets: $definitionJumpTarget.array().readonly(),
  "+": "reject",
}).readonly();
const $definitionLiteral = type({
  literalType: type.enumerated(
    "integer",
    "number",
    "string",
    "name",
    "boolean",
    "null",
    "object",
  ),
  value: type("string"),
  "+": "reject",
}).readonly();
const $definitionNode = type({
  nodeIndex: type("number.integer").atLeast(0),
  parentNodeIndex: type.or(type("number.integer").atLeast(0), type("null")),
  edge: type("string").atLeastLength(1),
  depth: type("number.integer").atLeast(0),
  statementIndex: type("number.integer").atLeast(-1),
  opcode: type("string").matching(new RegExp("^EX_")),
  kind: type.enumerated(
    "call",
    "branch",
    "literal",
    "return",
    "assignment",
    "variable",
    "context",
    "operation",
  ),
  symbol: type.or(
    type("string").atLeastLength(1).atMostLength(1024),
    type("null"),
  ),
  call: withExactlyOneOf(type.or($definitionCall, type("null")), [
    $definitionCall,
    type("null"),
  ]),
  jump: withExactlyOneOf(type.or($definitionJump, type("null")), [
    $definitionJump,
    type("null"),
  ]),
  literal: withExactlyOneOf(type.or($definitionLiteral, type("null")), [
    $definitionLiteral,
    type("null"),
  ]),
  "+": "reject",
}).readonly();
const $definitionFunction = type({
  packagePath: type("string")
    .matching(new RegExp("\\.uasset$"))
    .atLeastLength(1),
  className: $definitionNonEmptyString,
  classPath: $definitionNonEmptyString,
  functionName: $definitionNonEmptyString,
  functionPath: $definitionNonEmptyString,
  flags: $definitionNonEmptyString,
  bytecodeExpressionCount: type("number.integer").atLeast(1),
  nodes: type([$definitionNode, "...", $definitionNode.array()]).readonly(),
  "+": "reject",
}).readonly();
const $definitionPropertyReferencesInput = type({
  fileName: type.and(
    $definitionFileName,
    type("string").matching(new RegExp("\\.json$")),
  ),
  sizeBytes: type("number.integer").atLeast(1),
  sha256: $definitionSha256,
  targetPropertyName: type("string")
    .matching(new RegExp("^[^\\u0000-\\u001f\\u007f-\\u009f]+$"))
    .atLeastLength(1)
    .atMostLength(256),
  "+": "reject",
}).readonly();

export const BlueprintPropertyReferenceTraceSchema = type({
  artifactType: type.unit("blueprint-property-reference-trace"),
  build: $definitionBuildReference,
  blueprintPropertyReferences: $definitionPropertyReferencesInput,
  requestedFunctionPaths: withUniqueItems(
    type([
      type("string").atLeastLength(1).atMostLength(1024),
      "...",
      type("string").atLeastLength(1).atMostLength(1024).array(),
    ]).readonly(),
  ),
  selectionRule: type.enumerated(
    "explicit-functions-with-read-references",
    "explicit-functions-with-recorded-references",
  ),
  mappings: $definitionMappingIdentity,
  engine: $definitionEngineIdentity,
  extractor: $definitionExtractorIdentity,
  totals: $definitionTotals,
  functions: withUniqueItems(
    type([$definitionFunction, "...", $definitionFunction.array()]).readonly(),
  ),
  "+": "reject",
}).readonly();
export type BlueprintPropertyReferenceTrace =
  typeof BlueprintPropertyReferenceTraceSchema.infer;
