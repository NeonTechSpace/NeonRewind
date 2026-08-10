using System.Globalization;
using System.Text.Json;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintCallCandidateTraceCommand
{
    public const string SelectionRule = "explicit-same-class-function-path";
    public const string Relationship = "unproven";

    private static readonly IReadOnlySet<string> SupportedCallKinds =
        new HashSet<string>(["virtual", "local-virtual", "final", "local-final"], StringComparer.Ordinal);

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
            var source = AcquisitionValidator.ReadJson<BlueprintPropertyReferenceTrace>(
                options.SourceTracePath,
                "Blueprint property-reference trace");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var sourceIdentity = FileIdentityFactory.Create(options.SourceTracePath);
            var mappings = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            ValidateSource(source, manifest, manifestIdentity.Sha256, mappings);
            var recordedCall = SelectRecordedCall(source, options);
            var candidateSelection = CreateCandidateSelection(source, options);
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory);

            var candidate = BlueprintFunctionTracer.TraceCandidate(
                options.MappingsPath,
                options.PackageDirectory,
                candidateSelection);
            var artifact = CreateArtifact(
                manifest,
                manifestIdentity.Sha256,
                source,
                sourceIdentity,
                recordedCall,
                candidate,
                mappings);

            AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory,
                packagePaths);
            AcquisitionValidator.VerifyUnchanged(
                options.BuildManifestPath,
                manifestIdentity,
                "Build manifest");
            AcquisitionValidator.VerifyUnchanged(
                options.SourceTracePath,
                sourceIdentity,
                "Blueprint property-reference trace");
            AcquisitionValidator.VerifyUnchanged(
                options.MappingsPath,
                mappings,
                "Mappings");

            var json = JsonSerializer.Serialize(artifact, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(
                options.OutputPath,
                json,
                "Blueprint call-candidate trace");
            return writeStatus == ArtifactWriteStatus.Conflict ? OutputConflictExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Blueprint-call-candidate-trace operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Blueprint-call-candidate-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine($"Blueprint-call-candidate-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Blueprint-call-candidate-trace access failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            Console.Error.WriteLine(
                $"Blueprint-call-candidate-trace extraction failed ({exception.GetType().Name}).");
            return InputFailureExitCode;
        }
    }

    private static BlueprintRecordedCall SelectRecordedCall(
        BlueprintPropertyReferenceTrace source,
        BlueprintCallCandidateTraceOptions options)
    {
        var caller = source.Functions.SingleOrDefault(
            function => function.FunctionPath == options.CallerFunctionPath) ??
            throw new InvalidDataException(
                $"Caller function is absent from the source trace: {options.CallerFunctionPath}");
        var matches = caller.Nodes.Where(node =>
                node.StatementIndex == options.StatementIndex &&
                node.Call?.FunctionName == options.ExpectedCallFunctionName &&
                node.Call.CallKind == options.ExpectedCallKind)
            .ToArray();
        if (matches.Length != 1 || matches[0].Call!.ArgumentCount != options.ExpectedArgumentCount)
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

    private static BlueprintFunctionTraceSelection CreateCandidateSelection(
        BlueprintPropertyReferenceTrace source,
        BlueprintCallCandidateTraceOptions options)
    {
        var caller = source.Functions.Single(
            function => function.FunctionPath == options.CallerFunctionPath);
        var prefix = caller.ClassPath + ":";
        if (!options.CandidateFunctionPath.StartsWith(prefix, StringComparison.Ordinal) ||
            options.CandidateFunctionPath.Length == prefix.Length)
        {
            throw new InvalidDataException(
                "The candidate function must be an explicit function path on the caller's cooked class.");
        }

        return new BlueprintFunctionTraceSelection(
            caller.PackagePath,
            caller.ClassName,
            caller.ClassPath,
            options.CandidateFunctionPath[prefix.Length..],
            options.CandidateFunctionPath);
    }

    private static BlueprintCallCandidateTrace CreateArtifact(
        BuildManifest manifest,
        string manifestSha256,
        BlueprintPropertyReferenceTrace source,
        FileIdentity sourceIdentity,
        BlueprintRecordedCall recordedCall,
        BlueprintTracedFunctionWithSignature candidate,
        MappingIdentity mappings)
        => new(
            ArtifactType: "blueprint-call-candidate-trace",
            Build: new CensusBuildReference(
                manifestSha256,
                manifest.Steam.AppId,
                manifest.Steam.BuildId),
            SourceTrace: new BlueprintCallCandidateSourceTrace(
                sourceIdentity.FileName,
                sourceIdentity.SizeBytes,
                sourceIdentity.Sha256,
                source.ArtifactType,
                source.BlueprintPropertyReferences.TargetPropertyName),
            RecordedCall: recordedCall,
            Candidate: new BlueprintCallCandidate(
                SelectionRule,
                Relationship,
                recordedCall.Call.ArgumentCount == candidate.Signature.ParameterCount,
                candidate.Signature,
                candidate.Function),
            Mappings: mappings,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                "NeonRetroRewind.StaticExtractor",
                AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")));

    private static void ValidateSource(
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

    private static bool TryParseArguments(
        string[] args,
        out BlueprintCallCandidateTraceOptions options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = BlueprintCallCandidateTraceOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = BlueprintCallCandidateTraceOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[]
        {
            "--build-manifest",
            "--source-trace",
            "--caller-function-path",
            "--statement-index",
            "--expected-call-kind",
            "--expected-call-function",
            "--expected-argument-count",
            "--candidate-function-path",
            "--mappings",
            "--package-directory",
            "--output",
        };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        var textValues = new[]
        {
            "--caller-function-path",
            "--expected-call-kind",
            "--expected-call-function",
            "--candidate-function-path",
        };
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)) ||
            textValues.Any(option =>
                !values.TryGetValue(option, out var value) || string.IsNullOrWhiteSpace(value) ||
                value.Length > 1024 || value.Any(char.IsControl)) ||
            values.TryGetValue("--expected-call-kind", out var callKind) &&
                !SupportedCallKinds.Contains(callKind) ||
            !int.TryParse(values.GetValueOrDefault("--statement-index"),
                NumberStyles.None, CultureInfo.InvariantCulture, out var statementIndex) ||
            !int.TryParse(values.GetValueOrDefault("--expected-argument-count"),
                NumberStyles.None, CultureInfo.InvariantCulture, out var argumentCount))
        {
            options = BlueprintCallCandidateTraceOptions.Empty;
            error = unknown is null
                ? "Blueprint-call-candidate-trace generation requires all inputs and nonnegative integer counts."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new BlueprintCallCandidateTraceOptions(
            values["--build-manifest"],
            values["--source-trace"],
            values["--caller-function-path"],
            statementIndex,
            values["--expected-call-kind"],
            values["--expected-call-function"],
            argumentCount,
            values["--candidate-function-path"],
            values["--mappings"],
            values["--package-directory"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor blueprint-call-candidate-trace --build-manifest <path> --source-trace <path> --caller-function-path <path> --statement-index <integer> --expected-call-kind <kind> --expected-call-function <name> --expected-argument-count <integer> --candidate-function-path <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command binds one recorded call to one explicitly selected same-class candidate and writes the candidate signature and typed Kismet body.");
        writer.WriteLine("The candidate relationship remains unproven, and different existing output content is never overwritten.");
    }

    private sealed record BlueprintCallCandidateTraceOptions(
        string BuildManifestPath,
        string SourceTracePath,
        string CallerFunctionPath,
        int StatementIndex,
        string ExpectedCallKind,
        string ExpectedCallFunctionName,
        int ExpectedArgumentCount,
        string CandidateFunctionPath,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static BlueprintCallCandidateTraceOptions Empty { get; } =
            new("", "", "", 0, "", "", 0, "", "", "", "");
    }
}
