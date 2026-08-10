namespace NeonRetroRewind.StaticExtractor;

internal static class UnlockableArtifactValidator
{
    private static readonly IReadOnlyList<string> ExpectedTraceFunctionPaths =
    [
        "ExampleGame/Content/ExampleProject/core/blueprint/research/BP_ExampleItem.BP_ExampleItem_C:IsExampleEligible",
        "ExampleGame/Content/ExampleProject/core/blueprint/research/BP_ExampleItem.BP_ExampleItem_C:ApplyExample",
        "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C:CanApplyExample",
        "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C:TryApplyExample",
    ];

    public static void ValidateEvidence(
        UnlockableEvidence evidence,
        BuildManifest manifest,
        string manifestSha256,
        MappingIdentity mappings)
    {
        if (evidence.ArtifactType != "unlockable-evidence")
        {
            throw new InvalidDataException("Expected an unlockable-evidence artifact.");
        }

        if (evidence.Build is null || evidence.StaticCensus is null || evidence.Mappings is null ||
            evidence.Engine is null || evidence.Extractor is null || evidence.Totals is null ||
            evidence.Packages is null || evidence.Packages.Count == 0)
        {
            throw new InvalidDataException("Unlockable evidence is incomplete.");
        }

        if (evidence.Build.ManifestSha256 != manifestSha256 ||
            evidence.Build.SteamAppId != manifest.Steam.AppId ||
            evidence.Build.SteamBuildId != manifest.Steam.BuildId ||
            evidence.Engine != manifest.Engine ||
            evidence.Mappings != mappings)
        {
            throw new InvalidDataException(
                "Unlockable evidence does not belong to the supplied build and mappings.");
        }

        if (string.IsNullOrWhiteSpace(evidence.StaticCensus.FileName) ||
            evidence.StaticCensus.SizeBytes <= 0 ||
            evidence.StaticCensus.Sha256 is not { Length: 64 } ||
            evidence.Extractor.Name != "NeonRetroRewind.StaticExtractor" ||
            string.IsNullOrWhiteSpace(evidence.Extractor.Version) ||
            string.IsNullOrWhiteSpace(evidence.Extractor.Cue4ParseVersion) ||
            evidence.Packages.Any(package =>
                package is null ||
                string.IsNullOrWhiteSpace(package.Path) ||
                package.BlueprintClasses is null ||
                package.UserDefinedStructs is null ||
                package.BlueprintClasses.Any(class_ =>
                    class_ is null ||
                    string.IsNullOrWhiteSpace(class_.Name) ||
                    string.IsNullOrWhiteSpace(class_.Path) ||
                    class_.Functions is null ||
                    class_.Functions.Any(string.IsNullOrWhiteSpace))))
        {
            throw new InvalidDataException("Unlockable evidence packages or classes are incomplete.");
        }
    }

    public static void ValidateTrace(
        UnlockableFunctionTrace trace,
        BuildManifest manifest,
        string manifestSha256,
        MappingIdentity mappings,
        FileIdentity evidenceIdentity)
    {
        if (trace.ArtifactType != "unlockable-function-trace")
        {
            throw new InvalidDataException("Expected an unlockable-function-trace artifact.");
        }

        if (trace.Build is null || trace.UnlockableEvidence is null ||
            trace.RequestedFunctionPaths is null || trace.Mappings is null ||
            trace.Engine is null || trace.Extractor is null || trace.Totals is null ||
            trace.Functions is null)
        {
            throw new InvalidDataException("Unlockable function trace is incomplete.");
        }

        var expectedEvidence = new UnlockableEvidenceInput(
            evidenceIdentity.FileName,
            evidenceIdentity.SizeBytes,
            evidenceIdentity.Sha256);
        if (trace.Build.ManifestSha256 != manifestSha256 ||
            trace.Build.SteamAppId != manifest.Steam.AppId ||
            trace.Build.SteamBuildId != manifest.Steam.BuildId ||
            trace.Engine != manifest.Engine ||
            trace.Mappings != mappings ||
            trace.UnlockableEvidence != expectedEvidence)
        {
            throw new InvalidDataException(
                "Unlockable function trace does not belong to the supplied evidence, build, and mappings.");
        }

        if (!trace.RequestedFunctionPaths.SequenceEqual(ExpectedTraceFunctionPaths, StringComparer.Ordinal) ||
            trace.Extractor.Name != "NeonRetroRewind.StaticExtractor" ||
            string.IsNullOrWhiteSpace(trace.Extractor.Version) ||
            string.IsNullOrWhiteSpace(trace.Extractor.Cue4ParseVersion) ||
            trace.Functions.Any(function =>
                function is null ||
                string.IsNullOrWhiteSpace(function.PackagePath) ||
                string.IsNullOrWhiteSpace(function.ClassName) ||
                string.IsNullOrWhiteSpace(function.ClassPath) ||
                string.IsNullOrWhiteSpace(function.FunctionName) ||
                string.IsNullOrWhiteSpace(function.FunctionPath) ||
                string.IsNullOrWhiteSpace(function.Flags) ||
                function.BytecodeExpressionCount <= 0 ||
                function.Nodes is null ||
                function.Nodes.Count == 0 ||
                function.Nodes.Any(node => node is null)))
        {
            throw new InvalidDataException("Unlockable function trace targets or functions are incomplete.");
        }

        var nodes = trace.Functions.SelectMany(function => function.Nodes).ToArray();
        if (trace.Totals.PackageCount != trace.Functions.Select(function => function.PackagePath)
                .Distinct(StringComparer.Ordinal).Count() ||
            trace.Totals.ClassCount != trace.Functions.Select(function => function.ClassPath)
                .Distinct(StringComparer.Ordinal).Count() ||
            trace.Totals.FunctionCount != trace.Functions.Count ||
            trace.Totals.NodeCount != nodes.Length ||
            trace.Totals.CallCount != nodes.Count(node => node.Call is not null) ||
            trace.Totals.BranchCount != nodes.Count(node => node.Jump is not null) ||
            trace.Functions.Select(function => function.FunctionPath)
                .OrderBy(path => path, StringComparer.Ordinal)
                .SequenceEqual(ExpectedTraceFunctionPaths, StringComparer.Ordinal) == false)
        {
            throw new InvalidDataException("Unlockable function trace totals or functions are inconsistent.");
        }
    }

    public static void ValidateCensus(
        StaticCensus census,
        BuildManifest manifest,
        string manifestSha256)
    {
        if (census.ArtifactType != "static-census" || census.Build is null ||
            census.Engine is null || census.Totals is null || census.Packages is null ||
            census.Packages.Any(package =>
                package is null ||
                package.ExportClasses is null ||
                package.ExportClasses.Any(exportClass => exportClass is null)))
        {
            throw new InvalidDataException("Static census is incomplete.");
        }

        if (census.Build.ManifestSha256 != manifestSha256 ||
            census.Build.SteamAppId != manifest.Steam.AppId ||
            census.Build.SteamBuildId != manifest.Steam.BuildId ||
            census.Engine != manifest.Engine)
        {
            throw new InvalidDataException("Static census does not belong to the supplied build.");
        }

        var parsedCount = census.Packages.Count(package => package.Status == "parsed");
        var failedCount = census.Packages.Count(package => package.Status == "failed");
        if (census.Totals.PackageCount != census.Packages.Count ||
            census.Totals.ParsedPackageCount != parsedCount ||
            census.Totals.FailedPackageCount != failedCount ||
            parsedCount + failedCount != census.Packages.Count)
        {
            throw new InvalidDataException("Static census package totals are inconsistent.");
        }
    }
}
