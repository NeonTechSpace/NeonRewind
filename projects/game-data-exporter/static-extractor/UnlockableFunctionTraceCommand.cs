using System.Text.Json;

namespace NeonRetroRewind.StaticExtractor;

internal static class UnlockableFunctionTraceCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int InputFailureExitCode = 6;
    private const int OutputConflictExitCode = 7;

    private static readonly UnlockableFunctionTarget[] Targets =
    [
        new(
            "ExampleGame/Content/ExampleProject/core/blueprint/research/BP_ExampleItem.uasset",
            "BP_ExampleItem_C",
            "ExampleGame/Content/ExampleProject/core/blueprint/research/BP_ExampleItem.BP_ExampleItem_C",
            "IsExampleEligible"),
        new(
            "ExampleGame/Content/ExampleProject/core/blueprint/research/BP_ExampleItem.uasset",
            "BP_ExampleItem_C",
            "ExampleGame/Content/ExampleProject/core/blueprint/research/BP_ExampleItem.BP_ExampleItem_C",
            "ApplyExample"),
        new(
            "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.uasset",
            "ExampleUnlockSystem_C",
            "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C",
            "CanApplyExample"),
        new(
            "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.uasset",
            "ExampleUnlockSystem_C",
            "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C",
            "TryApplyExample"),
    ];

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    public static int Run(string[] args)
    {
        if (args is ["--help"] or ["-h"])
        {
            WriteUsage(Console.Out);
            return 0;
        }

        if (!TryParseArguments(args, out var options, out var argumentError))
        {
            Console.Error.WriteLine(argumentError);
            WriteUsage(Console.Error);
            return InvalidArgumentsExitCode;
        }

        try
        {
            var manifest = AcquisitionValidator.ReadJson<BuildManifest>(
                options.BuildManifestPath,
                "build manifest");
            AcquisitionValidator.ValidateManifest(manifest);
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var mappingIdentity = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            var evidence = AcquisitionValidator.ReadJson<UnlockableEvidence>(
                options.UnlockableEvidencePath,
                "unlockable evidence");
            var evidenceIdentity = FileIdentityFactory.Create(options.UnlockableEvidencePath);
            UnlockableArtifactValidator.ValidateEvidence(
                evidence,
                manifest,
                manifestIdentity.Sha256,
                mappingIdentity);
            var selections = CreateSelections(evidence);
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory);

            var trace = CreateTrace(
                manifest,
                manifestIdentity.Sha256,
                mappingIdentity,
                evidenceIdentity,
                selections,
                options.MappingsPath,
                options.PackageDirectory);

            AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory,
                packagePaths);
            AcquisitionValidator.VerifyUnchanged(
                options.BuildManifestPath,
                manifestIdentity,
                "Build manifest");
            AcquisitionValidator.VerifyUnchanged(
                options.MappingsPath,
                mappingIdentity,
                "Mappings");
            AcquisitionValidator.VerifyUnchanged(
                options.UnlockableEvidencePath,
                evidenceIdentity,
                "Unlockable evidence");

            var json = JsonSerializer.Serialize(trace, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(
                options.OutputPath,
                json,
                "Unlockable function trace");
            return writeStatus == ArtifactWriteStatus.Conflict ? OutputConflictExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Unlockable-function-trace operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Unlockable-function-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine($"Unlockable-function-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Unlockable-function-trace access failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            Console.Error.WriteLine(
                $"Unlockable-function-trace extraction failed ({exception.GetType().Name}).");
            return InputFailureExitCode;
        }
    }

    private static UnlockableFunctionTrace CreateTrace(
        BuildManifest manifest,
        string manifestSha256,
        MappingIdentity mappingIdentity,
        FileIdentity evidenceIdentity,
        IReadOnlyList<BlueprintFunctionTraceSelection> selections,
        string mappingsPath,
        string packageDirectory)
    {
        var functions = BlueprintFunctionTracer.TraceSelected(
            mappingsPath,
            packageDirectory,
            selections);
        var nodes = functions.SelectMany(function => function.Nodes).ToArray();

        return new UnlockableFunctionTrace(
            ArtifactType: "unlockable-function-trace",
            Build: new CensusBuildReference(
                ManifestSha256: manifestSha256,
                SteamAppId: manifest.Steam.AppId,
                SteamBuildId: manifest.Steam.BuildId),
            UnlockableEvidence: new UnlockableEvidenceInput(
                evidenceIdentity.FileName,
                evidenceIdentity.SizeBytes,
                evidenceIdentity.Sha256),
            RequestedFunctionPaths: selections
                .Select(selection => selection.FunctionPath)
                .OrderBy(path => path, StringComparer.Ordinal)
                .ToArray(),
            Mappings: mappingIdentity,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                Name: "NeonRetroRewind.StaticExtractor",
                Version: AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                Cue4ParseVersion: AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Totals: new BlueprintFunctionTraceTotals(
                PackageCount: functions.Select(function => function.PackagePath)
                    .Distinct(StringComparer.Ordinal).Count(),
                ClassCount: functions.Select(function => function.ClassPath)
                    .Distinct(StringComparer.Ordinal).Count(),
                FunctionCount: functions.Count,
                NodeCount: nodes.Length,
                CallCount: nodes.Count(node => node.Call is not null),
                BranchCount: nodes.Count(node => node.Jump is not null),
                EntrypointCount: nodes.Count(IsEventGraphEntrypoint)),
            Functions: functions);
    }

    private static bool IsEventGraphEntrypoint(BlueprintTraceNode node)
        => node.Call is { ArgumentCount: 1, IntegerArguments.Count: 1 } call &&
           call.FunctionName.StartsWith("ExecuteExampleGraph_", StringComparison.Ordinal) &&
           call.IntegerArguments[0].Position == 0;

    private static IReadOnlyList<BlueprintFunctionTraceSelection> CreateSelections(
        UnlockableEvidence evidence)
    {
        var classes = evidence.Packages
            .SelectMany(package => package.BlueprintClasses.Select(class_ => new
            {
                PackagePath = package.Path,
                Class = class_,
            }))
            .ToArray();
        var selections = new List<BlueprintFunctionTraceSelection>();
        foreach (var target in Targets)
        {
            var matches = classes.Where(value =>
                value.PackagePath == target.PackagePath &&
                value.Class.Name == target.ClassName &&
                value.Class.Path == target.ClassPath &&
                value.Class.Functions.Count(function => function == target.FunctionName) == 1)
                .ToArray();
            if (matches.Length != 1)
            {
                throw new InvalidDataException(
                    $"Expected one unlockable Blueprint function {target.FunctionPath}, found {matches.Length}.");
            }

            selections.Add(new BlueprintFunctionTraceSelection(
                target.PackagePath,
                target.ClassName,
                target.ClassPath,
                target.FunctionName,
                target.FunctionPath));
        }

        return selections;
    }

    private static bool TryParseArguments(
        string[] args,
        out UnlockableFunctionTraceOptions options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = UnlockableFunctionTraceOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = UnlockableFunctionTraceOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[]
        {
            "--build-manifest",
            "--unlockable-evidence",
            "--mappings",
            "--package-directory",
            "--output",
        };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = UnlockableFunctionTraceOptions.Empty;
            error = unknown is null
                ? "Unlockable-function-trace generation requires all five input and output options."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new UnlockableFunctionTraceOptions(
            values["--build-manifest"],
            values["--unlockable-evidence"],
            values["--mappings"],
            values["--package-directory"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor unlockable-function-trace --build-manifest <path> --unlockable-evidence <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command rereads the four unlock eligibility and mutation functions into typed Kismet nodes without parsing pseudocode.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record UnlockableFunctionTraceOptions(
        string BuildManifestPath,
        string UnlockableEvidencePath,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static UnlockableFunctionTraceOptions Empty { get; } = new("", "", "", "", "");
    }

    private sealed record UnlockableFunctionTarget(
        string PackagePath,
        string ClassName,
        string ClassPath,
        string FunctionName)
    {
        public string FunctionPath => $"{ClassPath}:{FunctionName}";
    }
}
