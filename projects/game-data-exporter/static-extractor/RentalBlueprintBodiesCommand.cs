using System.Text.Json;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Objects.UObject;
using CUE4Parse.UE4.Versions;

namespace NeonRetroRewind.StaticExtractor;

internal static class RentalBlueprintBodiesCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int InputFailureExitCode = 6;
    private const int OutputConflictExitCode = 7;
    private const int SchemaVersion = 1;

    private static readonly IReadOnlyDictionary<string, string> ExpectedClasses =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleReturn.uasset"] =
                "BTTask_ExampleReturn_C",
            ["ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleExampleFeeRecord.uasset"] =
                "BTTask_ExampleExampleFeeRecord_C",
            ["ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExamplePayment.uasset"] =
                "BTTask_ExamplePayment_C",
            ["ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.uasset"] =
                "ExampleQueueSystem_C",
        };

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
            var rentalEvidence = AcquisitionValidator.ReadJson<RentalEvidence>(options.RentalEvidencePath, "rental evidence");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var rentalEvidenceIdentity = FileIdentityFactory.Create(options.RentalEvidencePath);
            var mappingIdentity = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            ValidateRentalEvidence(rentalEvidence, manifest, manifestIdentity.Sha256, mappingIdentity);
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory);

            var bodies = CreateBodies(
                manifest,
                rentalEvidence,
                manifestIdentity.Sha256,
                rentalEvidenceIdentity,
                mappingIdentity,
                options.MappingsPath,
                options.PackageDirectory);

            AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory, packagePaths);
            AcquisitionValidator.VerifyUnchanged(options.BuildManifestPath, manifestIdentity, "Build manifest");
            AcquisitionValidator.VerifyUnchanged(options.RentalEvidencePath, rentalEvidenceIdentity, "Rental evidence");
            AcquisitionValidator.VerifyUnchanged(options.MappingsPath, mappingIdentity, "Mappings");

            var json = JsonSerializer.Serialize(bodies, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(options.OutputPath, json, "Rental Blueprint bodies");
            return writeStatus == ArtifactWriteStatus.Conflict ? OutputConflictExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Rental-blueprint-bodies operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Rental-blueprint-bodies input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (System.Text.Json.JsonException exception)
        {
            Console.Error.WriteLine($"Rental-blueprint-bodies input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Rental-blueprint-bodies access failed: {exception.Message}");
            return InputFailureExitCode;
        }
    }

    private static RentalBlueprintBodies CreateBodies(
        BuildManifest manifest,
        RentalEvidence rentalEvidence,
        string manifestSha256,
        FileIdentity rentalEvidenceIdentity,
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
            ReadScriptData = true,
        };

        provider.Initialize();
        provider.Mount();
        provider.PostMount();

        if (provider.MountedVfs.Count == 0 || provider.UnloadedVfs.Count > 0)
        {
            throw new InvalidDataException("Package containers did not mount completely.");
        }

        var expectedClasses = rentalEvidence.Packages
            .SelectMany(package => package.BlueprintClasses.Select(blueprintClass => new
            {
                PackagePath = package.Path,
                Class = blueprintClass,
            }))
            .OrderBy(value => value.PackagePath, StringComparer.Ordinal)
            .ToArray();
        var classes = expectedClasses
            .Select(value => ExtractClass(provider, value.PackagePath, value.Class))
            .ToArray();
        var functions = classes.SelectMany(value => value.Functions).ToArray();

        return new RentalBlueprintBodies(
            ArtifactType: "rental-blueprint-bodies",
            SchemaVersion,
            Build: new CensusBuildReference(
                ManifestSha256: manifestSha256,
                ManifestSchemaVersion: manifest.SchemaVersion,
                SteamAppId: manifest.Steam.AppId,
                SteamBuildId: manifest.Steam.BuildId),
            RentalEvidence: new RentalEvidenceInput(
                FileName: rentalEvidenceIdentity.FileName,
                SizeBytes: rentalEvidenceIdentity.SizeBytes,
                Sha256: rentalEvidenceIdentity.Sha256,
                SchemaVersion: rentalEvidence.SchemaVersion),
            Mappings: mappingIdentity,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                Name: "NeonRetroRewind.StaticExtractor",
                Version: AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                Cue4ParseVersion: AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Totals: new RentalBlueprintBodiesTotals(
                PackageCount: classes.Select(value => value.PackagePath).Distinct(StringComparer.Ordinal).Count(),
                ClassCount: classes.Length,
                FunctionCount: functions.Length,
                BytecodeExpressionCount: functions.Sum(value => value.BytecodeExpressionCount),
                PseudoCodeCharacterCount: classes.Sum(value => value.PseudoCode.Length)),
            Classes: classes);
    }

    private static RentalBlueprintClassBody ExtractClass(
        DefaultFileProvider provider,
        string packagePath,
        BlueprintClassEvidence expected)
    {
        try
        {
            if (!provider.TryGetGameFile(packagePath, out var file))
            {
                throw new InvalidDataException($"Rental Blueprint package is missing: {packagePath}");
            }

            var blueprintClass = provider.LoadPackage(file)
                .GetExports()
                .OfType<UBlueprintGeneratedClass>()
                .SingleOrDefault(value => value.Name == expected.Name) ??
                throw new InvalidDataException($"Rental Blueprint class is missing: {expected.Path}");
            if (blueprintClass.GetPathName() != expected.Path)
            {
                throw new InvalidDataException($"Rental Blueprint class path no longer matches: {expected.Path}");
            }

            var functions = blueprintClass.FuncMap
                .Select(pair => ExtractFunction(pair.Key.Text, pair.Value))
                .OrderBy(value => value.Name, StringComparer.Ordinal)
                .ToArray();
            var expectedNames = expected.Functions.OrderBy(value => value, StringComparer.Ordinal).ToArray();
            if (!functions.Select(value => value.Name).SequenceEqual(expectedNames, StringComparer.Ordinal))
            {
                throw new InvalidDataException($"Rental Blueprint functions no longer match: {expected.Path}");
            }

            var pseudoCode = NormalizePseudoCode(blueprintClass.DecompileBlueprintToPseudo());
            if (string.IsNullOrWhiteSpace(pseudoCode))
            {
                throw new InvalidDataException($"Rental Blueprint decompiler returned no text: {expected.Path}");
            }

            return new RentalBlueprintClassBody(
                PackagePath: packagePath,
                Name: blueprintClass.Name,
                Path: blueprintClass.GetPathName(),
                Functions: functions,
                PseudoCode: pseudoCode);
        }
        catch (InvalidDataException)
        {
            throw;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            throw new InvalidDataException(
                $"Could not decompile rental Blueprint package {packagePath} ({exception.GetType().Name}).",
                exception);
        }
    }

    private static RentalBlueprintFunction ExtractFunction(string expectedName, FPackageIndex functionIndex)
    {
        var function = functionIndex.Load<UFunction>();
        if (function is null || function.Name != expectedName)
        {
            throw new InvalidDataException($"Could not load rental Blueprint function: {expectedName}");
        }

        return new RentalBlueprintFunction(
            Name: function.Name,
            Path: function.GetPathName(),
            Flags: function.FunctionFlags.ToString(),
            BytecodeExpressionCount: function.ScriptBytecode?.Length ?? 0);
    }

    private static string NormalizePseudoCode(string value)
        => value.Replace("\r\n", "\n", StringComparison.Ordinal).Replace('\r', '\n').TrimEnd();

    private static void ValidateRentalEvidence(
        RentalEvidence evidence,
        BuildManifest manifest,
        string manifestSha256,
        MappingIdentity mappingIdentity)
    {
        if (evidence.ArtifactType != "rental-evidence" || evidence.SchemaVersion != 1)
        {
            throw new InvalidDataException("Expected rental-evidence schema version 1.");
        }

        if (evidence.Build is null ||
            evidence.Mappings is null ||
            evidence.Totals is null ||
            evidence.Packages is null ||
            evidence.Packages.Any(package =>
                package is null ||
                package.BlueprintClasses is null ||
                package.UserDefinedStructs is null ||
                package.BlueprintClasses.Any(blueprintClass =>
                    blueprintClass is null || blueprintClass.Functions is null)))
        {
            throw new InvalidDataException("Rental evidence is incomplete.");
        }

        if (!string.Equals(evidence.Build.ManifestSha256, manifestSha256, StringComparison.Ordinal) ||
            !string.Equals(evidence.Build.SteamAppId, manifest.Steam.AppId, StringComparison.Ordinal) ||
            !string.Equals(evidence.Build.SteamBuildId, manifest.Steam.BuildId, StringComparison.Ordinal) ||
            evidence.Mappings != mappingIdentity)
        {
            throw new InvalidDataException("Rental evidence does not belong to the supplied build and mappings.");
        }

        var classes = evidence.Packages.SelectMany(package => package.BlueprintClasses).ToArray();
        var actualClasses = evidence.Packages
            .SelectMany(package => package.BlueprintClasses.Select(blueprintClass => new
            {
                PackagePath = package.Path,
                ClassName = blueprintClass.Name,
            }))
            .ToArray();
        if (evidence.Totals.PackageCount != 6 ||
            evidence.Totals.BlueprintClassCount != 4 ||
            classes.Length != 4 ||
            classes.Sum(value => value.Functions.Count) != evidence.Totals.FunctionCount ||
            classes.Select(value => value.Path).Distinct(StringComparer.Ordinal).Count() != classes.Length ||
            actualClasses.Any(value =>
                !ExpectedClasses.TryGetValue(value.PackagePath, out var expectedName) ||
                value.ClassName != expectedName) ||
            actualClasses.Select(value => value.PackagePath).Distinct(StringComparer.Ordinal).Count() !=
                ExpectedClasses.Count)
        {
            throw new InvalidDataException("Rental evidence class totals are inconsistent.");
        }
    }

    private static bool TryParseArguments(
        string[] args,
        out RentalBlueprintBodiesOptions options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = RentalBlueprintBodiesOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = RentalBlueprintBodiesOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[] { "--build-manifest", "--rental-evidence", "--mappings", "--package-directory", "--output" };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = RentalBlueprintBodiesOptions.Empty;
            error = unknown is null
                ? "Rental-blueprint-bodies generation requires all five input and output options."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new RentalBlueprintBodiesOptions(
            values["--build-manifest"],
            values["--rental-evidence"],
            values["--mappings"],
            values["--package-directory"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor rental-blueprint-bodies --build-manifest <path> --rental-evidence <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command writes CUE4Parse pseudocode and function metadata for the four rental Blueprint classes.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record RentalBlueprintBodiesOptions(
        string BuildManifestPath,
        string RentalEvidencePath,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static RentalBlueprintBodiesOptions Empty { get; } = new("", "", "", "", "");
    }
}
