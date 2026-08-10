// Generated from src/contracts/runtime/runtime-host-installation.ts by pnpm contracts:generate. Do not edit.

export type Sha256 = string;

export interface RuntimeHostInstallationContract {
  artifactType: "runtime-host-installation";
  stagingManifest: FileIdentity & {
    fileName: "runtime-host-staging.json";
  };
  build: Build;
  gameDirectory: GameDirectory;
  /**
   * @minItems 2
   * @maxItems 2
   */
  installedFiles: [
    InstalledFile & {
      relativePath: "dwmapi.dll";
    },
    InstalledFile & {
      relativePath: "override.txt";
    }
  ];
}
export interface FileIdentity {
  fileName: string;
  sizeBytes: number;
  sha256: Sha256;
}
export interface Build {
  steamAppId: "3552140";
  steamBuildId: string;
  buildManifest: FileIdentity;
  executable: FileIdentity;
}
export interface GameDirectory {
  absolutePath: string;
}
export interface InstalledFile {
  relativePath: "dwmapi.dll" | "override.txt";
  sizeBytes: number;
  sha256: Sha256;
}
