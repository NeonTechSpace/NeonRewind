using System.Text.Json;

namespace NeonRewind.StaticExtractor;

internal static class RentalFunctionTraceCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int InputFailureExitCode = 6;
    private const int OutputConflictExitCode = 7;
    private const int SchemaVersion = 1;

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
            var bodies = AcquisitionValidator.ReadJson<RentalBlueprintBodies>(
                options.RentalBlueprintBodiesPath,
                "rental Blueprint bodies");
            var bodiesIdentity = FileIdentityFactory.Create(options.RentalBlueprintBodiesPath);
            ValidateInput(
                bodies,
                manifest,
                manifestIdentity.Sha256,
                mappingIdentity);
            var requests = CreateRequests(bodies, options.FunctionPaths);
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory);

            var trace = CreateTrace(
                manifest,
                manifestIdentity.Sha256,
                mappingIdentity,
                bodiesIdentity,
                requests,
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
            AcquisitionValidator.VerifyUnchanged(
                options.RentalBlueprintBodiesPath,
                bodiesIdentity,
                "Rental Blueprint bodies");

            var json = JsonSerializer.Serialize(trace, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(
                options.OutputPath,
                json,
                "Rental function trace");
            return writeStatus == ArtifactWriteStatus.Conflict ? OutputConflictExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Rental-function-trace operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Rental-function-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine($"Rental-function-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Rental-function-trace access failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            Console.Error.WriteLine(
                $"Rental-function-trace extraction failed ({exception.GetType().Name}).");
            return InputFailureExitCode;
        }
    }

    private static RentalFunctionTrace CreateTrace(
        BuildManifest manifest,
        string manifestSha256,
        MappingIdentity mappingIdentity,
        FileIdentity bodiesIdentity,
        IReadOnlyList<BlueprintFunctionTraceRequest> requests,
        string mappingsPath,
        string packageDirectory)
    {
        var functions = BlueprintFunctionTracer.Trace(
            mappingsPath,
            packageDirectory,
            requests);
        var nodes = functions.SelectMany(function => function.Nodes).ToArray();

        return new RentalFunctionTrace(
            ArtifactType: "rental-function-trace",
            SchemaVersion,
            Build: new CensusBuildReference(
                ManifestSha256: manifestSha256,
                ManifestSchemaVersion: manifest.SchemaVersion,
                SteamAppId: manifest.Steam.AppId,
                SteamBuildId: manifest.Steam.BuildId),
            RentalBlueprintBodies: new RentalFunctionTraceInput(
                bodiesIdentity.FileName,
                bodiesIdentity.SizeBytes,
                bodiesIdentity.Sha256,
                SchemaVersion: 1),
            RequestedFunctionPaths: requests
                .Select(request => request.FunctionPath)
                .OrderBy(path => path, StringComparer.Ordinal)
                .ToArray(),
            Mappings: mappingIdentity,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                Name: "NeonRewind.StaticExtractor",
                Version: AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                Cue4ParseVersion: AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Totals: new BlueprintFunctionTraceTotals(
                PackageCount: functions.Select(function => function.PackagePath)
                    .Distinct(StringComparer.Ordinal).Count(),
                ClassCount: functions.Select(function => function.ClassPath)
                    .Distinct(StringComparer.Ordinal).Count(),
                FunctionCount: functions.Count,
                NodeCount: nodes.Length,
                CallCount: nodes.Count(node => node.Call is not null),
                BranchCount: nodes.Count(node => node.Jump is not null),
                EntrypointCount: nodes.Count(IsEventGraphEntrypoint)),
            Functions: functions);
    }

    private static bool IsEventGraphEntrypoint(BlueprintTraceNode node)
        => node.Call is { ArgumentCount: 1, IntegerArguments.Count: 1 } call &&
           call.FunctionName.StartsWith("ExecuteUbergraph_", StringComparison.Ordinal) &&
           call.IntegerArguments[0].Position == 0;

    private static IReadOnlyList<BlueprintFunctionTraceRequest> CreateRequests(
        RentalBlueprintBodies bodies,
        IReadOnlyList<string> requestedPaths)
    {
        var available = bodies.Classes
            .SelectMany(class_ => class_.Functions.Select(function => new
            {
                Class = class_,
                Function = function,
            }))
            .ToArray();
        var requests = new List<BlueprintFunctionTraceRequest>();
        foreach (var path in requestedPaths.OrderBy(value => value, StringComparer.Ordinal))
        {
            var matches = available.Where(value => value.Function.Path == path).ToArray();
            if (matches.Length != 1)
            {
                throw new InvalidDataException(
                    $"Expected one rental Blueprint function path {path}, found {matches.Length}.");
            }

            var match = matches[0];
            requests.Add(new BlueprintFunctionTraceRequest(
                match.Class.PackagePath,
                match.Class.Name,
                match.Class.Path,
                match.Function.Name,
                match.Function.Path,
                match.Function.Flags,
                match.Function.BytecodeExpressionCount));
        }

        return requests;
    }

    private static void ValidateInput(
        RentalBlueprintBodies input,
        BuildManifest manifest,
        string manifestSha256,
        MappingIdentity mappings)
    {
        if (input.ArtifactType != "rental-blueprint-bodies" || input.SchemaVersion != 1)
        {
            throw new InvalidDataException("Expected rental-blueprint-bodies schema version 1.");
        }

        if (input.Build is null || input.RentalEvidence is null || input.Mappings is null ||
            input.Engine is null || input.Extractor is null || input.Totals is null ||
            input.Classes is null || input.Classes.Count == 0)
        {
            throw new InvalidDataException("Rental Blueprint bodies are incomplete.");
        }

        if (input.Build.ManifestSha256 != manifestSha256 ||
            input.Build.ManifestSchemaVersion != manifest.SchemaVersion ||
            input.Build.SteamAppId != manifest.Steam.AppId ||
            input.Build.SteamBuildId != manifest.Steam.BuildId ||
            input.Engine != manifest.Engine ||
            input.Mappings != mappings)
        {
            throw new InvalidDataException(
                "Rental Blueprint bodies do not belong to the supplied build and mappings.");
        }

        if (string.IsNullOrWhiteSpace(input.RentalEvidence.FileName) ||
            input.RentalEvidence.SizeBytes <= 0 ||
            input.RentalEvidence.Sha256 is not { Length: 64 } ||
            input.RentalEvidence.SchemaVersion != 1 ||
            input.Extractor.Name != "NeonRewind.StaticExtractor" ||
            string.IsNullOrWhiteSpace(input.Extractor.Version) ||
            string.IsNullOrWhiteSpace(input.Extractor.Cue4ParseVersion) ||
            input.Classes.Any(class_ =>
                class_ is null ||
                string.IsNullOrWhiteSpace(class_.PackagePath) ||
                string.IsNullOrWhiteSpace(class_.Name) ||
                string.IsNullOrWhiteSpace(class_.Path) ||
                class_.Functions is null ||
                class_.PseudoCode is null ||
                class_.Functions.Any(function =>
                    function is null ||
                    string.IsNullOrWhiteSpace(function.Name) ||
                    string.IsNullOrWhiteSpace(function.Path) ||
                    string.IsNullOrWhiteSpace(function.Flags) ||
                    function.BytecodeExpressionCount <= 0)))
        {
            throw new InvalidDataException("Rental Blueprint-body classes or functions are incomplete.");
        }

        var functions = input.Classes.SelectMany(class_ => class_.Functions).ToArray();
        if (input.Totals.PackageCount != input.Classes.Select(class_ => class_.PackagePath)
                .Distinct(StringComparer.Ordinal).Count() ||
            input.Totals.ClassCount != input.Classes.Count ||
            input.Totals.FunctionCount != functions.Length ||
            input.Totals.BytecodeExpressionCount != functions.Sum(function => function.BytecodeExpressionCount) ||
            input.Totals.PseudoCodeCharacterCount != input.Classes.Sum(class_ => class_.PseudoCode.Length) ||
            functions.Select(function => function.Path).Distinct(StringComparer.Ordinal).Count() != functions.Length)
        {
            throw new InvalidDataException("Rental Blueprint-body totals or functions are inconsistent.");
        }
    }

    private static bool TryParseArguments(
        string[] args,
        out RentalFunctionTraceOptions options,
        out string error)
    {
        var functionPaths = new List<string>();
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = RentalFunctionTraceOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            var value = args[++index];
            if (option == "--function-path")
            {
                functionPaths.Add(value);
            }
            else if (!values.TryAdd(option, value))
            {
                options = RentalFunctionTraceOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[]
        {
            "--build-manifest",
            "--rental-blueprint-bodies",
            "--mappings",
            "--package-directory",
            "--output",
        };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)) ||
            functionPaths.Count == 0 ||
            functionPaths.Any(string.IsNullOrWhiteSpace) ||
            functionPaths.Distinct(StringComparer.Ordinal).Count() != functionPaths.Count)
        {
            options = RentalFunctionTraceOptions.Empty;
            error = unknown is null
                ? "Rental-function-trace generation requires all inputs and unique function paths."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new RentalFunctionTraceOptions(
            values["--build-manifest"],
            values["--rental-blueprint-bodies"],
            functionPaths,
            values["--mappings"],
            values["--package-directory"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRewind.StaticExtractor rental-function-trace --build-manifest <path> --rental-blueprint-bodies <path> --function-path <path> [--function-path <path> ...] --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command rereads exact rental functions and writes typed Kismet nodes without parsing pseudocode.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record RentalFunctionTraceOptions(
        string BuildManifestPath,
        string RentalBlueprintBodiesPath,
        IReadOnlyList<string> FunctionPaths,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static RentalFunctionTraceOptions Empty { get; } = new("", "", [], "", "", "");
    }
}
