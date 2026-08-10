namespace NeonRetroRewind.StaticExtractor;

internal sealed record BlueprintCallSites(
    string ArtifactType,
    CensusBuildReference Build,
    StaticCensusInput StaticCensus,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    BlueprintCallTarget Target,
    string CandidateRule,
    string Coverage,
    BlueprintCallSitesTotals Totals,
    IReadOnlyList<BlueprintCallSite> CallSites,
    IReadOnlyList<BlueprintCallSiteFailure> Failures);

internal sealed record StaticCensusInput(
    string FileName,
    long SizeBytes,
    string Sha256);

internal sealed record BlueprintCallTarget(string FunctionName);

internal sealed record BlueprintCallSitesTotals(
    int CandidatePackageCount,
    int ScannedPackageCount,
    int FailedPackageCount,
    int ClassCount,
    int FunctionCount,
    int CallSiteCount);

internal sealed record BlueprintCallSite(
    string PackagePath,
    string ClassName,
    string ClassPath,
    string FunctionName,
    string FunctionPath,
    string CallKind,
    int StatementIndex);

internal sealed record BlueprintNamedCallSite(
    string TargetFunctionName,
    string PackagePath,
    string ClassName,
    string ClassPath,
    string FunctionName,
    string FunctionPath,
    string CallKind,
    int StatementIndex);

internal sealed record BlueprintCallSiteFailure(string PackagePath, string ErrorType);
