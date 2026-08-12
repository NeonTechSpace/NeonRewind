import { type } from "arktype";

const $definitionSha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const $definitionBuild = type({
  steamAppId: type.unit("3552140"),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();
const $definitionTargetMechanics = type({
  fileName: type.unit("movie-return-mechanics.json"),
  sizeBytes: type("number.integer").atLeast(1),
  sha256: $definitionSha256,
  artifactType: type.unit("movie-return-mechanics"),
  "+": "reject",
}).readonly();
const $definitionCollector = type({
  name: type.unit("NeonRetroRewind.MovieReturnRuntimeCollector"),
  version: type.unit("0.1.7"),
  "+": "reject",
}).readonly();
const $definitionRuntimeHost = type({
  name: type.unit("UE4SS"),
  version: type.unit("3.0.1-1018-g662df915"),
  "+": "reject",
}).readonly();
const $definitionObservationSchema = type({
  fileName: type.unit("movie-return-observation.schema.json"),
  sizeBytes: type("number.integer").atLeast(1),
  sha256: $definitionSha256,
  stagedRelativePath: type.unit(
    "mods/NeonRetroRewindMovieReturnCollector/movie-return-observation.schema.json",
  ),
  "+": "reject",
}).readonly();

export const MovieReturnRuntimeCollectorConfigSchema = type({
  artifactType: type.unit("movie-return-runtime-collector-config"),
  build: $definitionBuild,
  targetMechanics: $definitionTargetMechanics,
  collector: $definitionCollector,
  runtimeHost: $definitionRuntimeHost,
  observationSchema: $definitionObservationSchema,
  observationOutputRootAbsolutePath: type("string").atLeastLength(1),
  "+": "reject",
}).readonly();
export type MovieReturnRuntimeCollectorConfig =
  typeof MovieReturnRuntimeCollectorConfigSchema.infer;
