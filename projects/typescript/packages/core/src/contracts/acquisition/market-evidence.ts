import { type } from "arktype";

const sha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const nonEmptyString = type("string").atLeastLength(1);
const nonNegativeInteger = type("number.integer").atLeast(0);
const positiveInteger = type("number.integer").atLeast(1);
const packagePath = type("string")
  .matching(new RegExp("\\.uasset$"))
  .atLeastLength(8);
const fileName = type("string")
  .matching(new RegExp("^[^/\\\\]+$"))
  .atLeastLength(1);

const build = type({
  manifestSha256: sha256,
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();

const staticCensus = type({
  fileName: type.and(fileName, type("string").matching(new RegExp("\\.json$"))),
  sizeBytes: positiveInteger,
  sha256,
  "+": "reject",
}).readonly();

const mappings = type({
  fileName: type.and(fileName, type("string").matching(new RegExp("\\.usmap$"))),
  sizeBytes: type("number.integer").atLeast(16),
  sha256,
  formatVersion: type.unit(4),
  "+": "reject",
}).readonly();

const engine = type({
  version: type.unit("5.4"),
  cue4ParseProfile: type.unit("GAME_UE5_4"),
  source: type.unit("configured"),
  confidence: type.unit("probable"),
  "+": "reject",
}).readonly();

const targetProfile = type({
  fileName: type.and(fileName, type("string").matching(new RegExp("\\.json$"))),
  sizeBytes: positiveInteger,
  sha256,
  profileType: type.unit("market-evidence-target-profile"),
  "+": "reject",
}).readonly();

const extractor = type({
  name: type.unit("NeonRetroRewind.StaticExtractor"),
  version: nonEmptyString,
  cue4ParseVersion: nonEmptyString,
  "+": "reject",
}).readonly();

const fields = type({
  name: nonEmptyString,
  type: nonEmptyString,
  arrayDimension: positiveInteger,
  "+": "reject",
})
  .readonly()
  .array()
  .readonly();

const defaults = type({
  name: nonEmptyString,
  type: nonEmptyString,
  arrayIndex: nonNegativeInteger,
  value: type("unknown"),
  "+": "reject",
})
  .readonly()
  .array()
  .readonly();

const references = type({
  propertyPath: nonEmptyString,
  kind: type.enumerated("delegate", "hard", "interface", "soft"),
  objectPath: nonEmptyString,
  "+": "reject",
})
  .readonly()
  .array()
  .readonly();

const blueprintClass = type({
  name: nonEmptyString,
  path: nonEmptyString,
  superclassPath: type.or(nonEmptyString, type("null")),
  functions: nonEmptyString.array().readonly(),
  fields,
  classDefault: type({
    name: nonEmptyString,
    path: nonEmptyString,
    properties: defaults,
    references,
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

const userDefinedStruct = type({
  name: nonEmptyString,
  path: nonEmptyString,
  superStructPath: type.or(nonEmptyString, type("null")),
  fields,
  defaults,
  references,
  "+": "reject",
}).readonly();

const managerPackage = type({
  role: type.unit("market-manager"),
  path: packagePath,
  blueprintClasses: blueprintClass.array().readonly().atLeastLength(1).atMostLength(1),
  userDefinedStructs: type("unknown").array().readonly().atMostLength(0),
  "+": "reject",
}).readonly();

const savePackage = type({
  role: type.unit("market-save"),
  path: packagePath,
  blueprintClasses: type("unknown").array().readonly().atMostLength(0),
  userDefinedStructs: userDefinedStruct.array().readonly().atLeastLength(1).atMostLength(1),
  "+": "reject",
}).readonly();

const marketEvidence = type({
  artifactType: type.unit("market-evidence"),
  build,
  staticCensus,
  mappings,
  engine,
  targetProfile,
  extractor,
  totals: type({
    packageCount: type.unit(2),
    blueprintClassCount: type.unit(1),
    userDefinedStructCount: type.unit(1),
    functionCount: nonNegativeInteger,
    fieldCount: nonNegativeInteger,
    defaultPropertyCount: nonNegativeInteger,
    referenceCount: nonNegativeInteger,
    "+": "reject",
  }).readonly(),
  packages: type([managerPackage, savePackage]).readonly(),
  "+": "reject",
}).readonly();

export const MarketEvidenceSchema = marketEvidence.narrow((value, context) => {
  const blueprint = value.packages[0].blueprintClasses[0];
  const structure = value.packages[1].userDefinedStructs[0];
  if (blueprint === undefined || structure === undefined) {
    return context.reject({ expected: "the required Market exports" });
  }

  const functionCount = blueprint.functions.length;
  const fieldCount = blueprint.fields.length + structure.fields.length;
  const defaultPropertyCount =
    blueprint.classDefault.properties.length + structure.defaults.length;
  const referenceCount =
    blueprint.classDefault.references.length + structure.references.length;

  return value.totals.functionCount === functionCount &&
    value.totals.fieldCount === fieldCount &&
    value.totals.defaultPropertyCount === defaultPropertyCount &&
    value.totals.referenceCount === referenceCount
    ? true
    : context.reject({ expected: "totals derived from the package evidence" });
});

export type MarketEvidence = typeof MarketEvidenceSchema.infer;
