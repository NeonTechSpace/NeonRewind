namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintCallTraceSourceValidator
{
    private static readonly IReadOnlySet<string> SupportedCallKinds =
        new HashSet<string>(["virtual", "local-virtual", "final", "local-final"], StringComparer.Ordinal);

    public static BlueprintRecordedCall SelectRecordedCall(
        BlueprintPropertyReferenceTrace source,
        string callerFunctionPath,
        int statementIndex,
        string expectedCallFunctionName,
        string expectedCallKind,
        int expectedArgumentCount)
    {
        var caller = source.Functions.SingleOrDefault(
            function => function.FunctionPath == callerFunctionPath) ??
            throw new InvalidDataException(
                $"Caller function is absent from the source trace: {callerFunctionPath}");
        var matches = caller.Nodes.Where(node =>
                node.StatementIndex == statementIndex &&
                node.Call?.FunctionName == expectedCallFunctionName &&
                node.Call.CallKind == expectedCallKind)
            .ToArray();
        if (matches.Length != 1 || matches[0].Call!.ArgumentCount != expectedArgumentCount)
        {
            throw new InvalidDataException(
                "The expected recorded call is absent or no longer unique at the selected statement.");
        }

        var node = matches[0];
        return new BlueprintRecordedCall(
            caller.FunctionPath,
            node.StatementIndex,
            node.Opcode,
            node.Call!);
    }

    public static void Validate(
        BlueprintPropertyReferenceTrace source,
        BuildManifest manifest,
        string manifestSha256,
        MappingIdentity mappings)
    {
        if (source.ArtifactType != "blueprint-property-reference-trace" ||
            source.Build is null || source.BlueprintPropertyReferences is null ||
            source.RequestedFunctionPaths is null || source.Mappings is null ||
            source.Engine is null || source.Extractor is null || source.Totals is null ||
            source.Functions is null || source.Functions.Count == 0)
        {
            throw new InvalidDataException("Blueprint property-reference trace is incomplete.");
        }

        if (source.Build.ManifestSha256 != manifestSha256 ||
            source.Build.SteamAppId != manifest.Steam.AppId ||
            source.Build.SteamBuildId != manifest.Steam.BuildId ||
            source.Engine != manifest.Engine || source.Mappings != mappings)
        {
            throw new InvalidDataException(
                "Blueprint property-reference trace does not belong to the supplied build and mappings.");
        }

        var nodes = source.Functions.SelectMany(function => function.Nodes).ToArray();
        if (source.SelectionRule != BlueprintPropertyReferenceTraceCommand.SelectionRule ||
            string.IsNullOrWhiteSpace(source.BlueprintPropertyReferences.TargetPropertyName) ||
            source.BlueprintPropertyReferences.TargetPropertyName.Length > 1024 ||
            source.BlueprintPropertyReferences.TargetPropertyName.Any(char.IsControl) ||
            string.IsNullOrWhiteSpace(source.BlueprintPropertyReferences.FileName) ||
            source.BlueprintPropertyReferences.SizeBytes <= 0 ||
            source.BlueprintPropertyReferences.Sha256 is not { Length: 64 } ||
            source.Extractor.Name != "NeonRetroRewind.StaticExtractor" ||
            string.IsNullOrWhiteSpace(source.Extractor.Version) ||
            string.IsNullOrWhiteSpace(source.Extractor.Cue4ParseVersion) ||
            source.RequestedFunctionPaths.Distinct(StringComparer.Ordinal).Count() !=
                source.RequestedFunctionPaths.Count ||
            source.Functions.Select(function => function.FunctionPath)
                .Distinct(StringComparer.Ordinal).Count() != source.Functions.Count ||
            source.RequestedFunctionPaths.Order(StringComparer.Ordinal).SequenceEqual(
                source.Functions.Select(function => function.FunctionPath)
                    .Order(StringComparer.Ordinal)) is false ||
            source.Functions.Any(function =>
                string.IsNullOrWhiteSpace(function.PackagePath) ||
                string.IsNullOrWhiteSpace(function.ClassName) ||
                string.IsNullOrWhiteSpace(function.ClassPath) ||
                string.IsNullOrWhiteSpace(function.FunctionName) ||
                string.IsNullOrWhiteSpace(function.FunctionPath) ||
                string.IsNullOrWhiteSpace(function.Flags) ||
                function.BytecodeExpressionCount <= 0 || function.Nodes.Count == 0 ||
                function.Nodes.Select(node => node.NodeIndex).Distinct().Count() !=
                    function.Nodes.Count ||
                function.Nodes.Any(node =>
                    node.NodeIndex < 0 || node.Depth < 0 || node.StatementIndex < -1 ||
                    string.IsNullOrWhiteSpace(node.Edge) ||
                    string.IsNullOrWhiteSpace(node.Opcode) ||
                    node.Call is not null &&
                    (!SupportedCallKinds.Contains(node.Call.CallKind) ||
                     string.IsNullOrWhiteSpace(node.Call.FunctionName) ||
                     node.Call.ArgumentCount < 0 || node.Call.IntegerArguments is null))) ||
            source.Totals.PackageCount != source.Functions.Select(function => function.PackagePath)
                .Distinct(StringComparer.Ordinal).Count() ||
            source.Totals.ClassCount != source.Functions.Select(function => function.ClassPath)
                .Distinct(StringComparer.Ordinal).Count() ||
            source.Totals.FunctionCount != source.Functions.Count ||
            source.Totals.NodeCount != nodes.Length ||
            source.Totals.CallCount != nodes.Count(node => node.Call is not null) ||
            source.Totals.BranchCount != nodes.Count(node => node.Jump is not null))
        {
            throw new InvalidDataException(
                "Blueprint property-reference trace scope, totals, or functions are inconsistent.");
        }
    }
}
