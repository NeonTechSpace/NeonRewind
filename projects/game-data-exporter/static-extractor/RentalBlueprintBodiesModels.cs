namespace NeonRetroRewind.StaticExtractor;

internal sealed record RentalBlueprintBodies(
    string ArtifactType,
    CensusBuildReference Build,
    RentalEvidenceInput RentalEvidence,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    RentalBlueprintBodiesTotals Totals,
    IReadOnlyList<RentalBlueprintClassBody> Classes);

internal sealed record RentalBlueprintBodiesTotals(
    int PackageCount,
    int ClassCount,
    int FunctionCount,
    int BytecodeExpressionCount,
    int PseudoCodeCharacterCount);

internal sealed record RentalBlueprintClassBody(
    string PackagePath,
    string Name,
    string Path,
    IReadOnlyList<RentalBlueprintFunction> Functions,
    string PseudoCode);

internal sealed record RentalBlueprintFunction(
    string Name,
    string Path,
    string Flags,
    int BytecodeExpressionCount);
