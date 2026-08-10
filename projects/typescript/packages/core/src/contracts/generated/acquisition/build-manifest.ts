// Generated from src/contracts/acquisition/build-manifest.ts by pnpm contracts:generate. Do not edit.

export interface BuildManifestContract {
  artifactType: "build-manifest";
  steam: SteamBuild;
  reportedGameVersion: string | null;
  executable: FileIdentity;
  /**
   * @minItems 1
   */
  packages: [FileIdentity, ...FileIdentity[]];
  engine: EngineIdentity;
  extractor: ExtractorIdentity;
}
export interface SteamBuild {
  appId: string;
  buildId: string;
  name: string;
}
export interface FileIdentity {
  fileName: string;
  sizeBytes: number;
  sha256: string;
}
export interface EngineIdentity {
  version: "5.4";
  cue4ParseProfile: "GAME_UE5_4";
  source: "configured";
  confidence: "probable";
}
export interface ExtractorIdentity {
  name: "NeonRetroRewind.StaticExtractor";
  version: string;
  cue4ParseVersion: string;
}
