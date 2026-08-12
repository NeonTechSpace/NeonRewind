import { type } from "arktype";
import { withUniqueItems, without } from "../contract-constraints.ts";

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
const $definitionInputIdentity = type({
  fileName: type.and(
    $definitionFileName,
    type("string").matching(new RegExp("\\.json$")),
  ),
  sizeBytes: type("number.integer").atLeast(1),
  sha256: $definitionSha256,
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
const $definitionNonEmptyString = type("string").atLeastLength(1);
const $definitionExtractorIdentity = type({
  name: type.unit("NeonRetroRewind.StaticExtractor"),
  version: $definitionNonEmptyString,
  cue4ParseVersion: $definitionNonEmptyString,
  "+": "reject",
}).readonly();
const $definitionTarget = type({
  functionName: type("string")
    .matching(new RegExp("^[^\\u0000-\\u001f\\u007f-\\u009f]+$"))
    .atLeastLength(1)
    .atMostLength(256),
  "+": "reject",
}).readonly();
const $definitionTotals = type({
  candidatePackageCount: type("number.integer").atLeast(0),
  scannedPackageCount: type("number.integer").atLeast(0),
  failedPackageCount: type("number.integer").atLeast(0),
  rawFunctionExportCount: type("number.integer").atLeast(0),
  matchedDeclarationCount: type("number.integer").atLeast(0),
  "+": "reject",
}).readonly();
const $definitionReference = type({
  packagePath: type("string")
    .matching(new RegExp("\\.uasset$"))
    .atLeastLength(1),
  className: $definitionNonEmptyString,
  classPath: $definitionNonEmptyString,
  functionName: $definitionNonEmptyString,
  functionPath: $definitionNonEmptyString,
  access: type.enumerated("read", "write", "metadata"),
  opcode: $definitionNonEmptyString,
  pointerField: $definitionNonEmptyString,
  statementIndex: type("number.integer").atLeast(0),
  "+": "reject",
}).readonly();
const $definitionFailure = type({
  packagePath: type("string")
    .matching(new RegExp("\\.uasset$"))
    .atLeastLength(1),
  errorType: type("string")
    .matching(new RegExp("^[A-Za-z][A-Za-z0-9._+`]*$"))
    .atLeastLength(1),
  "+": "reject",
}).readonly();
const $definitionParameter = type({
  position: type("number.integer").atLeast(0),
  name: $definitionNonEmptyString,
  type: $definitionNonEmptyString,
  arrayDimension: type("number.integer").atLeast(1),
  flags: $definitionNonEmptyString,
  "+": "reject",
}).readonly();
const $definitionSignature = type({
  parameterCount: type("number.integer").atLeast(0),
  parameters: withUniqueItems($definitionParameter.array().readonly()),
  "+": "reject",
}).readonly();
const $definitionOwnerLinkage = type({
  funcMapContainsDeclaration: type.or(type("boolean"), type("null")),
  childrenContainsDeclaration: type.or(type("boolean"), type("null")),
  superclassPath: type.or(
    type("string").atLeastLength(1).atMostLength(1024),
    type("null"),
  ),
  interfacePaths: withUniqueItems($definitionNonEmptyString.array().readonly()),
  "+": "reject",
}).readonly();
const $definitionDeclaration = type({
  packagePath: type("string")
    .matching(new RegExp("\\.uasset$"))
    .atLeastLength(1),
  packageExportIndex: type("number.integer").atLeast(1),
  objectName: $definitionNonEmptyString,
  objectPath: $definitionNonEmptyString,
  ownerPath: $definitionNonEmptyString,
  ownerExportType: $definitionNonEmptyString,
  flags: $definitionNonEmptyString,
  bytecodeExpressionCount: type.or(
    type("number.integer").atLeast(0),
    type("null"),
  ),
  signature: $definitionSignature,
  ownerLinkage: $definitionOwnerLinkage,
  "+": "reject",
}).readonly();

export const BlueprintFunctionDeclarationsSchema = type.and(
  type({
    artifactType: type.unit("blueprint-function-declarations"),
    build: $definitionBuildReference,
    staticCensus: $definitionInputIdentity,
    mappings: $definitionMappingIdentity,
    engine: $definitionEngineIdentity,
    extractor: $definitionExtractorIdentity,
    target: $definitionTarget,
    candidateRule: type.unit("parsed-packages-with-function-exports"),
    declarationRule: type.unit("exact-raw-function-export-object-name"),
    coverage: type.enumerated("complete", "partial"),
    totals: $definitionTotals,
    declarations: withUniqueItems($definitionDeclaration.array().readonly()),
    failures: withUniqueItems($definitionFailure.array().readonly()),
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
export type BlueprintFunctionDeclarations =
  typeof BlueprintFunctionDeclarationsSchema.infer;
