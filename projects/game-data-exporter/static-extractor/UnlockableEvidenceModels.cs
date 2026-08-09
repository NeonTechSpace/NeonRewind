namespace NeonRetroRewind.StaticExtractor;

internal sealed record UnlockableEvidence(
    string ArtifactType,
    CensusBuildReference Build,
    UnlockableEvidenceInput StaticCensus,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    UnlockableEvidenceTotals Totals,
    IReadOnlyList<UnlockablePackageEvidence> Packages);

internal sealed record UnlockableEvidenceInput(
    string FileName,
    long SizeBytes,
    string Sha256);

internal sealed record UnlockableEvidenceTotals(
    int PackageCount,
    int BlueprintClassCount,
    int UserDefinedStructCount,
    int FunctionCount,
    int FieldCount,
    int DefaultPropertyCount,
    int ReferenceCount);

internal sealed record UnlockablePackageEvidence(
    string Path,
    IReadOnlyList<BlueprintClassEvidence> BlueprintClasses,
    IReadOnlyList<UserDefinedStructEvidence> UserDefinedStructs);
