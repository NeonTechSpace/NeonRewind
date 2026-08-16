using System.Text.Json;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Versions;

namespace NeonRetroRewind.StaticExtractor;

internal static class LevelProgressionCategoryEnumsCommand
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
            var manifest = AcquisitionValidator.ReadJson<BuildManifest>(options.BuildManifestPath, "build manifest");
            AcquisitionValidator.ValidateManifest(manifest);
            var census = AcquisitionValidator.ReadJson<StaticCensus>(options.StaticCensusPath, "static census");
            var targetProfileIdentity = FileIdentityFactory.Create(options.TargetProfilePath);
            var targetProfile = AcquisitionValidator.ReadJson<LevelProgressionTargetProfile>(
                options.TargetProfilePath,
                "level-progression target profile");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var censusIdentity = FileIdentityFactory.Create(options.StaticCensusPath);
            var mappingIdentity = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            BlueprintClusterEvidenceReader.ValidateCensus(census, manifest, manifestIdentity.Sha256);
            GameplayUnlockEnumCommand.ValidateTargetProfile(
                targetProfile,
                manifest,
                manifestIdentity,
                mappingIdentity);
            BlueprintClusterEvidenceReader.ValidateTargets(
                census,
                [
                    new(targetProfile.CategoryEnums.Movie.PackagePath, "UserDefinedEnum"),
                    new(targetProfile.CategoryEnums.Game.PackagePath, "UserDefinedEnum"),
                ],
                "level-progression category enums");
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory);

            var evidence = CreateEvidence(
                manifest,
                manifestIdentity.Sha256,
                censusIdentity,
                mappingIdentity,
                targetProfile,
                targetProfileIdentity,
                options.MappingsPath,
                options.PackageDirectory);

            AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory, packagePaths);
            AcquisitionValidator.VerifyUnchanged(options.BuildManifestPath, manifestIdentity, "Build manifest");
            AcquisitionValidator.VerifyUnchanged(options.StaticCensusPath, censusIdentity, "Static census");
            AcquisitionValidator.VerifyUnchanged(options.MappingsPath, mappingIdentity, "Mappings");
            AcquisitionValidator.VerifyUnchanged(
                options.TargetProfilePath,
                targetProfileIdentity,
                "Level-progression target profile");

            var json = JsonSerializer.Serialize(evidence, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(
                options.OutputPath,
                json,
                "Level-progression category enums");
            return writeStatus == ArtifactWriteStatus.Conflict ? OutputConflictExitCode : 0;
        }
        catch (IOException)
        {
            Console.Error.WriteLine("Level-progression-category-enums operation failed.");
            return InputFailureExitCode;
        }
        catch (InvalidDataException)
        {
            Console.Error.WriteLine("Level-progression-category-enums input failed.");
            return InputFailureExitCode;
        }
        catch (JsonException)
        {
            Console.Error.WriteLine("Level-progression-category-enums input is not valid JSON.");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException)
        {
            Console.Error.WriteLine("Level-progression-category-enums access failed.");
            return InputFailureExitCode;
        }
    }

    private static LevelProgressionCategoryEnumsEvidence CreateEvidence(
        BuildManifest manifest,
        string manifestSha256,
        FileIdentity censusIdentity,
        MappingIdentity mappingIdentity,
        LevelProgressionTargetProfile targetProfile,
        FileIdentity targetProfileIdentity,
        string mappingsPath,
        string packageDirectory)
    {
        var versions = new VersionContainer(EGame.GAME_UE5_4);
        using var provider = new DefaultFileProvider(
            Path.GetFullPath(packageDirectory),
            SearchOption.TopDirectoryOnly,
            versions,
            StringComparer.OrdinalIgnoreCase)
        {
            MappingsContainer = new FileUsmapTypeMappingsProvider(Path.GetFullPath(mappingsPath)),
        };

        provider.Initialize();
        provider.Mount();
        provider.PostMount();
        if (provider.MountedVfs.Count == 0 || provider.UnloadedVfs.Count > 0)
        {
            throw new InvalidDataException("Package containers did not mount completely.");
        }

        var movie = UserDefinedEnumExtractor.Extract(
            provider,
            targetProfile.CategoryEnums.Movie,
            "Movie-category enum");
        var game = UserDefinedEnumExtractor.Extract(
            provider,
            targetProfile.CategoryEnums.Game,
            "Game-category enum");

        return new LevelProgressionCategoryEnumsEvidence(
            ArtifactType: "level-progression-category-enums",
            Build: new CensusBuildReference(
                ManifestSha256: manifestSha256,
                SteamAppId: manifest.Steam.AppId,
                SteamBuildId: manifest.Steam.BuildId),
            StaticCensus: new GameplayUnlockEnumInput(
                FileName: censusIdentity.FileName,
                SizeBytes: censusIdentity.SizeBytes,
                Sha256: censusIdentity.Sha256),
            Mappings: mappingIdentity,
            Engine: manifest.Engine,
            TargetProfile: new TargetProfileIdentity(
                targetProfileIdentity.FileName,
                targetProfileIdentity.SizeBytes,
                targetProfileIdentity.Sha256,
                targetProfile.ProfileType),
            Extractor: new ExtractorIdentity(
                Name: "NeonRetroRewind.StaticExtractor",
                Version: AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                Cue4ParseVersion: AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Categories: new LevelProgressionCategoryEnums(Movie: movie, Game: game));
    }

    private static bool TryParseArguments(
        string[] args,
        out Options options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = Options.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = Options.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[] { "--build-manifest", "--static-census", "--mappings", "--target-profile", "--package-directory", "--output" };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = Options.Empty;
            error = unknown is null
                ? "Level-progression-category-enums generation requires all six input and output options."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new Options(
            values["--build-manifest"],
            values["--static-census"],
            values["--mappings"],
            values["--target-profile"],
            values["--package-directory"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor level-progression-category-enums --build-manifest <path> --static-census <path> --mappings <path> --target-profile <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command writes exact internal values and display labels for the movie and game category enums used by level progression.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record Options(
        string BuildManifestPath,
        string StaticCensusPath,
        string MappingsPath,
        string TargetProfilePath,
        string PackageDirectory,
        string OutputPath)
    {
        public static Options Empty { get; } = new("", "", "", "", "", "");
    }
}
