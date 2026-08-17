using System.Text.Json;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintFunctionInventoryCommand
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
                    "Blueprint function inventory requires a complete static census.");
            }

            var packagePaths = AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory);

            var scan = BlueprintFunctionDeclarationScanner.ScanAll(
                census,
                options.MappingsPath,
                options.PackageDirectory);
            var artifact = CreateArtifact(
                manifest,
                manifestIdentity.Sha256,
                censusIdentity,
                mappings,
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
                "Blueprint function inventory");
            if (writeStatus == ArtifactWriteStatus.Conflict)
            {
                return OutputConflictExitCode;
            }

            return scan.Failures.Count > 0 ? ParseFailuresExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Blueprint-function-inventory operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Blueprint-function-inventory input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine($"Blueprint-function-inventory input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Blueprint-function-inventory access failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            Console.Error.WriteLine(
                $"Blueprint-function-inventory extraction failed ({exception.GetType().Name}).");
            return InputFailureExitCode;
        }
    }

    private static BlueprintFunctionInventory CreateArtifact(
        BuildManifest manifest,
        string manifestSha256,
        FileIdentity censusIdentity,
        MappingIdentity mappings,
        BlueprintFunctionDeclarationScanner.BlueprintFunctionDeclarationScan scan)
        => new(
            ArtifactType: "blueprint-function-inventory",
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
            CandidateRule: BlueprintFunctionDeclarationScanner.CandidateRule,
            InventoryRule: BlueprintFunctionDeclarationScanner.InventoryRule,
            Coverage: scan.Failures.Count == 0 ? "complete" : "partial",
            Totals: new BlueprintFunctionInventoryTotals(
                scan.CandidatePackageCount,
                scan.ScannedPackageCount,
                scan.Failures.Count,
                scan.RawFunctionExportCount,
                scan.Declarations.Count),
            Functions: scan.Declarations,
            Failures: scan.Failures);

    private static bool TryParseArguments(
        string[] args,
        out BlueprintFunctionInventoryOptions options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = BlueprintFunctionInventoryOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = BlueprintFunctionInventoryOptions.Empty;
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
            "--output",
        };
        var unknown = values.Keys.FirstOrDefault(
            key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = BlueprintFunctionInventoryOptions.Empty;
            error = unknown is null
                ? "Blueprint-function-inventory generation requires all five input and output options."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new BlueprintFunctionInventoryOptions(
            values["--build-manifest"],
            values["--static-census"],
            values["--mappings"],
            values["--package-directory"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor blueprint-function-inventory --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command inventories every raw cooked Function export and records each loaded declaration's signature and owner linkage.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record BlueprintFunctionInventoryOptions(
        string BuildManifestPath,
        string StaticCensusPath,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static BlueprintFunctionInventoryOptions Empty { get; } =
            new("", "", "", "", "");
    }
}
