namespace NeonRetroRewind.StaticExtractor;

internal sealed record BlueprintPropertyReferenceTrace(
    string ArtifactType,
    CensusBuildReference Build,
    BlueprintPropertyReferenceTraceInput BlueprintPropertyReferences,
    IReadOnlyList<string> RequestedFunctionPaths,
    string SelectionRule,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    BlueprintFunctionTraceTotals Totals,
    IReadOnlyList<BlueprintTracedFunction> Functions);

internal sealed record BlueprintPropertyReferenceTraceInput(
    string FileName,
    long SizeBytes,
    string Sha256,
    string TargetPropertyName);
