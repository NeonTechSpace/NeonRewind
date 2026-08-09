namespace NeonRetroRewind.StaticExtractor;

internal sealed record BuildManifest(
    string ArtifactType,
    SteamBuildIdentity Steam,
    string? ReportedGameVersion,
    FileIdentity Executable,
    IReadOnlyList<FileIdentity> Packages,
    EngineIdentity Engine,
    ExtractorIdentity Extractor);

internal sealed record SteamBuildIdentity(
    string AppId,
    string BuildId,
    string Name);

internal sealed record FileIdentity(
    string FileName,
    long SizeBytes,
    string Sha256);

internal sealed record EngineIdentity(
    string Version,
    string Cue4ParseProfile,
    string Source,
    string Confidence);

internal sealed record ExtractorIdentity(
    string Name,
    string Version,
    string Cue4ParseVersion);
