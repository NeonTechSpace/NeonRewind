using System.Text.Json;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Objects.UObject;
using CUE4Parse.UE4.Versions;

namespace NeonRewind.StaticExtractor;

internal static class BlueprintFunctionTraceCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int InputFailureExitCode = 6;
    private const int OutputConflictExitCode = 7;
    private const int SchemaVersion = 2;

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
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var mappingIdentity = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            var inputs = ReadInputs(options.CallerBodiesPaths);
            ValidateInputs(inputs, manifest, manifestIdentity.Sha256, mappingIdentity);
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory);

            var trace = CreateTrace(
                manifest,
                manifestIdentity.Sha256,
                mappingIdentity,
                inputs,
                options.MappingsPath,
                options.PackageDirectory);

            AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory,
                packagePaths);
            AcquisitionValidator.VerifyUnchanged(
                options.BuildManifestPath,
                manifestIdentity,
                "Build manifest");
            AcquisitionValidator.VerifyUnchanged(
                options.MappingsPath,
                mappingIdentity,
                "Mappings");
            foreach (var input in inputs)
            {
                AcquisitionValidator.VerifyUnchanged(
                    input.Path,
                    input.Identity,
                    $"Blueprint caller bodies {input.Identity.FileName}");
            }

            var json = JsonSerializer.Serialize(trace, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(
                options.OutputPath,
                json,
                "Blueprint function trace");
            return writeStatus == ArtifactWriteStatus.Conflict ? OutputConflictExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Blueprint-function-trace operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Blueprint-function-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine($"Blueprint-function-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Blueprint-function-trace access failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            Console.Error.WriteLine(
                $"Blueprint-function-trace extraction failed ({exception.GetType().Name}).");
            return InputFailureExitCode;
        }
    }

    private static BlueprintFunctionTrace CreateTrace(
        BuildManifest manifest,
        string manifestSha256,
        MappingIdentity mappingIdentity,
        IReadOnlyList<TraceInput> inputs,
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

        var requests = inputs
            .SelectMany(input => input.Artifact.Functions.Select(function =>
                new TraceRequest(function, input.Artifact.Target.FunctionName)))
            .OrderBy(request => request.Function.PackagePath, StringComparer.Ordinal)
            .ThenBy(request => request.Function.ClassPath, StringComparer.Ordinal)
            .ThenBy(request => request.Function.FunctionPath, StringComparer.Ordinal)
            .ToArray();
        if (requests.Select(request => request.Function.FunctionPath)
            .Distinct(StringComparer.Ordinal).Count() != requests.Length)
        {
            throw new InvalidDataException("Blueprint caller-body inputs contain duplicate functions.");
        }

        var functions = new List<BlueprintTracedFunction>();
        foreach (var classGroup in requests.GroupBy(request => new TraceClassKey(
            request.Function.PackagePath,
            request.Function.ClassName,
            request.Function.ClassPath)))
        {
            var blueprintClass = LoadClass(provider, classGroup.Key);
            foreach (var request in classGroup)
            {
                var function = LoadFunction(blueprintClass, request.Function);
                var trace = BlueprintFunctionTraceBuilder.Build(
                    request.Function.PackagePath,
                    blueprintClass,
                    function);
                VerifyFunction(trace, request);
                functions.Add(trace);
            }
        }

        var orderedFunctions = functions
            .OrderBy(function => function.PackagePath, StringComparer.Ordinal)
            .ThenBy(function => function.ClassPath, StringComparer.Ordinal)
            .ThenBy(function => function.FunctionPath, StringComparer.Ordinal)
            .ToArray();
        var nodes = orderedFunctions.SelectMany(function => function.Nodes).ToArray();

        return new BlueprintFunctionTrace(
            ArtifactType: "blueprint-function-trace",
            SchemaVersion,
            Build: new CensusBuildReference(
                ManifestSha256: manifestSha256,
                ManifestSchemaVersion: manifest.SchemaVersion,
                SteamAppId: manifest.Steam.AppId,
                SteamBuildId: manifest.Steam.BuildId),
            CallerBodies: inputs
                .OrderBy(input => input.Identity.FileName, StringComparer.Ordinal)
                .Select(input => new BlueprintFunctionTraceInput(
                    input.Identity.FileName,
                    input.Identity.SizeBytes,
                    input.Identity.Sha256,
                    input.Artifact.SchemaVersion,
                    input.Artifact.Target.FunctionName))
                .ToArray(),
            Mappings: mappingIdentity,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                Name: "NeonRewind.StaticExtractor",
                Version: AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                Cue4ParseVersion: AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Totals: new BlueprintFunctionTraceTotals(
                PackageCount: orderedFunctions.Select(function => function.PackagePath)
                    .Distinct(StringComparer.Ordinal).Count(),
                ClassCount: orderedFunctions.Select(function => function.ClassPath)
                    .Distinct(StringComparer.Ordinal).Count(),
                FunctionCount: orderedFunctions.Length,
                NodeCount: nodes.Length,
                CallCount: nodes.Count(node => node.Call is not null),
                BranchCount: nodes.Count(node => node.Jump is not null),
                EntrypointCount: nodes.Count(IsEventGraphEntrypoint)),
            Functions: orderedFunctions);
    }

    private static bool IsEventGraphEntrypoint(BlueprintTraceNode node)
        => node.Call is { ArgumentCount: 1, IntegerArguments.Count: 1 } call &&
           call.FunctionName.StartsWith("ExecuteUbergraph_", StringComparison.Ordinal) &&
           call.IntegerArguments[0].Position == 0;

    private static UBlueprintGeneratedClass LoadClass(
        DefaultFileProvider provider,
        TraceClassKey expected)
    {
        if (!provider.TryGetGameFile(expected.PackagePath, out var file))
        {
            throw new InvalidDataException($"Blueprint trace package is missing: {expected.PackagePath}");
        }

        try
        {
            var blueprintClass = provider.LoadPackage(file)
                .GetExports()
                .OfType<UBlueprintGeneratedClass>()
                .SingleOrDefault(value => value.Name == expected.ClassName) ??
                throw new InvalidDataException($"Blueprint trace class is missing: {expected.ClassPath}");
            if (blueprintClass.GetPathName() != expected.ClassPath)
            {
                throw new InvalidDataException($"Blueprint trace class path changed: {expected.ClassPath}");
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
                $"Could not load Blueprint trace package {expected.PackagePath} ({exception.GetType().Name}).",
                exception);
        }
    }

    private static UFunction LoadFunction(
        UBlueprintGeneratedClass blueprintClass,
        BlueprintCallerFunctionBody expected)
    {
        var matches = blueprintClass.FuncMap
            .Where(pair => pair.Key.Text == expected.FunctionName)
            .Select(pair => pair.Value.Load<UFunction>())
            .Where(function => function is not null)
            .Cast<UFunction>()
            .ToArray();
        if (matches.Length != 1 || matches[0].GetPathName() != expected.FunctionPath)
        {
            throw new InvalidDataException($"Blueprint trace function changed: {expected.FunctionPath}");
        }

        return matches[0];
    }

    private static void VerifyFunction(BlueprintTracedFunction actual, TraceRequest request)
    {
        var expected = request.Function;
        if (actual.PackagePath != expected.PackagePath ||
            actual.ClassName != expected.ClassName ||
            actual.ClassPath != expected.ClassPath ||
            actual.FunctionName != expected.FunctionName ||
            actual.FunctionPath != expected.FunctionPath ||
            actual.Flags != expected.Flags ||
            actual.BytecodeExpressionCount != expected.BytecodeExpressionCount)
        {
            throw new InvalidDataException($"Blueprint trace function metadata changed: {expected.FunctionPath}");
        }

        var calls = actual.Nodes
            .Where(node => node.Call?.FunctionName == request.TargetFunctionName)
            .Select(node => new BlueprintCallerFunctionCall(
                node.Call!.CallKind,
                node.StatementIndex))
            .OrderBy(call => call.StatementIndex)
            .ThenBy(call => call.CallKind, StringComparer.Ordinal)
            .ToArray();
        var expectedCalls = expected.Calls
            .OrderBy(call => call.StatementIndex)
            .ThenBy(call => call.CallKind, StringComparer.Ordinal)
            .ToArray();
        if (!calls.SequenceEqual(expectedCalls))
        {
            throw new InvalidDataException($"Blueprint trace target calls changed: {expected.FunctionPath}");
        }
    }

    private static IReadOnlyList<TraceInput> ReadInputs(IReadOnlyList<string> paths)
        => paths.Select(path => new TraceInput(
                Path.GetFullPath(path),
                FileIdentityFactory.Create(path),
                AcquisitionValidator.ReadJson<BlueprintCallerBodies>(path, "Blueprint caller bodies")))
            .ToArray();

    private static void ValidateInputs(
        IReadOnlyList<TraceInput> inputs,
        BuildManifest manifest,
        string manifestSha256,
        MappingIdentity mappings)
    {
        if (inputs.Count == 0 ||
            inputs.Select(input => input.Path).Distinct(StringComparer.OrdinalIgnoreCase).Count() != inputs.Count ||
            inputs.Select(input => input.Identity.FileName).Distinct(StringComparer.OrdinalIgnoreCase).Count() != inputs.Count)
        {
            throw new InvalidDataException("Blueprint caller-body inputs must be nonempty and unique.");
        }

        foreach (var input in inputs)
        {
            ValidateInput(input.Artifact, manifest, manifestSha256, mappings);
        }
    }

    private static void ValidateInput(
        BlueprintCallerBodies input,
        BuildManifest manifest,
        string manifestSha256,
        MappingIdentity mappings)
    {
        if (input.ArtifactType != "blueprint-caller-bodies" || input.SchemaVersion != 1)
        {
            throw new InvalidDataException("Expected blueprint-caller-bodies schema version 1.");
        }

        if (input.Build is null || input.CallSites is null || input.Mappings is null ||
            input.Engine is null || input.Extractor is null || input.Target is null ||
            input.Totals is null || input.Functions is null || input.Functions.Count == 0)
        {
            throw new InvalidDataException("Blueprint caller bodies are incomplete.");
        }

        if (input.Build.ManifestSha256 != manifestSha256 ||
            input.Build.ManifestSchemaVersion != manifest.SchemaVersion ||
            input.Build.SteamAppId != manifest.Steam.AppId ||
            input.Build.SteamBuildId != manifest.Steam.BuildId ||
            input.Engine != manifest.Engine)
        {
            throw new InvalidDataException("Blueprint caller bodies do not belong to the supplied build.");
        }

        if (input.Mappings != mappings)
        {
            throw new InvalidDataException("Blueprint caller bodies do not use the supplied mappings.");
        }

        if (string.IsNullOrWhiteSpace(input.CallSites.FileName) ||
            input.CallSites.SizeBytes <= 0 ||
            input.CallSites.Sha256 is not { Length: 64 } ||
            input.CallSites.SchemaVersion != 1 ||
            string.IsNullOrWhiteSpace(input.Target.FunctionName) ||
            input.Target.FunctionName.Length > 256 ||
            input.Target.FunctionName.Any(char.IsControl) ||
            input.Functions.Any(function =>
                function is null ||
                string.IsNullOrWhiteSpace(function.PackagePath) ||
                string.IsNullOrWhiteSpace(function.ClassName) ||
                string.IsNullOrWhiteSpace(function.ClassPath) ||
                string.IsNullOrWhiteSpace(function.FunctionName) ||
                string.IsNullOrWhiteSpace(function.FunctionPath) ||
                string.IsNullOrWhiteSpace(function.Flags) ||
                function.Calls is null ||
                function.PseudoCode is null) ||
            input.Totals.PackageCount != input.Functions.Select(function => function.PackagePath).Distinct(StringComparer.Ordinal).Count() ||
            input.Totals.ClassCount != input.Functions.Select(function => function.ClassPath).Distinct(StringComparer.Ordinal).Count() ||
            input.Totals.FunctionCount != input.Functions.Count ||
            input.Totals.CallSiteCount != input.Functions.Sum(function => function.Calls.Count) ||
            input.Totals.PseudoCodeCharacterCount != input.Functions.Sum(function => function.PseudoCode.Length) ||
            input.Functions.Any(function => function.BytecodeExpressionCount <= 0 || function.Calls.Count == 0))
        {
            throw new InvalidDataException("Blueprint caller-body totals or functions are inconsistent.");
        }
    }

    private static bool TryParseArguments(
        string[] args,
        out BlueprintFunctionTraceOptions options,
        out string error)
    {
        var callerBodies = new List<string>();
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = BlueprintFunctionTraceOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            var value = args[++index];
            if (option == "--caller-bodies")
            {
                callerBodies.Add(value);
            }
            else if (!values.TryAdd(option, value))
            {
                options = BlueprintFunctionTraceOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[] { "--build-manifest", "--mappings", "--package-directory", "--output" };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)) || callerBodies.Count == 0)
        {
            options = BlueprintFunctionTraceOptions.Empty;
            error = unknown is null
                ? "Blueprint-function-trace generation requires all inputs and at least one caller-body artifact."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new BlueprintFunctionTraceOptions(
            values["--build-manifest"],
            callerBodies,
            values["--mappings"],
            values["--package-directory"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRewind.StaticExtractor blueprint-function-trace --build-manifest <path> --caller-bodies <path> [--caller-bodies <path> ...] --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command rereads exact caller functions and writes typed Kismet nodes without parsing pseudocode.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record BlueprintFunctionTraceOptions(
        string BuildManifestPath,
        IReadOnlyList<string> CallerBodiesPaths,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static BlueprintFunctionTraceOptions Empty { get; } = new("", [], "", "", "");
    }

    private sealed record TraceInput(
        string Path,
        FileIdentity Identity,
        BlueprintCallerBodies Artifact);

    private sealed record TraceRequest(
        BlueprintCallerFunctionBody Function,
        string TargetFunctionName);

    private sealed record TraceClassKey(string PackagePath, string ClassName, string ClassPath);
}
