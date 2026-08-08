using System.Text.Json;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Versions;

namespace NeonRewind.StaticExtractor;

internal static class RentalEvidenceCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int InputFailureExitCode = 6;
    private const int OutputConflictExitCode = 7;
    private const int SchemaVersion = 1;

    private static readonly RentalTarget[] Targets =
    [
        new("RetroRewind/Content/VideoStore/core/ai/Task/BTTask_BringBackProductFromRent.uasset", "BlueprintGeneratedClass"),
        new("RetroRewind/Content/VideoStore/core/ai/Task/BTTask_Checkout-Fees.uasset", "BlueprintGeneratedClass"),
        new("RetroRewind/Content/VideoStore/core/ai/Task/BTTask_Checkout-Pay.uasset", "BlueprintGeneratedClass"),
        new("RetroRewind/Content/VideoStore/core/blueprint/RentSystem/Fees.uasset", "UserDefinedStruct"),
        new("RetroRewind/Content/VideoStore/core/blueprint/RentSystem/RentSystem.uasset", "BlueprintGeneratedClass"),
        new("RetroRewind/Content/VideoStore/core/blueprint/RentSystem/RentSystem_Struct.uasset", "UserDefinedStruct"),
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
            ValidateCensus(census, manifest, manifestIdentity.Sha256);
            ValidateTargets(census);
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
            var writeStatus = ImmutableArtifactWriter.Write(options.OutputPath, json, "Rental evidence");
            return writeStatus == ArtifactWriteStatus.Conflict ? OutputConflictExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Rental-evidence operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Rental-evidence input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (System.Text.Json.JsonException exception)
        {
            Console.Error.WriteLine($"Rental-evidence input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Newtonsoft.Json.JsonException exception)
        {
            Console.Error.WriteLine($"Rental-evidence serialization failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Rental-evidence access failed: {exception.Message}");
            return InputFailureExitCode;
        }
    }

    private static RentalEvidence CreateEvidence(
        BuildManifest manifest,
        string manifestSha256,
        FileIdentity censusIdentity,
        MappingIdentity mappingIdentity,
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

        var packages = Targets.Select(target => ExtractPackage(provider, target)).ToArray();
        var blueprintClasses = packages.SelectMany(package => package.BlueprintClasses).ToArray();
        var userDefinedStructs = packages.SelectMany(package => package.UserDefinedStructs).ToArray();
        var defaults = blueprintClasses.SelectMany(value => value.ClassDefault.Properties)
            .Concat(userDefinedStructs.SelectMany(value => value.Defaults))
            .ToArray();
        var references = blueprintClasses.SelectMany(value => value.ClassDefault.References)
            .Concat(userDefinedStructs.SelectMany(value => value.References))
            .ToArray();

        return new RentalEvidence(
            ArtifactType: "rental-evidence",
            SchemaVersion,
            Build: new CensusBuildReference(
                ManifestSha256: manifestSha256,
                ManifestSchemaVersion: manifest.SchemaVersion,
                SteamAppId: manifest.Steam.AppId,
                SteamBuildId: manifest.Steam.BuildId),
            StaticCensus: new RentalEvidenceInput(
                FileName: censusIdentity.FileName,
                SizeBytes: censusIdentity.SizeBytes,
                Sha256: censusIdentity.Sha256,
                SchemaVersion: 1),
            Mappings: mappingIdentity,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                Name: "NeonRewind.StaticExtractor",
                Version: AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                Cue4ParseVersion: AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Totals: new RentalEvidenceTotals(
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

    private static RentalPackageEvidence ExtractPackage(DefaultFileProvider provider, RentalTarget target)
    {
        try
        {
            if (!provider.TryGetGameFile(target.Path, out var file))
            {
                throw new InvalidDataException($"Rental package is missing from the mounted provider: {target.Path}");
            }

            var exports = provider.LoadPackage(file).GetExports().ToArray();
            var blueprintClasses = exports
                .OfType<UBlueprintGeneratedClass>()
                .Select(RentalEvidenceExtractor.ExtractBlueprintClass)
                .OrderBy(value => value.Name, StringComparer.Ordinal)
                .ToArray();
            var userDefinedStructs = exports
                .OfType<UUserDefinedStruct>()
                .Select(RentalEvidenceExtractor.ExtractUserDefinedStruct)
                .OrderBy(value => value.Name, StringComparer.Ordinal)
                .ToArray();

            if (target.ExportClass == "BlueprintGeneratedClass" && blueprintClasses.Length != 1 ||
                target.ExportClass == "UserDefinedStruct" && userDefinedStructs.Length != 1)
            {
                throw new InvalidDataException($"Rental package does not contain its expected export: {target.Path}");
            }

            return new RentalPackageEvidence(target.Path, blueprintClasses, userDefinedStructs);
        }
        catch (InvalidDataException)
        {
            throw;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            throw new InvalidDataException(
                $"Could not parse rental package {target.Path} ({exception.GetType().Name}).",
                exception);
        }
    }

    private static void ValidateCensus(StaticCensus census, BuildManifest manifest, string manifestSha256)
    {
        if (census.ArtifactType != "static-census" || census.SchemaVersion != 1)
        {
            throw new InvalidDataException("Expected static-census schema version 1.");
        }

        if (census.Build is null ||
            census.Totals is null ||
            census.Packages is null ||
            census.Packages.Any(package => package is null || package.ExportClasses is null))
        {
            throw new InvalidDataException("Static census is incomplete.");
        }

        if (!string.Equals(census.Build.ManifestSha256, manifestSha256, StringComparison.Ordinal) ||
            !string.Equals(census.Build.SteamAppId, manifest.Steam.AppId, StringComparison.Ordinal) ||
            !string.Equals(census.Build.SteamBuildId, manifest.Steam.BuildId, StringComparison.Ordinal))
        {
            throw new InvalidDataException("Static census does not belong to the supplied build manifest.");
        }

        if (census.Totals.FailedPackageCount != 0 || census.Packages.Any(record => record.Status != "parsed"))
        {
            throw new InvalidDataException("Static census contains package failures.");
        }
    }

    private static void ValidateTargets(StaticCensus census)
    {
        var duplicatePackage = census.Packages
            .GroupBy(package => package.Path, StringComparer.Ordinal)
            .FirstOrDefault(group => group.Count() != 1);
        if (duplicatePackage is not null)
        {
            throw new InvalidDataException($"Static census repeats package path: {duplicatePackage.Key}");
        }

        var packages = census.Packages.ToDictionary(package => package.Path, StringComparer.Ordinal);
        foreach (var target in Targets)
        {
            if (!packages.TryGetValue(target.Path, out var package))
            {
                throw new InvalidDataException($"Static census does not contain the expected rental export: {target.Path}");
            }

            var matchingClasses = package.ExportClasses
                .Where(value => value.Name == target.ExportClass)
                .ToArray();
            if (matchingClasses.Length != 1 || matchingClasses[0].Count != 1)
            {
                throw new InvalidDataException($"Static census does not contain the expected rental export: {target.Path}");
            }
        }
    }

    private static bool TryParseArguments(string[] args, out RentalEvidenceOptions options, out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = RentalEvidenceOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = RentalEvidenceOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[] { "--build-manifest", "--static-census", "--mappings", "--package-directory", "--output" };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = RentalEvidenceOptions.Empty;
            error = unknown is null
                ? "Rental-evidence generation requires all five input and output options."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new RentalEvidenceOptions(
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
        writer.WriteLine("Usage: NeonRewind.StaticExtractor rental-evidence --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command writes mapped class defaults and object references for the rental-system package cluster.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record RentalTarget(string Path, string ExportClass);

    private sealed record RentalEvidenceOptions(
        string BuildManifestPath,
        string StaticCensusPath,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static RentalEvidenceOptions Empty { get; } = new("", "", "", "", "");
    }
}
