import { type } from "arktype";
import { withExactlyOneOf } from "../contract-constraints.ts";

const $definitionSha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const $definitionBuildReference = type({
  manifestSha256: $definitionSha256,
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();
const $definitionInputIdentity = type({
  fileName: type("string").matching(new RegExp("^[^/\\\\]+\\.json$")),
  sizeBytes: type("number.integer").atLeast(1),
  sha256: $definitionSha256,
  "+": "reject",
}).readonly();
const $definitionMappingIdentity = type({
  fileName: type("string").matching(new RegExp("^[^/\\\\]+\\.usmap$")),
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
const $definitionNonEmptyString = type("string")
  .atLeastLength(1)
  .atMostLength(4096);
const $definitionExtractorIdentity = type({
  name: type.unit("NeonRetroRewind.StaticExtractor"),
  version: $definitionNonEmptyString,
  cue4ParseVersion: $definitionNonEmptyString,
  "+": "reject",
}).readonly();
const $definitionTotals = type({
  packageCount: type.unit(1),
  classCount: type.unit(1),
  functionCount: type.unit(1),
  nodeCount: type("number.integer").atLeast(1),
  callCount: type("number.integer").atLeast(0),
  branchCount: type("number.integer").atLeast(0),
  entrypointCount: type("number.integer").atLeast(0),
  "+": "reject",
}).readonly();
const $definitionIntegerArgument = type({
  position: type("number.integer").atLeast(0),
  value: type("string").matching(new RegExp("^-?[0-9]+$")),
  "+": "reject",
}).readonly();
const $definitionCall = type({
  callKind: type.enumerated("virtual", "local-virtual", "final", "local-final"),
  functionName: $definitionNonEmptyString,
  argumentCount: type("number.integer").atLeast(0),
  integerArguments: $definitionIntegerArgument.array().readonly(),
  "+": "reject",
}).readonly();
const $definitionJumpTarget = type({
  edge: $definitionNonEmptyString,
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
  edge: $definitionNonEmptyString,
  depth: type("number.integer").atLeast(0),
  statementIndex: type("number.integer").atLeast(0),
  opcode: $definitionNonEmptyString,
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
const $definitionManagerFunction = type({
  packagePath: type.unit(
    "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.uasset",
  ),
  className: type.unit("ExampleUnlockSystem_C"),
  classPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C",
  ),
  functionName: type.unit("ExecuteExampleGraph_ExampleUnlockSystem"),
  functionPath: type.unit(
    "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C:ExecuteExampleGraph_ExampleUnlockSystem",
  ),
  flags: $definitionNonEmptyString,
  bytecodeExpressionCount: type("number.integer").atLeast(1),
  nodes: type([$definitionNode, "...", $definitionNode.array()]).readonly(),
  "+": "reject",
}).readonly();

export const UnlockableManagerTraceSchema = type({
  artifactType: type.unit("unlockable-manager-trace"),
  build: $definitionBuildReference,
  unlockableImplementationSites: $definitionInputIdentity,
  requestedFunctionPaths: type([
    type.unit(
      "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C:ExecuteExampleGraph_ExampleUnlockSystem",
    ),
  ])
    .readonly()
    .atMostLength(1),
  mappings: $definitionMappingIdentity,
  engine: $definitionEngineIdentity,
  extractor: $definitionExtractorIdentity,
  totals: $definitionTotals,
  functions: type([$definitionManagerFunction]).readonly().atMostLength(1),
  "+": "reject",
}).readonly();
export type UnlockableManagerTrace = typeof UnlockableManagerTraceSchema.infer;
