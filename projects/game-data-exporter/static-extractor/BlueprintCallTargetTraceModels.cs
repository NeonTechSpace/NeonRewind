using System.Text.Json.Serialization;

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
    string ClassPath,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    int? ContextStatementIndex = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? ContextOpcode = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? CallEdge = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    int? ReceiverStatementIndex = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? ReceiverOpcode = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? ReceiverEdge = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? ObjectName = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? ObjectPath = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? ExportType = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    int? CallStatementIndex = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? CallOpcode = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? CallerFunctionPath = null);

internal sealed record BlueprintCallTargetDeclaration(
    string PackagePath,
    int PackageExportIndex,
    string ObjectPath,
    string OwnerPath,
    BlueprintFunctionSignature Signature);

internal sealed record BlueprintResolvedCallTarget(
    string BindingRule,
    BlueprintCallReceiver Receiver,
    BlueprintTracedFunctionWithSignature Target);
