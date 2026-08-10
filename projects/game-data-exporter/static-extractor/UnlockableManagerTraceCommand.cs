using System.Text.Json;

namespace NeonRetroRewind.StaticExtractor;

internal static class UnlockableManagerTraceCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int InputFailureExitCode = 6;
    private const int OutputConflictExitCode = 7;

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
            var implementationSites = AcquisitionValidator.ReadJson<UnlockableImplementationSites>(
                options.UnlockableImplementationSitesPath,
                "unlockable implementation sites");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var implementationSitesIdentity = FileIdentityFactory.Create(
                options.UnlockableImplementationSitesPath);
            var mappings = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            UnlockableArtifactValidator.ValidateImplementationSites(
                implementationSites,
                manifest,
                manifestIdentity.Sha256,
                mappings);
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory);

            var target = implementationSites.ManagerEventGraphs.Single();
            var requests = new[]
            {
                new BlueprintFunctionTraceRequest(
                    target.PackagePath,
                    target.ClassName,
                    target.ClassPath,
                    target.FunctionName,
                    target.FunctionPath,
                    target.Flags,
                    target.BytecodeExpressionCount),
            };
            var functions = BlueprintFunctionTracer.Trace(
                options.MappingsPath,
                options.PackageDirectory,
                requests);
            var artifact = CreateArtifact(
                manifest,
                manifestIdentity.Sha256,
                implementationSitesIdentity,
                mappings,
                functions);

            AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory,
                packagePaths);
            AcquisitionValidator.VerifyUnchanged(
                options.BuildManifestPath,
                manifestIdentity,
                "Build manifest");
            AcquisitionValidator.VerifyUnchanged(
                options.UnlockableImplementationSitesPath,
                implementationSitesIdentity,
                "Unlockable implementation sites");
            AcquisitionValidator.VerifyUnchanged(
                options.MappingsPath,
                mappings,
                "Mappings");

            var json = JsonSerializer.Serialize(artifact, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(
                options.OutputPath,
                json,
                "Unlockable manager trace");
            return writeStatus == ArtifactWriteStatus.Conflict ? OutputConflictExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Unlockable-manager-trace operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Unlockable-manager-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine($"Unlockable-manager-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Unlockable-manager-trace access failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            Console.Error.WriteLine(
                $"Unlockable-manager-trace extraction failed ({exception.GetType().Name}).");
            return InputFailureExitCode;
        }
    }

    private static UnlockableManagerTrace CreateArtifact(
        BuildManifest manifest,
        string manifestSha256,
        FileIdentity implementationSitesIdentity,
        MappingIdentity mappings,
        IReadOnlyList<BlueprintTracedFunction> functions)
    {
        var nodes = functions.SelectMany(function => function.Nodes).ToArray();
        return new UnlockableManagerTrace(
            ArtifactType: "unlockable-manager-trace",
            Build: new CensusBuildReference(
                manifestSha256,
                manifest.Steam.AppId,
                manifest.Steam.BuildId),
            UnlockableImplementationSites: new UnlockableEvidenceInput(
                implementationSitesIdentity.FileName,
                implementationSitesIdentity.SizeBytes,
                implementationSitesIdentity.Sha256),
            RequestedFunctionPaths: functions.Select(function => function.FunctionPath).ToArray(),
            Mappings: mappings,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                "NeonRetroRewind.StaticExtractor",
                AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Totals: new BlueprintFunctionTraceTotals(
                functions.Select(function => function.PackagePath).Distinct(StringComparer.Ordinal).Count(),
                functions.Select(function => function.ClassPath).Distinct(StringComparer.Ordinal).Count(),
                functions.Count,
                nodes.Length,
                nodes.Count(node => node.Call is not null),
                nodes.Count(node => node.Jump is not null),
                nodes.Count(IsEventGraphEntrypoint)),
            Functions: functions);
    }

    private static bool IsEventGraphEntrypoint(BlueprintTraceNode node)
        => node.Call is { ArgumentCount: 1, IntegerArguments.Count: 1 } call &&
           call.FunctionName.StartsWith("ExecuteExampleGraph_", StringComparison.Ordinal) &&
           call.IntegerArguments[0].Position == 0;

    private static bool TryParseArguments(
        string[] args,
        out UnlockableManagerTraceOptions options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = UnlockableManagerTraceOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = UnlockableManagerTraceOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[]
        {
            "--build-manifest",
            "--unlockable-implementation-sites",
            "--mappings",
            "--package-directory",
            "--output",
        };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = UnlockableManagerTraceOptions.Empty;
            error = unknown is null
                ? "Unlockable-manager-trace generation requires all five input and output options."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new UnlockableManagerTraceOptions(
            values["--build-manifest"],
            values["--unlockable-implementation-sites"],
            values["--mappings"],
            values["--package-directory"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor unlockable-manager-trace --build-manifest <path> --unlockable-implementation-sites <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command rereads the one discovered unlock-manager event graph into typed Kismet nodes without parsing pseudocode.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record UnlockableManagerTraceOptions(
        string BuildManifestPath,
        string UnlockableImplementationSitesPath,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static UnlockableManagerTraceOptions Empty { get; } = new("", "", "", "", "");
    }
}
