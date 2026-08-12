namespace NeonRetroRewind.StaticExtractor;

internal sealed record StatisticEvidence(
    string ArtifactType,
    CensusBuildReference Build,
    StatisticEvidenceInput StaticCensus,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    StatisticEvidenceTotals Totals,
    IReadOnlyList<StatisticPackageEvidence> Packages);

internal sealed record StatisticEvidenceInput(
    string FileName,
    long SizeBytes,
    string Sha256);

internal sealed record StatisticEvidenceTotals(
    int PackageCount,
    int BlueprintClassCount,
    int UserDefinedStructCount,
    int FunctionCount,
    int FieldCount,
    int DefaultPropertyCount,
    int ReferenceCount);

internal sealed record StatisticPackageEvidence(
    string Path,
    IReadOnlyList<BlueprintClassEvidence> BlueprintClasses,
    IReadOnlyList<UserDefinedStructEvidence> UserDefinedStructs);
