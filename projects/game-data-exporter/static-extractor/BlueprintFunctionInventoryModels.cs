namespace NeonRetroRewind.StaticExtractor;

internal sealed record BlueprintFunctionInventory(
    string ArtifactType,
    CensusBuildReference Build,
    StaticCensusInput StaticCensus,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    string CandidateRule,
    string InventoryRule,
    string Coverage,
    BlueprintFunctionInventoryTotals Totals,
    IReadOnlyList<BlueprintFunctionDeclaration> Functions,
    IReadOnlyList<BlueprintCallSiteFailure> Failures);

internal sealed record BlueprintFunctionInventoryTotals(
    int CandidatePackageCount,
    int ScannedPackageCount,
    int FailedPackageCount,
    int RawFunctionExportCount,
    int InventoriedFunctionCount);
