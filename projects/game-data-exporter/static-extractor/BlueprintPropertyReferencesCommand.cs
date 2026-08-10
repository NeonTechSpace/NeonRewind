using System.Text.Json;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintPropertyReferencesCommand
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
            ValidateTargetProperty(options.TargetProperty);
            var manifest = AcquisitionValidator.ReadJson<BuildManifest>(
                options.BuildManifestPath,
                "build manifest");
            AcquisitionValidator.ValidateManifest(manifest);
            var census = AcquisitionValidator.ReadJson<StaticCensus>(
                options.StaticCensusPath,
                "static census");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var censusIdentity = FileIdentityFactory.Create(options.StaticCensusPath);
            var mappingIdentity = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            UnlockableArtifactValidator.ValidateCensus(
                census,
                manifest,
                manifestIdentity.Sha256);
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory);

            var scan = BlueprintPropertyReferenceScanner.Scan(
                census,
                options.MappingsPath,
                options.PackageDirectory,
                options.TargetProperty);
            var artifact = CreateArtifact(
                manifest,
                manifestIdentity.Sha256,
                censusIdentity,
                mappingIdentity,
                options.TargetProperty,
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
                mappingIdentity,
                "Mappings");

            var json = JsonSerializer.Serialize(artifact, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(
                options.OutputPath,
                json,
                "Blueprint property references");
            if (writeStatus == ArtifactWriteStatus.Conflict)
            {
                return OutputConflictExitCode;
            }

            return scan.Failures.Count > 0 ? ParseFailuresExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Blueprint-property-references operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Blueprint-property-references input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine($"Blueprint-property-references input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Blueprint-property-references access failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            Console.Error.WriteLine(
                $"Blueprint-property-references extraction failed ({exception.GetType().Name}).");
            return InputFailureExitCode;
        }
    }

    private static BlueprintPropertyReferences CreateArtifact(
        BuildManifest manifest,
        string manifestSha256,
        FileIdentity censusIdentity,
        MappingIdentity mappings,
        string targetProperty,
        BlueprintPropertyReferenceScanner.BlueprintPropertyReferenceScan scan)
    {
        return new BlueprintPropertyReferences(
            ArtifactType: "blueprint-property-references",
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
            Target: new BlueprintPropertyTarget(targetProperty),
            CandidateRule: BlueprintPropertyReferenceScanner.CandidateRule,
            ReferenceRule: BlueprintPropertyReferenceScanner.ReferenceRule,
            Coverage: scan.Failures.Count == 0 ? "complete" : "partial",
            Totals: new BlueprintPropertyReferenceTotals(
                scan.CandidatePackageCount,
                scan.ScannedPackageCount,
                scan.Failures.Count,
                scan.ClassCount,
                scan.FunctionCount,
                scan.References.Count,
                scan.References.Count(reference => reference.Access == "read"),
                scan.References.Count(reference => reference.Access == "write"),
                scan.References.Count(reference => reference.Access == "metadata")),
            References: scan.References,
            Failures: scan.Failures);
    }

    private static void ValidateTargetProperty(string value)
    {
        if (string.IsNullOrWhiteSpace(value) ||
            value.Length > 256 ||
            value.Any(char.IsControl))
        {
            throw new InvalidDataException(
                "Target property must be 1 to 256 printable characters.");
        }
    }

    private static bool TryParseArguments(
        string[] args,
        out BlueprintPropertyReferencesOptions options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = BlueprintPropertyReferencesOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = BlueprintPropertyReferencesOptions.Empty;
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
            "--target-property",
            "--output",
        };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = BlueprintPropertyReferencesOptions.Empty;
            error = unknown is null
                ? "Blueprint-property-references generation requires all six input and output options."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new BlueprintPropertyReferencesOptions(
            values["--build-manifest"],
            values["--static-census"],
            values["--mappings"],
            values["--package-directory"],
            values["--target-property"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor blueprint-property-references --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --target-property <name> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command scans parsed Blueprint function bytecode for exact Kismet property-pointer names and classifies read, write, and metadata references.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record BlueprintPropertyReferencesOptions(
        string BuildManifestPath,
        string StaticCensusPath,
        string MappingsPath,
        string PackageDirectory,
        string TargetProperty,
        string OutputPath)
    {
        public static BlueprintPropertyReferencesOptions Empty { get; } =
            new("", "", "", "", "", "");
    }
}
