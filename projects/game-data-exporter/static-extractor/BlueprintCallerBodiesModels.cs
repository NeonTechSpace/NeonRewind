namespace NeonRetroRewind.StaticExtractor;

internal sealed record BlueprintCallerBodies(
    string ArtifactType,
    CensusBuildReference Build,
    BlueprintCallSitesInput CallSites,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    BlueprintCallTarget Target,
    BlueprintCallerBodiesTotals Totals,
    IReadOnlyList<BlueprintCallerFunctionBody> Functions);

internal sealed record BlueprintCallSitesInput(
    string FileName,
    long SizeBytes,
    string Sha256);

internal sealed record BlueprintCallerBodiesTotals(
    int PackageCount,
    int ClassCount,
    int FunctionCount,
    int CallSiteCount,
    int PseudoCodeCharacterCount);

internal sealed record BlueprintCallerFunctionBody(
    string PackagePath,
    string ClassName,
    string ClassPath,
    string FunctionName,
    string FunctionPath,
    string Flags,
    int BytecodeExpressionCount,
    IReadOnlyList<BlueprintCallerFunctionCall> Calls,
    string PseudoCode);

internal sealed record BlueprintCallerFunctionCall(string CallKind, int StatementIndex);
