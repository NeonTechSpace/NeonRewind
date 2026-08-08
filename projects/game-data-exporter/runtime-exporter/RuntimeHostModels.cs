using System.Text.Json.Serialization;

namespace NeonRewind.RuntimeExporter;

internal sealed record BuildManifestInput(
    [property: JsonPropertyName("artifactType")] string ArtifactType,
    [property: JsonPropertyName("schemaVersion")] int SchemaVersion,
    [property: JsonPropertyName("steam")] SteamIdentityInput Steam,
    [property: JsonPropertyName("executable")] FileIdentityInput Executable,
    [property: JsonPropertyName("engine")] EngineIdentityInput Engine);

internal sealed record SteamIdentityInput(
    [property: JsonPropertyName("appId")] string AppId,
    [property: JsonPropertyName("buildId")] string BuildId);

internal sealed record EngineIdentityInput(
    [property: JsonPropertyName("version")] string Version);

internal sealed record FileIdentityInput(
    [property: JsonPropertyName("fileName")] string FileName,
    [property: JsonPropertyName("sizeBytes")] long SizeBytes,
    [property: JsonPropertyName("sha256")] string Sha256);

internal sealed record RuntimeHostStagingManifest(
    string ArtifactType,
    int SchemaVersion,
    RuntimeBuildIdentity Build,
    RuntimeHostIdentity RuntimeHost,
    ProbeIdentity Probe,
    GameDirectoryIdentity GameDirectory,
    IReadOnlyList<ProposedGameFile> ProposedFiles);

internal sealed record RuntimeBuildIdentity(
    string SteamAppId,
    string SteamBuildId,
    FileIdentity BuildManifest,
    FileIdentity Executable);

internal sealed record RuntimeHostIdentity(
    string Name,
    string Version,
    FileIdentity Archive);

internal sealed record ProbeIdentity(
    string Name,
    string Version,
    FileIdentity Source,
    string DiagnosticRelativePath);

internal sealed record GameDirectoryIdentity(string AbsolutePath);

internal sealed record ProposedGameFile(
    string RelativePath,
    string SourceRelativePath,
    long SizeBytes,
    string Sha256);

internal sealed record RuntimeHostInstallationManifest(
    string ArtifactType,
    int SchemaVersion,
    FileIdentity StagingManifest,
    RuntimeBuildIdentity Build,
    GameDirectoryIdentity GameDirectory,
    IReadOnlyList<InstalledGameFile> InstalledFiles);

internal sealed record InstalledGameFile(
    string RelativePath,
    long SizeBytes,
    string Sha256);

internal sealed record VerifiedStagingManifest(
    string Path,
    string Directory,
    FileIdentity Identity,
    RuntimeHostStagingManifest Manifest,
    string GameDirectory,
    string ExecutablePath,
    IReadOnlyList<VerifiedProposedGameFile> Files);

internal sealed record VerifiedProposedGameFile(
    ProposedGameFile Entry,
    string SourcePath,
    string TargetPath);

internal sealed record VerifiedInstallationManifest(
    string Path,
    FileIdentity Identity,
    RuntimeHostInstallationManifest Manifest,
    VerifiedStagingManifest Staging);

internal sealed record FileIdentity(string FileName, long SizeBytes, string Sha256);
