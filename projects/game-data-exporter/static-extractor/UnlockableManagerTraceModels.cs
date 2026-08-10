namespace NeonRetroRewind.StaticExtractor;

internal sealed record UnlockableManagerTrace(
    string ArtifactType,
    CensusBuildReference Build,
    UnlockableEvidenceInput UnlockableImplementationSites,
    IReadOnlyList<string> RequestedFunctionPaths,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    BlueprintFunctionTraceTotals Totals,
    IReadOnlyList<BlueprintTracedFunction> Functions);
