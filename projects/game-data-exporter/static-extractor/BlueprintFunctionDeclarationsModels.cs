namespace NeonRetroRewind.StaticExtractor;

internal sealed record BlueprintFunctionDeclarations(
    string ArtifactType,
    CensusBuildReference Build,
    StaticCensusInput StaticCensus,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    BlueprintFunctionDeclarationTarget Target,
    string CandidateRule,
    string DeclarationRule,
    string Coverage,
    BlueprintFunctionDeclarationTotals Totals,
    IReadOnlyList<BlueprintFunctionDeclaration> Declarations,
    IReadOnlyList<BlueprintCallSiteFailure> Failures);

internal sealed record BlueprintFunctionDeclarationTarget(string FunctionName);

internal sealed record BlueprintFunctionDeclarationTotals(
    int CandidatePackageCount,
    int ScannedPackageCount,
    int FailedPackageCount,
    int RawFunctionExportCount,
    int MatchedDeclarationCount);

internal sealed record BlueprintFunctionDeclaration(
    string PackagePath,
    int PackageExportIndex,
    string ObjectName,
    string ObjectPath,
    string OwnerPath,
    string OwnerExportType,
    string Flags,
    int? BytecodeExpressionCount,
    BlueprintFunctionSignature Signature,
    BlueprintFunctionOwnerLinkage OwnerLinkage);

internal sealed record BlueprintFunctionOwnerLinkage(
    bool? FuncMapContainsDeclaration,
    bool? ChildrenContainsDeclaration,
    string? SuperclassPath,
    IReadOnlyList<string> InterfacePaths);
