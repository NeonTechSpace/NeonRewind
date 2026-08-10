namespace NeonRetroRewind.StaticExtractor;

internal sealed record BlueprintPropertyReferences(
    string ArtifactType,
    CensusBuildReference Build,
    StaticCensusInput StaticCensus,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    BlueprintPropertyTarget Target,
    string CandidateRule,
    string ReferenceRule,
    string Coverage,
    BlueprintPropertyReferenceTotals Totals,
    IReadOnlyList<BlueprintPropertyReference> References,
    IReadOnlyList<BlueprintCallSiteFailure> Failures);

internal sealed record BlueprintPropertyTarget(string PropertyName);

internal sealed record BlueprintPropertyReferenceTotals(
    int CandidatePackageCount,
    int ScannedPackageCount,
    int FailedPackageCount,
    int ClassCount,
    int FunctionCount,
    int ReferenceCount,
    int ReadCount,
    int WriteCount,
    int MetadataCount);

internal sealed record BlueprintPropertyReference(
    string PackagePath,
    string ClassName,
    string ClassPath,
    string FunctionName,
    string FunctionPath,
    string Access,
    string Opcode,
    string PointerField,
    int StatementIndex);
