using System.Text.Json;

namespace NeonRetroRewind.StaticExtractor;

internal static class MarketEvidenceCommand
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
            var profileIdentity = FileIdentityFactory.Create(options.TargetProfilePath);
            var profile = AcquisitionValidator.ReadJson<MarketEvidenceTargetProfile>(
                options.TargetProfilePath,
                "market-evidence target profile");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var censusIdentity = FileIdentityFactory.Create(options.StaticCensusPath);
            var mappingIdentity = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            var targets = ValidateTargetProfile(profile, manifest, manifestIdentity, mappingIdentity);
            BlueprintClusterEvidenceReader.ValidateCensus(census, manifest, manifestIdentity.Sha256);
            BlueprintClusterEvidenceReader.ValidateTargets(census, targets, "market");
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory);

            var evidence = CreateEvidence(
                manifest,
                manifestIdentity.Sha256,
                censusIdentity,
                mappingIdentity,
                profile,
                profileIdentity,
                targets,
                options.MappingsPath,
                options.PackageDirectory);

            AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory, packagePaths);
            AcquisitionValidator.VerifyUnchanged(options.BuildManifestPath, manifestIdentity, "Build manifest");
            AcquisitionValidator.VerifyUnchanged(options.StaticCensusPath, censusIdentity, "Static census");
            AcquisitionValidator.VerifyUnchanged(options.MappingsPath, mappingIdentity, "Mappings");
            AcquisitionValidator.VerifyUnchanged(
                options.TargetProfilePath,
                profileIdentity,
                "Market-evidence target profile");

            var json = JsonSerializer.Serialize(evidence, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(options.OutputPath, json, "Market evidence");
            return writeStatus == ArtifactWriteStatus.Conflict ? OutputConflictExitCode : 0;
        }
        catch (IOException)
        {
            Console.Error.WriteLine("Market-evidence operation failed.");
            return InputFailureExitCode;
        }
        catch (InvalidDataException)
        {
            Console.Error.WriteLine("Market-evidence input failed.");
            return InputFailureExitCode;
        }
        catch (JsonException)
        {
            Console.Error.WriteLine("Market-evidence input is not valid JSON.");
            return InputFailureExitCode;
        }
        catch (Newtonsoft.Json.JsonException)
        {
            Console.Error.WriteLine("Market-evidence serialization failed.");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException)
        {
            Console.Error.WriteLine("Market-evidence access failed.");
            return InputFailureExitCode;
        }
    }

    private static MarketEvidence CreateEvidence(
        BuildManifest manifest,
        string manifestSha256,
        FileIdentity censusIdentity,
        MappingIdentity mappingIdentity,
        MarketEvidenceTargetProfile profile,
        FileIdentity profileIdentity,
        IReadOnlyList<BlueprintClusterTarget> targets,
        string mappingsPath,
        string packageDirectory)
    {
        var extracted = BlueprintClusterEvidenceReader.Extract(
            mappingsPath,
            packageDirectory,
            targets,
            "Market");
        if (extracted.Count != 2 ||
            extracted[0].BlueprintClasses.Count != 1 ||
            extracted[0].UserDefinedStructs.Count != 0 ||
            extracted[1].BlueprintClasses.Count != 0 ||
            extracted[1].UserDefinedStructs.Count != 1)
        {
            throw new InvalidDataException("Market packages do not match the expected evidence shape.");
        }

        var packages = new[]
        {
            new MarketPackageEvidence(
                "market-manager",
                extracted[0].Path,
                extracted[0].BlueprintClasses,
                extracted[0].UserDefinedStructs),
            new MarketPackageEvidence(
                "market-save",
                extracted[1].Path,
                extracted[1].BlueprintClasses,
                extracted[1].UserDefinedStructs),
        };
        var blueprintClasses = packages.SelectMany(package => package.BlueprintClasses).ToArray();
        var userDefinedStructs = packages.SelectMany(package => package.UserDefinedStructs).ToArray();
        var defaults = blueprintClasses.SelectMany(value => value.ClassDefault.Properties)
            .Concat(userDefinedStructs.SelectMany(value => value.Defaults))
            .ToArray();
        var references = blueprintClasses.SelectMany(value => value.ClassDefault.References)
            .Concat(userDefinedStructs.SelectMany(value => value.References))
            .ToArray();

        return new MarketEvidence(
            ArtifactType: "market-evidence",
            Build: new CensusBuildReference(
                ManifestSha256: manifestSha256,
                SteamAppId: manifest.Steam.AppId,
                SteamBuildId: manifest.Steam.BuildId),
            StaticCensus: new MarketEvidenceInput(
                FileName: censusIdentity.FileName,
                SizeBytes: censusIdentity.SizeBytes,
                Sha256: censusIdentity.Sha256),
            Mappings: mappingIdentity,
            Engine: manifest.Engine,
            TargetProfile: new TargetProfileIdentity(
                profileIdentity.FileName,
                profileIdentity.SizeBytes,
                profileIdentity.Sha256,
                profile.ProfileType),
            Extractor: new ExtractorIdentity(
                Name: "NeonRetroRewind.StaticExtractor",
                Version: AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                Cue4ParseVersion: AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Totals: new MarketEvidenceTotals(
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

    private static IReadOnlyList<BlueprintClusterTarget> ValidateTargetProfile(
        MarketEvidenceTargetProfile profile,
        BuildManifest manifest,
        FileIdentity manifestIdentity,
        MappingIdentity mappings)
    {
        if (profile.ProfileType != "market-evidence-target-profile" ||
            profile.Build is null ||
            profile.Mappings is null ||
            profile.Engine is null ||
            profile.Targets is null ||
            profile.Targets.Manager is null ||
            profile.Targets.Save is null)
        {
            throw new InvalidDataException("Market-evidence target profile is incomplete or unsupported.");
        }

        if (profile.Build.ManifestSha256 != manifestIdentity.Sha256 ||
            profile.Build.SteamAppId != manifest.Steam.AppId ||
            profile.Build.SteamBuildId != manifest.Steam.BuildId)
        {
            throw new InvalidDataException("Market-evidence target profile refers to a different game build.");
        }

        if (profile.Mappings != mappings || profile.Engine != manifest.Engine)
        {
            throw new InvalidDataException(
                "Market-evidence target profile refers to different mappings or engine configuration.");
        }

        var managerPath = profile.Targets.Manager.PackagePath;
        var savePath = profile.Targets.Save.PackagePath;
        if (!IsPackagePath(managerPath) ||
            !IsPackagePath(savePath) ||
            string.Equals(managerPath, savePath, StringComparison.Ordinal))
        {
            throw new InvalidDataException("Market-evidence target profile has invalid package targets.");
        }

        return
        [
            new(managerPath, "BlueprintGeneratedClass"),
            new(savePath, "UserDefinedStruct"),
        ];
    }

    private static bool IsPackagePath(string? path) =>
        !string.IsNullOrWhiteSpace(path) && path.EndsWith(".uasset", StringComparison.Ordinal);

    private static bool TryParseArguments(string[] args, out Options options, out string error)
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

        var required = new[]
        {
            "--build-manifest",
            "--static-census",
            "--mappings",
            "--target-profile",
            "--package-directory",
            "--output",
        };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = Options.Empty;
            error = unknown is null
                ? "Market-evidence generation requires all six input and output options."
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
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor market-evidence --build-manifest <path> --static-census <path> --mappings <path> --target-profile <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command writes mapped class defaults and references for the Market manager and save packages selected by a private target profile.");
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
