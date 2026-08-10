namespace NeonRetroRewind.StaticExtractor;

internal sealed record BlueprintCallCandidateTrace(
    string ArtifactType,
    CensusBuildReference Build,
    BlueprintCallCandidateSourceTrace SourceTrace,
    BlueprintRecordedCall RecordedCall,
    BlueprintCallCandidate Candidate,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor);

internal sealed record BlueprintCallCandidateSourceTrace(
    string FileName,
    long SizeBytes,
    string Sha256,
    string ArtifactType,
    string TargetPropertyName);

internal sealed record BlueprintRecordedCall(
    string CallerFunctionPath,
    int StatementIndex,
    string Opcode,
    BlueprintTraceCall Call);

internal sealed record BlueprintCallCandidate(
    string SelectionRule,
    string Relationship,
    bool ArgumentCountMatchesParameterCount,
    BlueprintFunctionSignature Signature,
    BlueprintTracedFunction Function);
