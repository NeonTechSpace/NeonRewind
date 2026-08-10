using System.Text.Json;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintFunctionDeclarationsCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int InputFailureExitCode = 6;
    private const int OutputConflictExitCode = 7;
    private const int ParseFailuresExitCode = 8;

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
            ValidateTargetFunction(options.TargetFunction);
            var manifest = AcquisitionValidator.ReadJson<BuildManifest>(
                options.BuildManifestPath,
                "build manifest");
            AcquisitionValidator.ValidateManifest(manifest);
            var census = AcquisitionValidator.ReadJson<StaticCensus>(
                options.StaticCensusPath,
                "static census");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var censusIdentity = FileIdentityFactory.Create(options.StaticCensusPath);
            var mappings = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            UnlockableArtifactValidator.ValidateCensus(
                census,
                manifest,
                manifestIdentity.Sha256);
            if (census.Totals.FailedPackageCount != 0)
            {
                throw new InvalidDataException(
                    "Blueprint function declaration discovery requires a complete static census.");
            }

            var packagePaths = AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory);

            var scan = BlueprintFunctionDeclarationScanner.Scan(
                census,
                options.MappingsPath,
                options.PackageDirectory,
                options.TargetFunction);
            var artifact = CreateArtifact(
                manifest,
                manifestIdentity.Sha256,
                censusIdentity,
                mappings,
                options.TargetFunction,
                scan);

            AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory,
                packagePaths);
            AcquisitionValidator.VerifyUnchanged(
                options.BuildManifestPath,
                manifestIdentity,
                "Build manifest");
            AcquisitionValidator.VerifyUnchanged(
                options.StaticCensusPath,
                censusIdentity,
                "Static census");
            AcquisitionValidator.VerifyUnchanged(
                options.MappingsPath,
                mappings,
                "Mappings");

            var json = JsonSerializer.Serialize(artifact, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(
                options.OutputPath,
                json,
                "Blueprint function declarations");
            if (writeStatus == ArtifactWriteStatus.Conflict)
            {
                return OutputConflictExitCode;
            }

            return scan.Failures.Count > 0 ? ParseFailuresExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Blueprint-function-declarations operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Blueprint-function-declarations input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine($"Blueprint-function-declarations input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Blueprint-function-declarations access failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            Console.Error.WriteLine(
                $"Blueprint-function-declarations extraction failed ({exception.GetType().Name}).");
            return InputFailureExitCode;
        }
    }

    private static BlueprintFunctionDeclarations CreateArtifact(
        BuildManifest manifest,
        string manifestSha256,
        FileIdentity censusIdentity,
        MappingIdentity mappings,
        string targetFunction,
        BlueprintFunctionDeclarationScanner.BlueprintFunctionDeclarationScan scan)
        => new(
            ArtifactType: "blueprint-function-declarations",
            Build: new CensusBuildReference(
                manifestSha256,
                manifest.Steam.AppId,
                manifest.Steam.BuildId),
            StaticCensus: new StaticCensusInput(
                censusIdentity.FileName,
                censusIdentity.SizeBytes,
                censusIdentity.Sha256),
            Mappings: mappings,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                "NeonRetroRewind.StaticExtractor",
                AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Target: new BlueprintFunctionDeclarationTarget(targetFunction),
            CandidateRule: BlueprintFunctionDeclarationScanner.CandidateRule,
            DeclarationRule: BlueprintFunctionDeclarationScanner.DeclarationRule,
            Coverage: scan.Failures.Count == 0 ? "complete" : "partial",
            Totals: new BlueprintFunctionDeclarationTotals(
                scan.CandidatePackageCount,
                scan.ScannedPackageCount,
                scan.Failures.Count,
                scan.RawFunctionExportCount,
                scan.Declarations.Count),
            Declarations: scan.Declarations,
            Failures: scan.Failures);

    private static void ValidateTargetFunction(string value)
    {
        if (string.IsNullOrWhiteSpace(value) ||
            value.Length > 256 ||
            value.Any(char.IsControl))
        {
            throw new InvalidDataException(
                "Target function must be 1 to 256 printable characters.");
        }
    }

    private static bool TryParseArguments(
        string[] args,
        out BlueprintFunctionDeclarationsOptions options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = BlueprintFunctionDeclarationsOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = BlueprintFunctionDeclarationsOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[]
        {
            "--build-manifest",
            "--static-census",
            "--mappings",
            "--package-directory",
            "--target-function",
            "--output",
        };
        var unknown = values.Keys.FirstOrDefault(
            key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = BlueprintFunctionDeclarationsOptions.Empty;
            error = unknown is null
                ? "Blueprint-function-declarations generation requires all six input and output options."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new BlueprintFunctionDeclarationsOptions(
            values["--build-manifest"],
            values["--static-census"],
            values["--mappings"],
            values["--package-directory"],
            values["--target-function"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor blueprint-function-declarations --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --target-function <name> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command scans every raw cooked Function export for one exact object name and records each loaded declaration's signature and owner linkage.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record BlueprintFunctionDeclarationsOptions(
        string BuildManifestPath,
        string StaticCensusPath,
        string MappingsPath,
        string PackageDirectory,
        string TargetFunction,
        string OutputPath)
    {
        public static BlueprintFunctionDeclarationsOptions Empty { get; } =
            new("", "", "", "", "", "");
    }
}
