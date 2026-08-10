namespace NeonRetroRewind.StaticExtractor;

internal sealed record UnlockableImplementationSites(
    string ArtifactType,
    CensusBuildReference Build,
    StaticCensusInput StaticCensus,
    UnlockableEvidenceInput UnlockableEvidence,
    UnlockableEvidenceInput UnlockableFunctionTrace,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    string BaseClassPath,
    IReadOnlyList<string> TargetFunctionNames,
    string CandidateRule,
    string Coverage,
    UnlockableImplementationSiteTotals Totals,
    IReadOnlyList<UnlockableDerivedClass> DerivedClasses,
    IReadOnlyList<UnlockableFunctionSite> Overrides,
    IReadOnlyList<UnlockableFunctionSite> ManagerEventGraphs,
    IReadOnlyList<BlueprintNamedCallSite> CallSites,
    IReadOnlyList<BlueprintCallSiteFailure> Failures);

internal sealed record UnlockableImplementationSiteTotals(
    int CandidatePackageCount,
    int ScannedPackageCount,
    int FailedPackageCount,
    int ClassCount,
    int FunctionCount,
    int BlueprintInheritanceLinkCount,
    int DerivedClassCount,
    int OverrideCount,
    int ManagerEventGraphCount,
    int CallSiteCount);

internal sealed record UnlockableDerivedClass(
    string PackagePath,
    string ClassName,
    string ClassPath,
    string SuperclassPath,
    IReadOnlyList<string> InheritancePath);

internal sealed record UnlockableFunctionSite(
    string PackagePath,
    string ClassName,
    string ClassPath,
    string FunctionName,
    string FunctionPath,
    string Flags,
    int BytecodeExpressionCount);
