using System.Text.Json;

namespace NeonRetroRewind.StaticExtractor;

internal static class StatisticEvidenceCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int InputFailureExitCode = 6;
    private const int OutputConflictExitCode = 7;

    private static readonly BlueprintClusterTarget[] Targets =
    [
        new("ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleMetric.uasset", "BlueprintGeneratedClass"),
        new("ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleMetric_Save.uasset", "UserDefinedStruct"),
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
            var manifest = AcquisitionValidator.ReadJson<BuildManifest>(options.BuildManifestPath, "build manifest");
            AcquisitionValidator.ValidateManifest(manifest);
            var census = AcquisitionValidator.ReadJson<StaticCensus>(options.StaticCensusPath, "static census");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var censusIdentity = FileIdentityFactory.Create(options.StaticCensusPath);
            var mappingIdentity = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            BlueprintClusterEvidenceReader.ValidateCensus(census, manifest, manifestIdentity.Sha256);
            BlueprintClusterEvidenceReader.ValidateTargets(census, Targets, "statistic");
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory);

            var evidence = CreateEvidence(
                manifest,
                manifestIdentity.Sha256,
                censusIdentity,
                mappingIdentity,
                options.MappingsPath,
                options.PackageDirectory);

            AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory, packagePaths);
            AcquisitionValidator.VerifyUnchanged(options.BuildManifestPath, manifestIdentity, "Build manifest");
            AcquisitionValidator.VerifyUnchanged(options.StaticCensusPath, censusIdentity, "Static census");
            AcquisitionValidator.VerifyUnchanged(options.MappingsPath, mappingIdentity, "Mappings");

            var json = JsonSerializer.Serialize(evidence, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(options.OutputPath, json, "Statistic evidence");
            return writeStatus == ArtifactWriteStatus.Conflict ? OutputConflictExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Statistic-evidence operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Statistic-evidence input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (System.Text.Json.JsonException exception)
        {
            Console.Error.WriteLine($"Statistic-evidence input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Newtonsoft.Json.JsonException exception)
        {
            Console.Error.WriteLine($"Statistic-evidence serialization failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Statistic-evidence access failed: {exception.Message}");
            return InputFailureExitCode;
        }
    }

    private static StatisticEvidence CreateEvidence(
        BuildManifest manifest,
        string manifestSha256,
        FileIdentity censusIdentity,
        MappingIdentity mappingIdentity,
        string mappingsPath,
        string packageDirectory)
    {
        var packages = BlueprintClusterEvidenceReader.Extract(mappingsPath, packageDirectory, Targets, "Statistic")
            .Select(package => new StatisticPackageEvidence(
                package.Path,
                package.BlueprintClasses,
                package.UserDefinedStructs))
            .ToArray();
        var blueprintClasses = packages.SelectMany(package => package.BlueprintClasses).ToArray();
        var userDefinedStructs = packages.SelectMany(package => package.UserDefinedStructs).ToArray();
        var defaults = blueprintClasses.SelectMany(value => value.ClassDefault.Properties)
            .Concat(userDefinedStructs.SelectMany(value => value.Defaults))
            .ToArray();
        var references = blueprintClasses.SelectMany(value => value.ClassDefault.References)
            .Concat(userDefinedStructs.SelectMany(value => value.References))
            .ToArray();

        return new StatisticEvidence(
            ArtifactType: "statistic-evidence",
            Build: new CensusBuildReference(
                ManifestSha256: manifestSha256,
                SteamAppId: manifest.Steam.AppId,
                SteamBuildId: manifest.Steam.BuildId),
            StaticCensus: new StatisticEvidenceInput(
                FileName: censusIdentity.FileName,
                SizeBytes: censusIdentity.SizeBytes,
                Sha256: censusIdentity.Sha256),
            Mappings: mappingIdentity,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                Name: "NeonRetroRewind.StaticExtractor",
                Version: AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                Cue4ParseVersion: AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Totals: new StatisticEvidenceTotals(
                PackageCount: packages.Length,
                BlueprintClassCount: blueprintClasses.Length,
                UserDefinedStructCount: userDefinedStructs.Length,
                FunctionCount: blueprintClasses.Sum(value => value.Functions.Count),
                FieldCount: blueprintClasses.Sum(value => value.Fields.Count) +
                    userDefinedStructs.Sum(value => value.Fields.Count),
                DefaultPropertyCount: defaults.Length,
                ReferenceCount: references.Length),
            Packages: packages);
    }

    private static bool TryParseArguments(
        string[] args,
        out StatisticEvidenceOptions options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = StatisticEvidenceOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = StatisticEvidenceOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[] { "--build-manifest", "--static-census", "--mappings", "--package-directory", "--output" };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = StatisticEvidenceOptions.Empty;
            error = unknown is null
                ? "Statistic-evidence generation requires all five input and output options."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new StatisticEvidenceOptions(
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
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor statistic-evidence --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command writes mapped class defaults and references for the statistic package cluster.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record StatisticEvidenceOptions(
        string BuildManifestPath,
        string StaticCensusPath,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static StatisticEvidenceOptions Empty { get; } = new("", "", "", "", "");
    }
}
