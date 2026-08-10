// Generated from src/contracts/runtime/runtime-host-staging.ts by pnpm contracts:generate. Do not edit.

export type RuntimeHostStagingContract = {
  artifactType: "runtime-host-staging";
  build: Build;
  runtimeHost: RuntimeHost;
  probe?: Probe;
  collector?: Collector;
  gameDirectory: GameDirectory;
  /**
   * @minItems 2
   * @maxItems 2
   */
  proposedFiles: [
    ProposedFile & {
      relativePath: "dwmapi.dll";
      sourceRelativePath: "install/dwmapi.dll";
    },
    ProposedFile & {
      relativePath: "override.txt";
      sourceRelativePath: "install/override.txt";
    }
  ];
} & (
  | {
      probe: Probe;
      collector?: never;
    }
  | {
      probe?: never;
      collector: Collector;
    }
);
export type Sha256 = string;

export interface Build {
  steamAppId: "3552140";
  steamBuildId: string;
  buildManifest: FileIdentity;
  executable: FileIdentity;
}
export interface FileIdentity {
  fileName: string;
  sizeBytes: number;
  sha256: Sha256;
}
export interface RuntimeHost {
  name: "UE4SS";
  version: "3.0.1-1018-g662df915";
  archive: FileIdentity & {
    sha256: "caa0f9a6c2ca372c2be5042668b2e86d1cc3bf45fa069a689552314d97f9ee9e";
  };
}
export interface Probe {
  name: "NeonRetroRewindMovieReturnProbe";
  version: string;
  source: FileIdentity & {
    fileName: "main.lua";
    sizeBytes: 15068;
    sha256: "5c8f29dfe42d5e2f7b8ba866d8df1bfd3c5620101f6253f697e3c1111f20657a";
  };
  diagnosticRelativePath: "diagnostics/movie-return-compatibility-probe.json";
}
export interface Collector {
  name: "NeonRetroRewindMovieReturnCollector";
  version: "0.1.7";
  binary: FileIdentity & {
    fileName: "main.dll";
  };
  config: FileIdentity & {
    fileName: "config.json";
  };
  observationSchema: FileIdentity & {
    fileName: "movie-return-observation.schema.json";
  };
  targetMechanics: {
    fileName: "movie-return-mechanics.json";
    sizeBytes: number;
    sha256: Sha256;
    artifactType: "movie-return-mechanics";
  };
  observationOutputRootAbsolutePath: string;
}
export interface GameDirectory {
  absolutePath: string;
}
export interface ProposedFile {
  relativePath: "dwmapi.dll" | "override.txt";
  sourceRelativePath: "install/dwmapi.dll" | "install/override.txt";
  sizeBytes: number;
  sha256: Sha256;
}
