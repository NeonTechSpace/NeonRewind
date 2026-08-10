namespace NeonRetroRewind.StaticExtractor;

internal sealed record BlueprintCallTargetTrace(
    string ArtifactType,
    CensusBuildReference Build,
    BlueprintCallCandidateSourceTrace SourceTrace,
    BlueprintCallTargetDeclarationsInput Declarations,
    BlueprintRecordedCall RecordedCall,
    BlueprintVerifiedCallTarget Binding,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor);

internal sealed record BlueprintCallTargetDeclarationsInput(
    string FileName,
    long SizeBytes,
    string Sha256,
    string ArtifactType,
    string TargetFunctionName,
    string DeclarationRule);

internal sealed record BlueprintVerifiedCallTarget(
    string BindingRule,
    string Relationship,
    bool ReceiverClassMatchesDeclarationOwner,
    bool ArgumentCountMatchesParameterCount,
    BlueprintCallReceiver Receiver,
    BlueprintCallTargetDeclaration Declaration,
    BlueprintTracedFunction Function);

internal sealed record BlueprintCallReceiver(
    int ContextStatementIndex,
    string ContextOpcode,
    string CallEdge,
    int ReceiverStatementIndex,
    string ReceiverOpcode,
    string ReceiverEdge,
    string ObjectName,
    string ObjectPath,
    string ClassPath,
    string ExportType);

internal sealed record BlueprintCallTargetDeclaration(
    string PackagePath,
    int PackageExportIndex,
    string ObjectPath,
    string OwnerPath,
    BlueprintFunctionSignature Signature);

internal sealed record BlueprintResolvedCallTarget(
    BlueprintCallReceiver Receiver,
    BlueprintTracedFunctionWithSignature Target);
