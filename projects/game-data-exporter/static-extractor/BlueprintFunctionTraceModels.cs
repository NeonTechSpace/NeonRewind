namespace NeonRetroRewind.StaticExtractor;

internal sealed record BlueprintFunctionTrace(
    string ArtifactType,
    int SchemaVersion,
    CensusBuildReference Build,
    IReadOnlyList<BlueprintFunctionTraceInput> CallerBodies,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    BlueprintFunctionTraceTotals Totals,
    IReadOnlyList<BlueprintTracedFunction> Functions);

internal sealed record BlueprintFunctionTraceInput(
    string FileName,
    long SizeBytes,
    string Sha256,
    int SchemaVersion,
    string TargetFunctionName);

internal sealed record BlueprintFunctionTraceTotals(
    int PackageCount,
    int ClassCount,
    int FunctionCount,
    int NodeCount,
    int CallCount,
    int BranchCount,
    int EntrypointCount);

internal sealed record BlueprintTracedFunction(
    string PackagePath,
    string ClassName,
    string ClassPath,
    string FunctionName,
    string FunctionPath,
    string Flags,
    int BytecodeExpressionCount,
    IReadOnlyList<BlueprintTraceNode> Nodes);

internal sealed record BlueprintTraceNode(
    int NodeIndex,
    int? ParentNodeIndex,
    string Edge,
    int Depth,
    int StatementIndex,
    string Opcode,
    string Kind,
    BlueprintTraceCall? Call,
    BlueprintTraceJump? Jump,
    BlueprintTraceLiteral? Literal);

internal sealed record BlueprintTraceCall(
    string CallKind,
    string FunctionName,
    int ArgumentCount,
    IReadOnlyList<BlueprintTraceIntegerArgument> IntegerArguments);

internal sealed record BlueprintTraceIntegerArgument(int Position, string Value);

internal sealed record BlueprintTraceJump(
    string JumpKind,
    IReadOnlyList<BlueprintTraceJumpTarget> Targets);

internal sealed record BlueprintTraceJumpTarget(string Edge, long Offset);

internal sealed record BlueprintTraceLiteral(string LiteralType, string Value);
