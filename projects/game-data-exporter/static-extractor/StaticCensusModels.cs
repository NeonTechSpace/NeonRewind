namespace NeonRewind.StaticExtractor;

internal sealed record StaticCensus(
    string ArtifactType,
    int SchemaVersion,
    CensusBuildReference Build,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    CensusTotals Totals,
    IReadOnlyList<CensusFileRecord> Files,
    IReadOnlyList<CensusPackageRecord> Packages,
    IReadOnlyList<CensusCount> ExportClasses,
    IReadOnlyList<CensusCount> FailureTypes);

internal sealed record CensusBuildReference(
    string ManifestSha256,
    int ManifestSchemaVersion,
    string SteamAppId,
    string SteamBuildId);

internal sealed record CensusTotals(
    int FileCount,
    int PackageCount,
    int ParsedPackageCount,
    int FailedPackageCount,
    long ImportCount,
    long ExportCount);

internal sealed record CensusFileRecord(
    string Path,
    long SizeBytes,
    string Extension,
    string Kind,
    bool Encrypted);

internal sealed record CensusPackageRecord(
    string Path,
    string Status,
    string? Format,
    int? ImportCount,
    int? ExportCount,
    IReadOnlyList<CensusCount> ExportClasses,
    string? ErrorType);

internal sealed record CensusCount(
    string Name,
    int Count);
