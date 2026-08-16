import { type } from "arktype";

const sha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const nonEmptyString = type("string").atLeastLength(1);
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
  fileName: type.and(
    fileName,
    type("string").matching(new RegExp("\\.json$")),
  ),
  sizeBytes: type("number.integer").atLeast(1),
  sha256,
  "+": "reject",
}).readonly();
const mappings = type({
  fileName: type.and(
    fileName,
    type("string").matching(new RegExp("\\.usmap$")),
  ),
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
  fileName: type.and(
    fileName,
    type("string").matching(new RegExp("\\.json$")),
  ),
  sizeBytes: type("number.integer").atLeast(1),
  sha256,
  profileType: type.unit("level-progression-target-profile"),
  "+": "reject",
}).readonly();
const extractor = type({
  name: type.unit("NeonRetroRewind.StaticExtractor"),
  version: nonEmptyString,
  cue4ParseVersion: nonEmptyString,
  "+": "reject",
}).readonly();
const source = type({
  packagePath: type("string").matching(new RegExp("\\.uasset$")),
  objectPath: nonEmptyString,
  enumName: nonEmptyString,
  cppForm: type.unit("Namespaced"),
  underlyingType: type.unit("int64"),
  "+": "reject",
}).readonly();
const enumerator = type({
  value: type("number.integer").atLeast(0),
  internalName: nonEmptyString,
  displayName: nonEmptyString,
  "+": "reject",
}).readonly();
const categoryEnum = type({
  source,
  totals: type({
    enumeratorCount: type("number.integer").atLeast(1),
    "+": "reject",
  }).readonly(),
  enumerators: enumerator.array().atLeastLength(1).readonly(),
  "+": "reject",
}).readonly();

export const LevelProgressionCategoryEnumsSchema = type({
  artifactType: type.unit("level-progression-category-enums"),
  build,
  staticCensus,
  mappings,
  engine,
  targetProfile,
  extractor,
  categories: type({
    movie: categoryEnum,
    game: categoryEnum,
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

export type LevelProgressionCategoryEnums =
  typeof LevelProgressionCategoryEnumsSchema.infer;
