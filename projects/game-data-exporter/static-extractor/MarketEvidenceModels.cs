namespace NeonRetroRewind.StaticExtractor;

internal sealed record MarketEvidenceTargetProfile(
    string ProfileType,
    TargetProfileBuild Build,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    MarketEvidenceTargets Targets);

internal sealed record MarketEvidenceTargets(
    MarketEvidencePackageTarget Manager,
    MarketEvidencePackageTarget Save);

internal sealed record MarketEvidencePackageTarget(string PackagePath);

internal sealed record MarketEvidence(
    string ArtifactType,
    CensusBuildReference Build,
    MarketEvidenceInput StaticCensus,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    TargetProfileIdentity TargetProfile,
    ExtractorIdentity Extractor,
    MarketEvidenceTotals Totals,
    IReadOnlyList<MarketPackageEvidence> Packages);

internal sealed record MarketEvidenceInput(
    string FileName,
    long SizeBytes,
    string Sha256);

internal sealed record MarketEvidenceTotals(
    int PackageCount,
    int BlueprintClassCount,
    int UserDefinedStructCount,
    int FunctionCount,
    int FieldCount,
    int DefaultPropertyCount,
    int ReferenceCount);

internal sealed record MarketPackageEvidence(
    string Role,
    string Path,
    IReadOnlyList<BlueprintClassEvidence> BlueprintClasses,
    IReadOnlyList<UserDefinedStructEvidence> UserDefinedStructs);
