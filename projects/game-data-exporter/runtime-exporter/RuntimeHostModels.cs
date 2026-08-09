using System.Text.Json;
using System.Text.Json.Serialization;

namespace NeonRetroRewind.RuntimeExporter;

internal sealed record BuildManifestInput(
    [property: JsonPropertyName("artifactType")] string ArtifactType,
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
    RuntimeBuildIdentity Build,
    RuntimeHostIdentity RuntimeHost,
    ProbeIdentity? Probe,
    CollectorIdentity? Collector,
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

internal sealed record CollectorIdentity(
    string Name,
    string Version,
    FileIdentity Binary,
    FileIdentity Config,
    FileIdentity ObservationSchema,
    TargetMechanicsIdentity TargetMechanics,
    string ObservationOutputRootAbsolutePath);

internal sealed record TargetMechanicsIdentity(
    string FileName,
    long SizeBytes,
    string Sha256,
    string ArtifactType);

internal sealed record RuntimeCollectorConfig(
    string ArtifactType,
    RuntimeCollectorBuildIdentity Build,
    TargetMechanicsIdentity TargetMechanics,
    RuntimeCollectorIdentity Collector,
    RuntimeCollectorHostIdentity RuntimeHost,
    RuntimeCollectorSchemaIdentity ObservationSchema,
    string ObservationOutputRootAbsolutePath);

internal sealed record RuntimeCollectorBuildIdentity(string SteamAppId, string SteamBuildId);

internal sealed record RuntimeCollectorIdentity(string Name, string Version);

internal sealed record RuntimeCollectorHostIdentity(string Name, string Version);

internal sealed record RuntimeCollectorSchemaIdentity(
    string FileName,
    long SizeBytes,
    string Sha256,
    string StagedRelativePath);

internal sealed record TargetMechanicsInput(
    [property: JsonPropertyName("artifactType")] string ArtifactType,
    [property: JsonPropertyName("build")] RuntimeMechanicsBuildInput Build,
    [property: JsonPropertyName("sources")] JsonElement Sources,
    [property: JsonPropertyName("scope")] string Scope,
    [property: JsonPropertyName("evidenceLevel")] string EvidenceLevel,
    [property: JsonPropertyName("runtimeValidation")] string RuntimeValidation,
    [property: JsonPropertyName("readiness")] JsonElement Readiness,
    [property: JsonPropertyName("selection")] JsonElement Selection);

internal sealed record RuntimeMechanicsBuildInput(
    [property: JsonPropertyName("steamAppId")] string SteamAppId,
    [property: JsonPropertyName("steamBuildId")] string SteamBuildId);

internal sealed record GameDirectoryIdentity(string AbsolutePath);

internal sealed record ProposedGameFile(
    string RelativePath,
    string SourceRelativePath,
    long SizeBytes,
    string Sha256);

internal sealed record RuntimeHostInstallationManifest(
    string ArtifactType,
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

internal enum RuntimeHostPayloadKind
{
    Probe,
    Collector,
}
