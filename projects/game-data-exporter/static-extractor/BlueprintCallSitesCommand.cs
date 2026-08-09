using System.Text.Json;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Versions;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintCallSitesCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int InputFailureExitCode = 6;
    private const int OutputConflictExitCode = 7;
    private const int ParseFailuresExitCode = 8;
    private const string CandidateRule = "parsed-packages-with-function-exports";

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
            var manifest = AcquisitionValidator.ReadJson<BuildManifest>(options.BuildManifestPath, "build manifest");
            AcquisitionValidator.ValidateManifest(manifest);
            var census = AcquisitionValidator.ReadJson<StaticCensus>(options.StaticCensusPath, "static census");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var censusIdentity = FileIdentityFactory.Create(options.StaticCensusPath);
            var mappingIdentity = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            ValidateCensus(census, manifest, manifestIdentity.Sha256);
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory);

            var callSites = CreateCallSites(
                manifest,
                census,
                manifestIdentity.Sha256,
                censusIdentity,
                mappingIdentity,
                options.MappingsPath,
                options.PackageDirectory,
                options.TargetFunction);

            AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory, packagePaths);
            AcquisitionValidator.VerifyUnchanged(options.BuildManifestPath, manifestIdentity, "Build manifest");
            AcquisitionValidator.VerifyUnchanged(options.StaticCensusPath, censusIdentity, "Static census");
            AcquisitionValidator.VerifyUnchanged(options.MappingsPath, mappingIdentity, "Mappings");

            var json = JsonSerializer.Serialize(callSites, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(options.OutputPath, json, "Blueprint call sites");
            if (writeStatus == ArtifactWriteStatus.Conflict)
            {
                return OutputConflictExitCode;
            }

            return callSites.Totals.FailedPackageCount > 0 ? ParseFailuresExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Blueprint-call-sites operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Blueprint-call-sites input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine($"Blueprint-call-sites input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Blueprint-call-sites access failed: {exception.Message}");
            return InputFailureExitCode;
        }
    }

    private static BlueprintCallSites CreateCallSites(
        BuildManifest manifest,
        StaticCensus census,
        string manifestSha256,
        FileIdentity censusIdentity,
        MappingIdentity mappingIdentity,
        string mappingsPath,
        string packageDirectory,
        string targetFunctionName)
    {
        var versions = new VersionContainer(EGame.GAME_UE5_4);
        using var provider = new DefaultFileProvider(
            Path.GetFullPath(packageDirectory),
            SearchOption.TopDirectoryOnly,
            versions,
            StringComparer.OrdinalIgnoreCase)
        {
            MappingsContainer = new FileUsmapTypeMappingsProvider(Path.GetFullPath(mappingsPath)),
            ReadScriptData = true,
        };

        provider.Initialize();
        provider.Mount();
        provider.PostMount();

        if (provider.MountedVfs.Count == 0 || provider.UnloadedVfs.Count > 0)
        {
            throw new InvalidDataException("Package containers did not mount completely.");
        }

        var candidates = census.Packages
            .Where(package =>
                package.Status == "parsed" &&
                package.ExportClasses.Any(exportClass =>
                    exportClass.Name == "Function" && exportClass.Count > 0))
            .OrderBy(package => package.Path, StringComparer.Ordinal)
            .ToArray();
        var callSites = new List<BlueprintCallSite>();
        var failures = new List<BlueprintCallSiteFailure>();
        var classCount = 0;
        var functionCount = 0;

        foreach (var candidate in candidates)
        {
            try
            {
                if (!provider.TryGetGameFile(candidate.Path, out var file))
                {
                    throw new InvalidDataException("Candidate package is missing from the mounted provider.");
                }

                var classes = provider.LoadPackage(file)
                    .GetExports()
                    .OfType<UBlueprintGeneratedClass>()
                    .OrderBy(blueprintClass => blueprintClass.GetPathName(), StringComparer.Ordinal)
                    .ToArray();
                var packageCallSites = new List<BlueprintCallSite>();
                var packageFunctionCount = 0;
                foreach (var blueprintClass in classes)
                {
                    packageCallSites.AddRange(BlueprintCallScanner.ScanClass(
                        candidate.Path,
                        blueprintClass,
                        targetFunctionName,
                        out var classFunctionCount));
                    packageFunctionCount += classFunctionCount;
                }

                classCount += classes.Length;
                functionCount += packageFunctionCount;
                callSites.AddRange(packageCallSites);
            }
            catch (Exception exception) when (exception is not OutOfMemoryException)
            {
                failures.Add(new BlueprintCallSiteFailure(candidate.Path, exception.GetType().Name));
            }
        }

        var orderedCallSites = callSites
            .OrderBy(callSite => callSite.PackagePath, StringComparer.Ordinal)
            .ThenBy(callSite => callSite.ClassPath, StringComparer.Ordinal)
            .ThenBy(callSite => callSite.FunctionPath, StringComparer.Ordinal)
            .ThenBy(callSite => callSite.StatementIndex)
            .ThenBy(callSite => callSite.CallKind, StringComparer.Ordinal)
            .ToArray();
        var orderedFailures = failures
            .OrderBy(failure => failure.PackagePath, StringComparer.Ordinal)
            .ToArray();

        return new BlueprintCallSites(
            ArtifactType: "blueprint-call-sites",
            Build: new CensusBuildReference(
                ManifestSha256: manifestSha256,
                SteamAppId: manifest.Steam.AppId,
                SteamBuildId: manifest.Steam.BuildId),
            StaticCensus: new StaticCensusInput(
                FileName: censusIdentity.FileName,
                SizeBytes: censusIdentity.SizeBytes,
                Sha256: censusIdentity.Sha256),
            Mappings: mappingIdentity,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                Name: "NeonRetroRewind.StaticExtractor",
                Version: AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                Cue4ParseVersion: AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Target: new BlueprintCallTarget(targetFunctionName),
            CandidateRule,
            Coverage: orderedFailures.Length == 0 ? "complete" : "partial",
            Totals: new BlueprintCallSitesTotals(
                CandidatePackageCount: candidates.Length,
                ScannedPackageCount: candidates.Length - orderedFailures.Length,
                FailedPackageCount: orderedFailures.Length,
                ClassCount: classCount,
                FunctionCount: functionCount,
                CallSiteCount: orderedCallSites.Length),
            CallSites: orderedCallSites,
            Failures: orderedFailures);
    }

    private static void ValidateCensus(
        StaticCensus census,
        BuildManifest manifest,
        string manifestSha256)
    {
        if (census.ArtifactType != "static-census")
        {
            throw new InvalidDataException("Expected a static-census artifact.");
        }

        if (census.Build is null ||
            census.Engine is null ||
            census.Totals is null ||
            census.Packages is null ||
            census.Packages.Any(package =>
                package is null ||
                package.ExportClasses is null ||
                package.ExportClasses.Any(exportClass => exportClass is null)))
        {
            throw new InvalidDataException("Static census is incomplete.");
        }

        if (!string.Equals(census.Build.ManifestSha256, manifestSha256, StringComparison.Ordinal) ||
            !string.Equals(census.Build.SteamAppId, manifest.Steam.AppId, StringComparison.Ordinal) ||
            !string.Equals(census.Build.SteamBuildId, manifest.Steam.BuildId, StringComparison.Ordinal) ||
            census.Engine != manifest.Engine)
        {
            throw new InvalidDataException("Static census does not belong to the supplied build.");
        }

        var parsedCount = census.Packages.Count(package => package.Status == "parsed");
        var failedCount = census.Packages.Count(package => package.Status == "failed");
        if (census.Totals.PackageCount != census.Packages.Count ||
            census.Totals.ParsedPackageCount != parsedCount ||
            census.Totals.FailedPackageCount != failedCount ||
            parsedCount + failedCount != census.Packages.Count)
        {
            throw new InvalidDataException("Static census package totals are inconsistent.");
        }
    }

    private static void ValidateTargetFunction(string value)
    {
        if (string.IsNullOrWhiteSpace(value) ||
            value.Length > 256 ||
            value.Any(char.IsControl))
        {
            throw new InvalidDataException("Target function must be 1 to 256 printable characters.");
        }
    }

    private static bool TryParseArguments(
        string[] args,
        out BlueprintCallSitesOptions options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = BlueprintCallSitesOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = BlueprintCallSitesOptions.Empty;
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
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = BlueprintCallSitesOptions.Empty;
            error = unknown is null
                ? "Blueprint-call-sites generation requires all six input and output options."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new BlueprintCallSitesOptions(
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
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor blueprint-call-sites --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --target-function <name> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command scans parsed Blueprint function bytecode for calls to one exact function name.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record BlueprintCallSitesOptions(
        string BuildManifestPath,
        string StaticCensusPath,
        string MappingsPath,
        string PackageDirectory,
        string TargetFunction,
        string OutputPath)
    {
        public static BlueprintCallSitesOptions Empty { get; } = new("", "", "", "", "", "");
    }
}
