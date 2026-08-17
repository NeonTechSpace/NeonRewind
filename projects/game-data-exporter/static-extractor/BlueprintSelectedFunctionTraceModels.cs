namespace NeonRetroRewind.StaticExtractor;

internal sealed record BlueprintSelectedFunctionTrace(
    string ArtifactType,
    CensusBuildReference Build,
    BlueprintSelectedFunctionTraceInput FunctionInventory,
    string SelectionRule,
    IReadOnlyList<string> RequestedFunctionPaths,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    BlueprintFunctionTraceTotals Totals,
    IReadOnlyList<BlueprintTracedFunction> Functions);

internal sealed record BlueprintSelectedFunctionTraceInput(
    string FileName,
    long SizeBytes,
    string Sha256,
    string ArtifactType,
    string InventoryRule);
