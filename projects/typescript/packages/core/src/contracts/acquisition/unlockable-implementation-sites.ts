import { type } from "arktype";
import {
  withContains,
  withUniqueItems,
  without,
} from "../contract-constraints.ts";

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
  candidatePackageCount: type("number.integer").atLeast(1),
  scannedPackageCount: type("number.integer").atLeast(0),
  failedPackageCount: type("number.integer").atLeast(0),
  classCount: type("number.integer").atLeast(1),
  functionCount: type("number.integer").atLeast(1),
  blueprintInheritanceLinkCount: type("number.integer").atLeast(0),
  derivedClassCount: type("number.integer").atLeast(0),
  overrideCount: type("number.integer").atLeast(0),
  managerEventGraphCount: type.unit(1),
  callSiteCount: type("number.integer").atLeast(0),
  "+": "reject",
}).readonly();
const $definitionPackagePath = type("string")
  .matching(new RegExp("\\.uasset$"))
  .atLeastLength(1);
const $definitionDerivedClass = type({
  packagePath: $definitionPackagePath,
  className: $definitionNonEmptyString,
  classPath: $definitionNonEmptyString,
  superclassPath: $definitionNonEmptyString,
  inheritancePath: withContains(
    withUniqueItems(
      type([
        $definitionNonEmptyString,
        $definitionNonEmptyString,
        "...",
        $definitionNonEmptyString.array(),
      ]).readonly(),
    ),
    type.unit(
      "ExampleGame/Content/ExampleProject/core/blueprint/research/BP_ExampleItem.BP_ExampleItem_C",
    ),
    1,
    1,
  ),
  "+": "reject",
}).readonly();
const $definitionFunctionSite = type({
  packagePath: $definitionPackagePath,
  className: $definitionNonEmptyString,
  classPath: $definitionNonEmptyString,
  functionName: $definitionNonEmptyString,
  functionPath: $definitionNonEmptyString,
  flags: $definitionNonEmptyString,
  bytecodeExpressionCount: type("number.integer").atLeast(0),
  "+": "reject",
}).readonly();
const $definitionCallSite = type({
  targetFunctionName: type.enumerated(
    "CanApplyExample",
    "IsExampleEligible",
    "ApplyExample",
    "TryApplyExample",
  ),
  packagePath: $definitionPackagePath,
  className: $definitionNonEmptyString,
  classPath: $definitionNonEmptyString,
  functionName: $definitionNonEmptyString,
  functionPath: $definitionNonEmptyString,
  callKind: type.enumerated("virtual", "local-virtual", "final", "local-final"),
  statementIndex: type("number.integer").atLeast(0),
  "+": "reject",
}).readonly();
const $definitionFailure = type({
  packagePath: $definitionPackagePath,
  errorType: type("string").matching(new RegExp("^[A-Za-z][A-Za-z0-9._+`]*$")),
  "+": "reject",
}).readonly();

export const UnlockableImplementationSitesSchema = type.and(
  type({
    artifactType: type.unit("unlockable-implementation-sites"),
    build: $definitionBuildReference,
    staticCensus: $definitionInputIdentity,
    unlockableEvidence: $definitionInputIdentity,
    unlockableFunctionTrace: $definitionInputIdentity,
    mappings: $definitionMappingIdentity,
    engine: $definitionEngineIdentity,
    extractor: $definitionExtractorIdentity,
    baseClassPath: type.unit(
      "ExampleGame/Content/ExampleProject/core/blueprint/research/BP_ExampleItem.BP_ExampleItem_C",
    ),
    targetFunctionNames: withUniqueItems(
      type([
        type.unit("CanApplyExample"),
        type.unit("IsExampleEligible"),
        type.unit("ApplyExample"),
        type.unit("TryApplyExample"),
      ])
        .readonly()
        .atMostLength(4),
    ),
    candidateRule: type.unit(
      "parsed-packages-with-generated-blueprint-class-exports",
    ),
    coverage: type.enumerated("complete", "partial"),
    totals: $definitionTotals,
    derivedClasses: withUniqueItems($definitionDerivedClass.array().readonly()),
    overrides: withUniqueItems(
      type
        .and(
          $definitionFunctionSite,
          type({
            "functionName?": type.enumerated("IsExampleEligible", "ApplyExample"),
          }).readonly(),
        )
        .array()
        .readonly(),
    ),
    managerEventGraphs: type([
      type.and(
        $definitionFunctionSite,
        type({
          "packagePath?": type.unit(
            "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.uasset",
          ),
          "className?": type.unit("ExampleUnlockSystem_C"),
          "classPath?": type.unit(
            "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C",
          ),
          "functionName?": type.unit("ExecuteExampleGraph_ExampleUnlockSystem"),
          "functionPath?": type.unit(
            "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C:ExecuteExampleGraph_ExampleUnlockSystem",
          ),
          "bytecodeExpressionCount?": type("number").atLeast(1),
        }).readonly(),
      ),
      "...",
      type
        .and(
          $definitionFunctionSite,
          type({
            "packagePath?": type.unit(
              "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.uasset",
            ),
            "className?": type.unit("ExampleUnlockSystem_C"),
            "classPath?": type.unit(
              "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C",
            ),
            "functionName?": type.unit("ExecuteExampleGraph_ExampleUnlockSystem"),
            "functionPath?": type.unit(
              "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C:ExecuteExampleGraph_ExampleUnlockSystem",
            ),
            "bytecodeExpressionCount?": type("number").atLeast(1),
          }).readonly(),
        )
        .array(),
    ])
      .readonly()
      .atMostLength(1),
    callSites: withUniqueItems($definitionCallSite.array().readonly()),
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
export type UnlockableImplementationSites =
  typeof UnlockableImplementationSitesSchema.infer;
