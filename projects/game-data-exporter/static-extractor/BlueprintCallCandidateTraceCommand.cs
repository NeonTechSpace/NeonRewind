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
            BlueprintCallTraceSourceValidator.Validate(
                source,
                manifest,
                manifestIdentity.Sha256,
                mappings);
            var recordedCall = BlueprintCallTraceSourceValidator.SelectRecordedCall(
                source,
                options.CallerFunctionPath,
                options.StatementIndex,
                options.ExpectedCallFunctionName,
                options.ExpectedCallKind,
                options.ExpectedArgumentCount);
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
