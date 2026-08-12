using System.Globalization;
using System.Text.Json;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintCallTargetTraceCommand
{
    public const string Relationship = "verified";

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
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var manifest = AcquisitionValidator.ReadJson<BuildManifest>(
                options.BuildManifestPath,
                "build manifest");
            AcquisitionValidator.ValidateManifest(manifest);
            var sourceIdentity = FileIdentityFactory.Create(options.SourceTracePath);
            var source = AcquisitionValidator.ReadJson<BlueprintPropertyReferenceTrace>(
                options.SourceTracePath,
                "Blueprint property-reference trace");
            var declarationsIdentity = FileIdentityFactory.Create(options.DeclarationsPath);
            var declarations = AcquisitionValidator.ReadJson<BlueprintFunctionDeclarations>(
                options.DeclarationsPath,
                "Blueprint function declarations");
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
            var declaration = SelectDeclaration(
                declarations,
                manifest,
                manifestIdentity.Sha256,
                mappings,
                options.ExpectedCallFunctionName,
                options.TargetFunctionPath);
            var caller = CreateCallerSelection(source, options.CallerFunctionPath);
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory);

            var target = BlueprintCallTargetTracer.Trace(
                options.MappingsPath,
                options.PackageDirectory,
                caller,
                recordedCall,
                declaration);
            if (recordedCall.Call.ArgumentCount != declaration.Signature.ParameterCount)
            {
                throw new InvalidDataException(
                    "Recorded call argument count does not match the declaration parameter count.");
            }

            var artifact = CreateArtifact(
                manifest,
                manifestIdentity.Sha256,
                source,
                sourceIdentity,
                declarations,
                declarationsIdentity,
                recordedCall,
                declaration,
                target,
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
                options.DeclarationsPath,
                declarationsIdentity,
                "Blueprint function declarations");
            AcquisitionValidator.VerifyUnchanged(
                options.MappingsPath,
                mappings,
                "Mappings");

            var json = JsonSerializer.Serialize(artifact, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(
                options.OutputPath,
                json,
                "Blueprint call-target trace");
            return writeStatus == ArtifactWriteStatus.Conflict ? OutputConflictExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Blueprint-call-target-trace operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Blueprint-call-target-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine($"Blueprint-call-target-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Blueprint-call-target-trace access failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            Console.Error.WriteLine(
                $"Blueprint-call-target-trace extraction failed ({exception.GetType().Name}).");
            return InputFailureExitCode;
        }
    }

    private static BlueprintFunctionDeclaration SelectDeclaration(
        BlueprintFunctionDeclarations artifact,
        BuildManifest manifest,
        string manifestSha256,
        MappingIdentity mappings,
        string expectedFunctionName,
        string targetFunctionPath)
    {
        if (artifact.ArtifactType != "blueprint-function-declarations" ||
            artifact.Build is null || artifact.StaticCensus is null ||
            artifact.Mappings is null || artifact.Engine is null || artifact.Extractor is null ||
            artifact.Target is null || artifact.Totals is null || artifact.Declarations is null ||
            artifact.Failures is null)
        {
            throw new InvalidDataException("Blueprint function declarations are incomplete.");
        }

        if (artifact.Build.ManifestSha256 != manifestSha256 ||
            artifact.Build.SteamAppId != manifest.Steam.AppId ||
            artifact.Build.SteamBuildId != manifest.Steam.BuildId ||
            artifact.Engine != manifest.Engine || artifact.Mappings != mappings)
        {
            throw new InvalidDataException(
                "Blueprint function declarations do not belong to the supplied build and mappings.");
        }

        if (artifact.Target.FunctionName != expectedFunctionName ||
            artifact.CandidateRule != BlueprintFunctionDeclarationScanner.CandidateRule ||
            artifact.DeclarationRule != BlueprintFunctionDeclarationScanner.DeclarationRule ||
            artifact.Coverage != "complete" || artifact.Failures.Count != 0 ||
            artifact.Totals.CandidatePackageCount < 0 ||
            artifact.Totals.ScannedPackageCount != artifact.Totals.CandidatePackageCount ||
            artifact.Totals.FailedPackageCount != 0 ||
            artifact.Totals.RawFunctionExportCount < 0 ||
            artifact.Totals.MatchedDeclarationCount != artifact.Declarations.Count ||
            artifact.Extractor.Name != "NeonRetroRewind.StaticExtractor" ||
            string.IsNullOrWhiteSpace(artifact.Extractor.Version) ||
            string.IsNullOrWhiteSpace(artifact.Extractor.Cue4ParseVersion) ||
            string.IsNullOrWhiteSpace(artifact.StaticCensus.FileName) ||
            artifact.StaticCensus.SizeBytes <= 0 ||
            artifact.StaticCensus.Sha256 is not { Length: 64 } ||
            artifact.Declarations
                .Select(declaration =>
                    $"{declaration.PackagePath}\0{declaration.PackageExportIndex}\0{declaration.ObjectPath}")
                .Distinct(StringComparer.Ordinal).Count() != artifact.Declarations.Count)
        {
            throw new InvalidDataException(
                "Blueprint function declaration scope, coverage, or totals are inconsistent.");
        }

        var matches = artifact.Declarations.Where(declaration =>
                declaration.ObjectPath == targetFunctionPath &&
                declaration.ObjectName == expectedFunctionName)
            .ToArray();
        if (matches.Length != 1)
        {
            throw new InvalidDataException(
                $"The exact target declaration is absent or not unique: {targetFunctionPath}");
        }

        var target = matches[0];
        if (string.IsNullOrWhiteSpace(target.PackagePath) ||
            target.PackageExportIndex <= 0 ||
            string.IsNullOrWhiteSpace(target.OwnerPath) ||
            string.IsNullOrWhiteSpace(target.OwnerExportType) ||
            string.IsNullOrWhiteSpace(target.Flags) ||
            target.BytecodeExpressionCount is null or <= 0 ||
            target.Signature is null || target.Signature.Parameters is null ||
            target.Signature.ParameterCount != target.Signature.Parameters.Count ||
            target.Signature.Parameters.Select(parameter => parameter.Position)
                .SequenceEqual(Enumerable.Range(0, target.Signature.ParameterCount)) is false ||
            target.Signature.Parameters.Any(parameter =>
                string.IsNullOrWhiteSpace(parameter.Name) ||
                string.IsNullOrWhiteSpace(parameter.Type) ||
                parameter.ArrayDimension <= 0 ||
                string.IsNullOrWhiteSpace(parameter.Flags)) ||
            target.OwnerLinkage is null ||
            target.OwnerLinkage.FuncMapContainsDeclaration != true ||
            target.OwnerLinkage.ChildrenContainsDeclaration != true)
        {
            throw new InvalidDataException(
                $"The exact target declaration is incomplete or not traceable: {targetFunctionPath}");
        }

        return target;
    }

    private static BlueprintFunctionTraceSelection CreateCallerSelection(
        BlueprintPropertyReferenceTrace source,
        string callerFunctionPath)
    {
        var caller = source.Functions.Single(function => function.FunctionPath == callerFunctionPath);
        return new BlueprintFunctionTraceSelection(
            caller.PackagePath,
            caller.ClassName,
            caller.ClassPath,
            caller.FunctionName,
            caller.FunctionPath);
    }

    private static BlueprintCallTargetTrace CreateArtifact(
        BuildManifest manifest,
        string manifestSha256,
        BlueprintPropertyReferenceTrace source,
        FileIdentity sourceIdentity,
        BlueprintFunctionDeclarations declarations,
        FileIdentity declarationsIdentity,
        BlueprintRecordedCall recordedCall,
        BlueprintFunctionDeclaration declaration,
        BlueprintResolvedCallTarget target,
        MappingIdentity mappings)
        => new(
            ArtifactType: "blueprint-call-target-trace",
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
            Declarations: new BlueprintCallTargetDeclarationsInput(
                declarationsIdentity.FileName,
                declarationsIdentity.SizeBytes,
                declarationsIdentity.Sha256,
                declarations.ArtifactType,
                declarations.Target.FunctionName,
                declarations.DeclarationRule),
            RecordedCall: recordedCall,
            Binding: new BlueprintVerifiedCallTarget(
                target.BindingRule,
                Relationship,
                ReceiverClassMatchesDeclarationOwner: true,
                ArgumentCountMatchesParameterCount: true,
                target.Receiver,
                new BlueprintCallTargetDeclaration(
                    declaration.PackagePath,
                    declaration.PackageExportIndex,
                    declaration.ObjectPath,
                    declaration.OwnerPath,
                    declaration.Signature),
                target.Target.Function),
            Mappings: mappings,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                "NeonRetroRewind.StaticExtractor",
                AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")));

    private static bool TryParseArguments(
        string[] args,
        out BlueprintCallTargetTraceOptions options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = BlueprintCallTargetTraceOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = BlueprintCallTargetTraceOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[]
        {
            "--build-manifest",
            "--source-trace",
            "--declarations",
            "--caller-function-path",
            "--statement-index",
            "--expected-call-kind",
            "--expected-call-function",
            "--expected-argument-count",
            "--target-function-path",
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
            "--target-function-path",
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
            options = BlueprintCallTargetTraceOptions.Empty;
            error = unknown is null
                ? "Blueprint-call-target-trace generation requires all inputs and nonnegative integer counts."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new BlueprintCallTargetTraceOptions(
            values["--build-manifest"],
            values["--source-trace"],
            values["--declarations"],
            values["--caller-function-path"],
            statementIndex,
            values["--expected-call-kind"],
            values["--expected-call-function"],
            argumentCount,
            values["--target-function-path"],
            values["--mappings"],
            values["--package-directory"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor blueprint-call-target-trace --build-manifest <path> --source-trace <path> --declarations <path> --caller-function-path <path> --statement-index <integer> --expected-call-kind <kind> --expected-call-function <name> --expected-argument-count <integer> --target-function-path <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command verifies an exact EX_Context object-constant receiver or an implicit same-class EX_LocalVirtualFunction receiver against one exact declaration owner, then writes the target signature and typed Kismet body.");
        writer.WriteLine("A relationship is verified only when the receiver class, call signature, declaration, and traced function all match. Different existing output content is never overwritten.");
    }

    private sealed record BlueprintCallTargetTraceOptions(
        string BuildManifestPath,
        string SourceTracePath,
        string DeclarationsPath,
        string CallerFunctionPath,
        int StatementIndex,
        string ExpectedCallKind,
        string ExpectedCallFunctionName,
        int ExpectedArgumentCount,
        string TargetFunctionPath,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static BlueprintCallTargetTraceOptions Empty { get; } =
            new("", "", "", "", 0, "", "", 0, "", "", "", "");
    }
}
