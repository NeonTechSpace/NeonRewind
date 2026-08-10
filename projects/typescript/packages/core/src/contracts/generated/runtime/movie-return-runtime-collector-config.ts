// Generated from src/contracts/runtime/movie-return-runtime-collector-config.ts by pnpm contracts:generate. Do not edit.

export type Sha256 = string;

export interface MovieReturnRuntimeCollectorConfigContract {
  artifactType: "movie-return-runtime-collector-config";
  build: Build;
  targetMechanics: TargetMechanics;
  collector: Collector;
  runtimeHost: RuntimeHost;
  observationSchema: ObservationSchema;
  observationOutputRootAbsolutePath: string;
}
export interface Build {
  steamAppId: "3552140";
  steamBuildId: string;
}
export interface TargetMechanics {
  fileName: "movie-return-mechanics.json";
  sizeBytes: number;
  sha256: Sha256;
  artifactType: "movie-return-mechanics";
}
export interface Collector {
  name: "NeonRetroRewind.MovieReturnRuntimeCollector";
  version: "0.1.7";
}
export interface RuntimeHost {
  name: "UE4SS";
  version: "3.0.1-1018-g662df915";
}
export interface ObservationSchema {
  fileName: "movie-return-observation.schema.json";
  sizeBytes: number;
  sha256: Sha256;
  stagedRelativePath: "mods/NeonRetroRewindMovieReturnCollector/movie-return-observation.schema.json";
}
