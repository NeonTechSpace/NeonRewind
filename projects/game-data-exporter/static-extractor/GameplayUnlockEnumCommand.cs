using System.Text.Json;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Assets.Objects.Properties;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Versions;

namespace NeonRetroRewind.StaticExtractor;

internal static class GameplayUnlockEnumCommand
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
            ValidateTargetProfile(targetProfile, manifest, manifestIdentity, mappingIdentity);
            BlueprintClusterEvidenceReader.ValidateTargets(
                census,
                [new(targetProfile.GameplayUnlockEnum.PackagePath, "UserDefinedEnum")],
                "gameplay-unlock enum");
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
            var writeStatus = ImmutableArtifactWriter.Write(options.OutputPath, json, "Gameplay-unlock enum");
            return writeStatus == ArtifactWriteStatus.Conflict ? OutputConflictExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Gameplay-unlock-enum operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Gameplay-unlock-enum input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (System.Text.Json.JsonException exception)
        {
            Console.Error.WriteLine($"Gameplay-unlock-enum input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Gameplay-unlock-enum access failed: {exception.Message}");
            return InputFailureExitCode;
        }
    }

    private static GameplayUnlockEnumEvidence CreateEvidence(
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

        var enumTarget = targetProfile.GameplayUnlockEnum;
        if (!provider.TryGetGameFile(enumTarget.PackagePath, out var file))
        {
            throw new InvalidDataException("Gameplay-unlock enum package is missing from the mounted provider.");
        }

        var enums = provider.LoadPackage(file).GetExports().OfType<UUserDefinedEnum>().ToArray();
        if (enums is not [{ } source] ||
            source.Name != enumTarget.EnumName ||
            source.GetPathName() != enumTarget.ObjectPath)
        {
            throw new InvalidDataException("Gameplay-unlock enum package no longer contains its exact enum export.");
        }

        var displayNameTags = source.Properties
            .Where(tag => tag.Name.Text == "DisplayNameMap")
            .ToArray();
        if (displayNameTags is not [{ Tag: MapProperty displayNameProperty }])
        {
            throw new InvalidDataException("Gameplay-unlock enum has no exact display-name map.");
        }

        var displayNameMap = displayNameProperty.Value ??
            throw new InvalidDataException("Gameplay-unlock display-name map has no value.");
        var displayNames = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var pair in displayNameMap.Properties)
        {
            if (pair.Key is not NameProperty key || pair.Value is not TextProperty value)
            {
                throw new InvalidDataException("Gameplay-unlock display-name map changed type.");
            }

            var internalName = key.Value.Text;
            var displayName = value.Value?.Text;
            if (string.IsNullOrWhiteSpace(internalName) ||
                string.IsNullOrWhiteSpace(displayName) ||
                !displayNames.TryAdd(internalName, displayName))
            {
                throw new InvalidDataException("Gameplay-unlock display-name map is incomplete or duplicated.");
            }
        }

        var names = source.Names.OrderBy(pair => pair.Item2).ToArray();
        if (names.Length < 2 ||
            names[^1].Item2 != names.Length - 1 ||
            !names[^1].Item1.Text.EndsWith("_MAX", StringComparison.Ordinal))
        {
            throw new InvalidDataException("Gameplay-unlock enum no longer has one terminal maximum entry.");
        }

        var enumerators = names[..^1].Select((pair, index) =>
        {
            var internalName = pair.Item1.Text;
            var separatorIndex = internalName.IndexOf("::", StringComparison.Ordinal);
            var authoredName = separatorIndex < 0 ? string.Empty : internalName[(separatorIndex + 2)..];
            if (pair.Item2 != index ||
                !internalName.StartsWith(enumTarget.InternalNamePrefix, StringComparison.Ordinal) ||
                !displayNames.Remove(authoredName, out var displayName))
            {
                throw new InvalidDataException("Gameplay-unlock enum values or display names changed.");
            }

            return new GameplayUnlockEnumerator(pair.Item2, internalName, displayName);
        }).ToArray();

        if (displayNames.Count != 0)
        {
            throw new InvalidDataException("Gameplay-unlock display-name map contains unknown entries.");
        }

        return new GameplayUnlockEnumEvidence(
            ArtifactType: "gameplay-unlock-enum",
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
            Source: new GameplayUnlockEnumSource(
                enumTarget.PackagePath,
                source.GetPathName(),
                source.Name,
                source.CppForm.ToString(),
                source.UnderlyingType.ToString()),
            Totals: new GameplayUnlockEnumTotals(enumerators.Length),
            Enumerators: enumerators);
    }

    private static void ValidateTargetProfile(
        LevelProgressionTargetProfile profile,
        BuildManifest manifest,
        FileIdentity manifestIdentity,
        MappingIdentity mappings)
    {
        if (profile.ProfileType != "level-progression-target-profile" ||
            profile.Build is null ||
            profile.Mappings is null ||
            profile.Engine is null ||
            profile.GameplayUnlockEnum is null ||
            profile.XpTable.ValueKind != JsonValueKind.Object ||
            profile.Traces.ValueKind != JsonValueKind.Object)
        {
            throw new InvalidDataException("Level-progression target profile is incomplete or unsupported.");
        }

        if (profile.Build.ManifestSha256 != manifestIdentity.Sha256 ||
            profile.Build.SteamAppId != manifest.Steam.AppId ||
            profile.Build.SteamBuildId != manifest.Steam.BuildId)
        {
            throw new InvalidDataException("Level-progression target profile refers to a different game build.");
        }

        if (profile.Mappings != mappings || profile.Engine != manifest.Engine)
        {
            throw new InvalidDataException("Level-progression target profile refers to different mappings or engine configuration.");
        }

        var enumTarget = profile.GameplayUnlockEnum;
        if (string.IsNullOrWhiteSpace(enumTarget.PackagePath) ||
            !enumTarget.PackagePath.EndsWith(".uasset", StringComparison.Ordinal) ||
            string.IsNullOrWhiteSpace(enumTarget.ObjectPath) ||
            string.IsNullOrWhiteSpace(enumTarget.EnumName) ||
            enumTarget.InternalNamePrefix != $"{enumTarget.EnumName}::")
        {
            throw new InvalidDataException("Level-progression target profile has an invalid gameplay-unlock enum target.");
        }
    }

    private static bool TryParseArguments(
        string[] args,
        out GameplayUnlockEnumOptions options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = GameplayUnlockEnumOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = GameplayUnlockEnumOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[] { "--build-manifest", "--static-census", "--mappings", "--target-profile", "--package-directory", "--output" };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = GameplayUnlockEnumOptions.Empty;
            error = unknown is null
                ? "Gameplay-unlock-enum generation requires all six input and output options."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new GameplayUnlockEnumOptions(
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
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor gameplay-unlock-enum --build-manifest <path> --static-census <path> --mappings <path> --target-profile <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command writes the exact internal values and display labels from the gameplay-unlock enum.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record GameplayUnlockEnumOptions(
        string BuildManifestPath,
        string StaticCensusPath,
        string MappingsPath,
        string TargetProfilePath,
        string PackageDirectory,
        string OutputPath)
    {
        public static GameplayUnlockEnumOptions Empty { get; } = new("", "", "", "", "", "");
    }
}
