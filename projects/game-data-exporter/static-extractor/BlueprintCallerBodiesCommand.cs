using System.Text.Json;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Objects.UObject;
using CUE4Parse.UE4.Versions;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintCallerBodiesCommand
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
            var callSites = AcquisitionValidator.ReadJson<BlueprintCallSites>(options.CallSitesPath, "Blueprint call sites");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var callSitesIdentity = FileIdentityFactory.Create(options.CallSitesPath);
            var mappingIdentity = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            ValidateCallSites(callSites, manifest, manifestIdentity.Sha256, mappingIdentity);
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory);

            var bodies = CreateBodies(
                manifest,
                callSites,
                manifestIdentity.Sha256,
                callSitesIdentity,
                mappingIdentity,
                options.MappingsPath,
                options.PackageDirectory);

            AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory, packagePaths);
            AcquisitionValidator.VerifyUnchanged(options.BuildManifestPath, manifestIdentity, "Build manifest");
            AcquisitionValidator.VerifyUnchanged(options.CallSitesPath, callSitesIdentity, "Blueprint call sites");
            AcquisitionValidator.VerifyUnchanged(options.MappingsPath, mappingIdentity, "Mappings");

            var json = JsonSerializer.Serialize(bodies, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(options.OutputPath, json, "Blueprint caller bodies");
            return writeStatus == ArtifactWriteStatus.Conflict ? OutputConflictExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Blueprint-caller-bodies operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Blueprint-caller-bodies input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine($"Blueprint-caller-bodies input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Blueprint-caller-bodies access failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            Console.Error.WriteLine(
                $"Blueprint-caller-bodies extraction failed ({exception.GetType().Name}).");
            return InputFailureExitCode;
        }
    }

    private static BlueprintCallerBodies CreateBodies(
        BuildManifest manifest,
        BlueprintCallSites callSites,
        string manifestSha256,
        FileIdentity callSitesIdentity,
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

        var functions = new List<BlueprintCallerFunctionBody>();
        var classGroups = callSites.CallSites
            .GroupBy(callSite => new CallerClassKey(
                callSite.PackagePath,
                callSite.ClassName,
                callSite.ClassPath))
            .OrderBy(group => group.Key.PackagePath, StringComparer.Ordinal)
            .ThenBy(group => group.Key.ClassPath, StringComparer.Ordinal)
            .ToArray();

        foreach (var classGroup in classGroups)
        {
            var blueprintClass = LoadClass(provider, classGroup.Key);
            VerifyCallSites(blueprintClass, classGroup, callSites.Target.FunctionName);
            var classPseudoCode = blueprintClass.DecompileBlueprintToPseudo();
            if (string.IsNullOrWhiteSpace(classPseudoCode))
            {
                throw new InvalidDataException($"Blueprint decompiler returned no text: {classGroup.Key.ClassPath}");
            }

            var declaredFunctionNames = blueprintClass.FuncMap.Keys
                .Select(name => name.Text)
                .Distinct(StringComparer.Ordinal)
                .ToArray();

            foreach (var functionGroup in classGroup
                .GroupBy(callSite => new CallerFunctionKey(callSite.FunctionName, callSite.FunctionPath))
                .OrderBy(group => group.Key.FunctionPath, StringComparer.Ordinal))
            {
                var function = LoadFunction(blueprintClass, functionGroup.Key);
                var pseudoCode = BlueprintPseudoCode.ExtractFunction(
                    classPseudoCode,
                    function.Name,
                    declaredFunctionNames);
                functions.Add(new BlueprintCallerFunctionBody(
                    PackagePath: classGroup.Key.PackagePath,
                    ClassName: blueprintClass.Name,
                    ClassPath: blueprintClass.GetPathName(),
                    FunctionName: function.Name,
                    FunctionPath: function.GetPathName(),
                    Flags: function.FunctionFlags.ToString(),
                    BytecodeExpressionCount: function.ScriptBytecode?.Length ?? 0,
                    Calls: functionGroup
                        .OrderBy(callSite => callSite.StatementIndex)
                        .ThenBy(callSite => callSite.CallKind, StringComparer.Ordinal)
                        .Select(callSite => new BlueprintCallerFunctionCall(
                            callSite.CallKind,
                            callSite.StatementIndex))
                        .ToArray(),
                    PseudoCode: pseudoCode));
            }
        }

        var orderedFunctions = functions
            .OrderBy(function => function.PackagePath, StringComparer.Ordinal)
            .ThenBy(function => function.ClassPath, StringComparer.Ordinal)
            .ThenBy(function => function.FunctionPath, StringComparer.Ordinal)
            .ToArray();

        return new BlueprintCallerBodies(
            ArtifactType: "blueprint-caller-bodies",
            Build: new CensusBuildReference(
                ManifestSha256: manifestSha256,
                SteamAppId: manifest.Steam.AppId,
                SteamBuildId: manifest.Steam.BuildId),
            CallSites: new BlueprintCallSitesInput(
                FileName: callSitesIdentity.FileName,
                SizeBytes: callSitesIdentity.SizeBytes,
                Sha256: callSitesIdentity.Sha256),
            Mappings: mappingIdentity,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                Name: "NeonRetroRewind.StaticExtractor",
                Version: AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                Cue4ParseVersion: AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Target: callSites.Target,
            Totals: new BlueprintCallerBodiesTotals(
                PackageCount: orderedFunctions.Select(function => function.PackagePath).Distinct(StringComparer.Ordinal).Count(),
                ClassCount: orderedFunctions.Select(function => function.ClassPath).Distinct(StringComparer.Ordinal).Count(),
                FunctionCount: orderedFunctions.Length,
                CallSiteCount: orderedFunctions.Sum(function => function.Calls.Count),
                PseudoCodeCharacterCount: orderedFunctions.Sum(function => function.PseudoCode.Length)),
            Functions: orderedFunctions);
    }

    private static UBlueprintGeneratedClass LoadClass(
        DefaultFileProvider provider,
        CallerClassKey expected)
    {
        try
        {
            if (!provider.TryGetGameFile(expected.PackagePath, out var file))
            {
                throw new InvalidDataException($"Blueprint caller package is missing: {expected.PackagePath}");
            }

            var blueprintClass = provider.LoadPackage(file)
                .GetExports()
                .OfType<UBlueprintGeneratedClass>()
                .SingleOrDefault(value => value.Name == expected.ClassName) ??
                throw new InvalidDataException($"Blueprint caller class is missing: {expected.ClassPath}");
            if (blueprintClass.GetPathName() != expected.ClassPath)
            {
                throw new InvalidDataException($"Blueprint caller class path no longer matches: {expected.ClassPath}");
            }

            return blueprintClass;
        }
        catch (InvalidDataException)
        {
            throw;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            throw new InvalidDataException(
                $"Could not load Blueprint caller package {expected.PackagePath} ({exception.GetType().Name}).",
                exception);
        }
    }

    private static UFunction LoadFunction(
        UBlueprintGeneratedClass blueprintClass,
        CallerFunctionKey expected)
    {
        var matches = blueprintClass.FuncMap
            .Where(pair => pair.Key.Text == expected.FunctionName)
            .Select(pair => pair.Value.Load<UFunction>())
            .Where(function => function is not null)
            .Cast<UFunction>()
            .ToArray();
        if (matches.Length != 1 || matches[0].GetPathName() != expected.FunctionPath)
        {
            throw new InvalidDataException($"Blueprint caller function no longer matches: {expected.FunctionPath}");
        }

        if (matches[0].ScriptBytecode is null || matches[0].ScriptBytecode.Length == 0)
        {
            throw new InvalidDataException($"Blueprint caller function has no bytecode: {expected.FunctionPath}");
        }

        return matches[0];
    }

    private static void VerifyCallSites(
        UBlueprintGeneratedClass blueprintClass,
        IGrouping<CallerClassKey, BlueprintCallSite> expectedGroup,
        string targetFunctionName)
    {
        var actual = OrderCallSites(BlueprintCallScanner.ScanClass(
            expectedGroup.Key.PackagePath,
            blueprintClass,
            targetFunctionName,
            out _));
        var expected = OrderCallSites(expectedGroup);
        if (!actual.SequenceEqual(expected))
        {
            throw new InvalidDataException($"Blueprint caller call sites no longer match: {expectedGroup.Key.ClassPath}");
        }
    }

    private static BlueprintCallSite[] OrderCallSites(IEnumerable<BlueprintCallSite> callSites)
        => callSites
            .OrderBy(callSite => callSite.FunctionPath, StringComparer.Ordinal)
            .ThenBy(callSite => callSite.StatementIndex)
            .ThenBy(callSite => callSite.CallKind, StringComparer.Ordinal)
            .ToArray();

    private static void ValidateCallSites(
        BlueprintCallSites callSites,
        BuildManifest manifest,
        string manifestSha256,
        MappingIdentity mappingIdentity)
    {
        if (callSites.ArtifactType != "blueprint-call-sites")
        {
            throw new InvalidDataException("Expected a blueprint-call-sites artifact.");
        }

        if (callSites.Build is null ||
            callSites.StaticCensus is null ||
            callSites.Mappings is null ||
            callSites.Engine is null ||
            callSites.Extractor is null ||
            callSites.Target is null ||
            callSites.Totals is null ||
            callSites.CallSites is null ||
            callSites.Failures is null)
        {
            throw new InvalidDataException("Blueprint call sites are incomplete.");
        }

        if (!string.Equals(callSites.Build.ManifestSha256, manifestSha256, StringComparison.Ordinal) ||
            !string.Equals(callSites.Build.SteamAppId, manifest.Steam.AppId, StringComparison.Ordinal) ||
            !string.Equals(callSites.Build.SteamBuildId, manifest.Steam.BuildId, StringComparison.Ordinal) ||
            callSites.Mappings != mappingIdentity ||
            callSites.Engine != manifest.Engine)
        {
            throw new InvalidDataException("Blueprint call sites do not belong to the supplied build and mappings.");
        }

        if (callSites.CandidateRule != "parsed-packages-with-function-exports" ||
            callSites.Coverage != "complete" ||
            callSites.Failures.Count != 0 ||
            callSites.Totals.FailedPackageCount != 0 ||
            callSites.Totals.CandidatePackageCount < 1 ||
            callSites.Totals.ScannedPackageCount < 1 ||
            callSites.Totals.ClassCount < 1 ||
            callSites.Totals.FunctionCount < 1 ||
            callSites.Totals.CandidatePackageCount != callSites.Totals.ScannedPackageCount ||
            callSites.Totals.CallSiteCount != callSites.CallSites.Count ||
            callSites.CallSites.Count == 0 ||
            callSites.CallSites.Distinct().Count() != callSites.CallSites.Count ||
            string.IsNullOrWhiteSpace(callSites.Target.FunctionName) ||
            callSites.Target.FunctionName.Length > 256 ||
            callSites.Target.FunctionName.Any(char.IsControl) ||
            callSites.CallSites.Any(callSite =>
                string.IsNullOrWhiteSpace(callSite.PackagePath) ||
                string.IsNullOrWhiteSpace(callSite.ClassName) ||
                string.IsNullOrWhiteSpace(callSite.ClassPath) ||
                string.IsNullOrWhiteSpace(callSite.FunctionName) ||
                string.IsNullOrWhiteSpace(callSite.FunctionPath) ||
                callSite.StatementIndex < 0))
        {
            throw new InvalidDataException("Blueprint call-site coverage or totals are inconsistent.");
        }
    }

    private static bool TryParseArguments(
        string[] args,
        out BlueprintCallerBodiesOptions options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = BlueprintCallerBodiesOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = BlueprintCallerBodiesOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[] { "--build-manifest", "--call-sites", "--mappings", "--package-directory", "--output" };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = BlueprintCallerBodiesOptions.Empty;
            error = unknown is null
                ? "Blueprint-caller-bodies generation requires all five input and output options."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new BlueprintCallerBodiesOptions(
            values["--build-manifest"],
            values["--call-sites"],
            values["--mappings"],
            values["--package-directory"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor blueprint-caller-bodies --build-manifest <path> --call-sites <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command verifies a complete call-site artifact and decompiles its exact caller functions.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record BlueprintCallerBodiesOptions(
        string BuildManifestPath,
        string CallSitesPath,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static BlueprintCallerBodiesOptions Empty { get; } = new("", "", "", "", "");
    }

    private sealed record CallerClassKey(string PackagePath, string ClassName, string ClassPath);

    private sealed record CallerFunctionKey(string FunctionName, string FunctionPath);
}
