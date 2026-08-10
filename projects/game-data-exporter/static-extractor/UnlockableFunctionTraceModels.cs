namespace NeonRetroRewind.StaticExtractor;

internal sealed record UnlockableFunctionTrace(
    string ArtifactType,
    CensusBuildReference Build,
    UnlockableEvidenceInput UnlockableEvidence,
    IReadOnlyList<string> RequestedFunctionPaths,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    BlueprintFunctionTraceTotals Totals,
    IReadOnlyList<BlueprintTracedFunction> Functions);
