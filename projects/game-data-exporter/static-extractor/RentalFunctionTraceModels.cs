namespace NeonRetroRewind.StaticExtractor;

internal sealed record RentalFunctionTrace(
    string ArtifactType,
    CensusBuildReference Build,
    RentalFunctionTraceInput RentalBlueprintBodies,
    IReadOnlyList<string> RequestedFunctionPaths,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    BlueprintFunctionTraceTotals Totals,
    IReadOnlyList<BlueprintTracedFunction> Functions);

internal sealed record RentalFunctionTraceInput(
    string FileName,
    long SizeBytes,
    string Sha256);
