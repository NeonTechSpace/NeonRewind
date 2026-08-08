namespace NeonRewind.StaticExtractor;

internal sealed record RentalFunctionTrace(
    string ArtifactType,
    int SchemaVersion,
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
    string Sha256,
    int SchemaVersion);
