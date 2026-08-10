using System.Text.Json;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintPropertyReferenceTraceCommand
{
    public const string SelectionRule = "explicit-functions-with-read-references";

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
            var references = AcquisitionValidator.ReadJson<BlueprintPropertyReferences>(
                options.PropertyReferencesPath,
                "Blueprint property references");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var referencesIdentity = FileIdentityFactory.Create(options.PropertyReferencesPath);
            var mappings = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            ValidateReferences(
                references,
                manifest,
                manifestIdentity.Sha256,
                mappings);
            var selections = CreateSelections(references, options.FunctionPaths);
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory);

            var functions = BlueprintFunctionTracer.TraceSelected(
                options.MappingsPath,
                options.PackageDirectory,
                selections);
            VerifyReferences(references, functions);
            var artifact = CreateArtifact(
                manifest,
                manifestIdentity.Sha256,
                referencesIdentity,
                references.Target.PropertyName,
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
                options.PropertyReferencesPath,
                referencesIdentity,
                "Blueprint property references");
            AcquisitionValidator.VerifyUnchanged(
                options.MappingsPath,
                mappings,
                "Mappings");

            var json = JsonSerializer.Serialize(artifact, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(
                options.OutputPath,
                json,
                "Blueprint property-reference trace");
            return writeStatus == ArtifactWriteStatus.Conflict ? OutputConflictExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine(
                $"Blueprint-property-reference-trace operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine(
                $"Blueprint-property-reference-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine(
                $"Blueprint-property-reference-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine(
                $"Blueprint-property-reference-trace access failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            Console.Error.WriteLine(
                $"Blueprint-property-reference-trace extraction failed ({exception.GetType().Name}).");
            return InputFailureExitCode;
        }
    }

    private static IReadOnlyList<BlueprintFunctionTraceSelection> CreateSelections(
        BlueprintPropertyReferences artifact,
        IReadOnlyList<string> requestedFunctionPaths)
    {
        var selections = new List<BlueprintFunctionTraceSelection>();
        foreach (var functionPath in requestedFunctionPaths.Order(StringComparer.Ordinal))
        {
            var matches = artifact.References
                .Where(reference => reference.FunctionPath == functionPath)
                .ToArray();
            if (matches.Length == 0 || matches.All(reference => reference.Access != "read"))
            {
                throw new InvalidDataException(
                    $"Requested function has no recorded property read: {functionPath}");
            }

            var first = matches[0];
            if (matches.Any(reference =>
                reference.PackagePath != first.PackagePath ||
                reference.ClassName != first.ClassName ||
                reference.ClassPath != first.ClassPath ||
                reference.FunctionName != first.FunctionName))
            {
                throw new InvalidDataException(
                    $"Property-reference function identity is inconsistent: {functionPath}");
            }

            selections.Add(new BlueprintFunctionTraceSelection(
                first.PackagePath,
                first.ClassName,
                first.ClassPath,
                first.FunctionName,
                first.FunctionPath));
        }

        return selections;
    }

    private static void VerifyReferences(
        BlueprintPropertyReferences source,
        IReadOnlyList<BlueprintTracedFunction> functions)
    {
        foreach (var function in functions)
        {
            var expected = source.References
                .Where(reference => reference.FunctionPath == function.FunctionPath)
                .ToArray();
            foreach (var reference in expected)
            {
                if (!function.Nodes.Any(node =>
                    node.StatementIndex == reference.StatementIndex &&
                    node.Opcode == reference.Opcode &&
                    node.Symbol == source.Target.PropertyName))
                {
                    throw new InvalidDataException(
                        $"Property reference changed in traced function: {function.FunctionPath}");
                }
            }
        }
    }

    private static BlueprintPropertyReferenceTrace CreateArtifact(
        BuildManifest manifest,
        string manifestSha256,
        FileIdentity referencesIdentity,
        string targetPropertyName,
        MappingIdentity mappings,
        IReadOnlyList<BlueprintTracedFunction> functions)
    {
        var nodes = functions.SelectMany(function => function.Nodes).ToArray();
        return new BlueprintPropertyReferenceTrace(
            ArtifactType: "blueprint-property-reference-trace",
            Build: new CensusBuildReference(
                manifestSha256,
                manifest.Steam.AppId,
                manifest.Steam.BuildId),
            BlueprintPropertyReferences: new BlueprintPropertyReferenceTraceInput(
                referencesIdentity.FileName,
                referencesIdentity.SizeBytes,
                referencesIdentity.Sha256,
                targetPropertyName),
            RequestedFunctionPaths: functions
                .Select(function => function.FunctionPath)
                .ToArray(),
            SelectionRule,
            Mappings: mappings,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                "NeonRetroRewind.StaticExtractor",
                AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Totals: new BlueprintFunctionTraceTotals(
                functions.Select(function => function.PackagePath)
                    .Distinct(StringComparer.Ordinal).Count(),
                functions.Select(function => function.ClassPath)
                    .Distinct(StringComparer.Ordinal).Count(),
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

    private static void ValidateReferences(
        BlueprintPropertyReferences artifact,
        BuildManifest manifest,
        string manifestSha256,
        MappingIdentity mappings)
    {
        if (artifact.ArtifactType != "blueprint-property-references" ||
            artifact.Build is null || artifact.StaticCensus is null ||
            artifact.Mappings is null || artifact.Engine is null ||
            artifact.Extractor is null || artifact.Target is null ||
            artifact.Totals is null || artifact.References is null ||
            artifact.Failures is null)
        {
            throw new InvalidDataException("Blueprint property references are incomplete.");
        }

        if (artifact.Build.ManifestSha256 != manifestSha256 ||
            artifact.Build.SteamAppId != manifest.Steam.AppId ||
            artifact.Build.SteamBuildId != manifest.Steam.BuildId ||
            artifact.Engine != manifest.Engine || artifact.Mappings != mappings)
        {
            throw new InvalidDataException(
                "Blueprint property references do not belong to the supplied build and mappings.");
        }

        if (artifact.CandidateRule != BlueprintPropertyReferenceScanner.CandidateRule ||
            artifact.ReferenceRule != BlueprintPropertyReferenceScanner.ReferenceRule ||
            artifact.Coverage != "complete" || artifact.Failures.Count != 0 ||
            string.IsNullOrWhiteSpace(artifact.Target.PropertyName) ||
            artifact.Target.PropertyName.Length > 256 ||
            artifact.Target.PropertyName.Any(char.IsControl) ||
            artifact.Extractor.Name != "NeonRetroRewind.StaticExtractor" ||
            string.IsNullOrWhiteSpace(artifact.Extractor.Version) ||
            string.IsNullOrWhiteSpace(artifact.Extractor.Cue4ParseVersion) ||
            string.IsNullOrWhiteSpace(artifact.StaticCensus.FileName) ||
            artifact.StaticCensus.SizeBytes <= 0 ||
            artifact.StaticCensus.Sha256 is not { Length: 64 })
        {
            throw new InvalidDataException(
                "Blueprint property-reference scope or coverage is not the expected complete scan.");
        }

        var totals = artifact.Totals;
        if (totals.CandidatePackageCount <= 0 ||
            totals.ScannedPackageCount != totals.CandidatePackageCount ||
            totals.FailedPackageCount != 0 || totals.ClassCount <= 0 ||
            totals.FunctionCount <= 0 ||
            totals.ReferenceCount != artifact.References.Count ||
            totals.ReadCount != artifact.References.Count(reference => reference.Access == "read") ||
            totals.WriteCount != artifact.References.Count(reference => reference.Access == "write") ||
            totals.MetadataCount != artifact.References.Count(reference => reference.Access == "metadata") ||
            totals.ReferenceCount != totals.ReadCount + totals.WriteCount + totals.MetadataCount ||
            artifact.References.Distinct().Count() != artifact.References.Count ||
            artifact.References.Any(reference =>
                reference is null ||
                string.IsNullOrWhiteSpace(reference.PackagePath) ||
                string.IsNullOrWhiteSpace(reference.ClassName) ||
                string.IsNullOrWhiteSpace(reference.ClassPath) ||
                string.IsNullOrWhiteSpace(reference.FunctionName) ||
                string.IsNullOrWhiteSpace(reference.FunctionPath) ||
                reference.Access is not ("read" or "write" or "metadata") ||
                string.IsNullOrWhiteSpace(reference.Opcode) ||
                string.IsNullOrWhiteSpace(reference.PointerField) ||
                reference.StatementIndex < 0))
        {
            throw new InvalidDataException(
                "Blueprint property-reference totals or references are inconsistent.");
        }
    }

    private static bool TryParseArguments(
        string[] args,
        out BlueprintPropertyReferenceTraceOptions options,
        out string error)
    {
        var functionPaths = new List<string>();
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = BlueprintPropertyReferenceTraceOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            var value = args[++index];
            if (option == "--function-path")
            {
                functionPaths.Add(value);
            }
            else if (!values.TryAdd(option, value))
            {
                options = BlueprintPropertyReferenceTraceOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[]
        {
            "--build-manifest",
            "--property-references",
            "--mappings",
            "--package-directory",
            "--output",
        };
        var unknown = values.Keys.FirstOrDefault(
            key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)) ||
            functionPaths.Count == 0 ||
            functionPaths.Any(path =>
                string.IsNullOrWhiteSpace(path) || path.Length > 1024 || path.Any(char.IsControl)) ||
            functionPaths.Distinct(StringComparer.Ordinal).Count() != functionPaths.Count)
        {
            options = BlueprintPropertyReferenceTraceOptions.Empty;
            error = unknown is null
                ? "Blueprint-property-reference-trace generation requires all inputs and unique function paths."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new BlueprintPropertyReferenceTraceOptions(
            values["--build-manifest"],
            values["--property-references"],
            functionPaths,
            values["--mappings"],
            values["--package-directory"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor blueprint-property-reference-trace --build-manifest <path> --property-references <path> --function-path <path> [--function-path <path> ...] --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command rereads selected functions with recorded property reads into typed Kismet nodes and rechecks every recorded reference in those functions.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record BlueprintPropertyReferenceTraceOptions(
        string BuildManifestPath,
        string PropertyReferencesPath,
        IReadOnlyList<string> FunctionPaths,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static BlueprintPropertyReferenceTraceOptions Empty { get; } =
            new("", "", [], "", "", "");
    }
}
