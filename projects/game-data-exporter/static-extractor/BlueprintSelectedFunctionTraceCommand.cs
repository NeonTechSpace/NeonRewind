using System.Text.Json;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintSelectedFunctionTraceCommand
{
    public const string SelectionRule = "exact-inventory-function-path";

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
            var manifest = AcquisitionValidator.ReadJson<BuildManifest>(
                options.BuildManifestPath,
                "build manifest");
            AcquisitionValidator.ValidateManifest(manifest);
            var inventory = AcquisitionValidator.ReadJson<BlueprintFunctionInventory>(
                options.FunctionInventoryPath,
                "Blueprint function inventory");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var inventoryIdentity = FileIdentityFactory.Create(options.FunctionInventoryPath);
            var mappings = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            ValidateInventory(
                inventory,
                manifest,
                manifestIdentity.Sha256,
                mappings);
            var requests = CreateRequests(inventory, options.FunctionPaths);
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory);

            var artifact = CreateArtifact(
                manifest,
                manifestIdentity.Sha256,
                inventory,
                inventoryIdentity,
                mappings,
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
                options.FunctionInventoryPath,
                inventoryIdentity,
                "Blueprint function inventory");
            AcquisitionValidator.VerifyUnchanged(
                options.MappingsPath,
                mappings,
                "Mappings");

            var json = JsonSerializer.Serialize(artifact, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(
                options.OutputPath,
                json,
                "Blueprint selected-function trace");
            return writeStatus == ArtifactWriteStatus.Conflict ? OutputConflictExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Blueprint-selected-function-trace operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Blueprint-selected-function-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine($"Blueprint-selected-function-trace input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Blueprint-selected-function-trace access failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            Console.Error.WriteLine(
                $"Blueprint-selected-function-trace extraction failed ({exception.GetType().Name}).");
            return InputFailureExitCode;
        }
    }

    private static BlueprintSelectedFunctionTrace CreateArtifact(
        BuildManifest manifest,
        string manifestSha256,
        BlueprintFunctionInventory inventory,
        FileIdentity inventoryIdentity,
        MappingIdentity mappings,
        IReadOnlyList<BlueprintFunctionTraceRequest> requests,
        string mappingsPath,
        string packageDirectory)
    {
        var functions = BlueprintFunctionTracer.Trace(
            mappingsPath,
            packageDirectory,
            requests);
        var nodes = functions.SelectMany(function => function.Nodes).ToArray();

        return new BlueprintSelectedFunctionTrace(
            ArtifactType: "blueprint-selected-function-trace",
            Build: new CensusBuildReference(
                manifestSha256,
                manifest.Steam.AppId,
                manifest.Steam.BuildId),
            FunctionInventory: new BlueprintSelectedFunctionTraceInput(
                inventoryIdentity.FileName,
                inventoryIdentity.SizeBytes,
                inventoryIdentity.Sha256,
                inventory.ArtifactType,
                inventory.InventoryRule),
            SelectionRule: SelectionRule,
            RequestedFunctionPaths: requests
                .Select(request => request.FunctionPath)
                .OrderBy(path => path, StringComparer.Ordinal)
                .ToArray(),
            Mappings: mappings,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                "NeonRetroRewind.StaticExtractor",
                AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Totals: new BlueprintFunctionTraceTotals(
                functions.Select(function => function.PackagePath)
                    .Distinct(StringComparer.Ordinal).Count(),
                functions.Select(function => function.ClassPath)
                    .Distinct(StringComparer.Ordinal).Count(),
                functions.Count,
                nodes.Length,
                nodes.Count(node => node.Call is not null),
                nodes.Count(node => node.Jump is not null),
                nodes.Count(IsEventGraphEntrypoint)),
            Functions: functions);
    }

    private static bool IsEventGraphEntrypoint(BlueprintTraceNode node)
        => node.Call is { ArgumentCount: 1, IntegerArguments.Count: 1 } call &&
           call.FunctionName.StartsWith("ExecuteExampleGraph_", StringComparison.Ordinal) &&
           call.IntegerArguments[0].Position == 0;

    private static IReadOnlyList<BlueprintFunctionTraceRequest> CreateRequests(
        BlueprintFunctionInventory inventory,
        IReadOnlyList<string> requestedPaths)
    {
        var requests = new List<BlueprintFunctionTraceRequest>();
        foreach (var path in requestedPaths.OrderBy(value => value, StringComparer.Ordinal))
        {
            var matches = inventory.Functions.Where(function => function.ObjectPath == path).ToArray();
            if (matches.Length != 1)
            {
                throw new InvalidDataException(
                    $"Expected one inventoried Blueprint function path {path}, found {matches.Length}.");
            }

            var declaration = matches[0];
            if (declaration.BytecodeExpressionCount is null or <= 0 ||
                declaration.OwnerLinkage.FuncMapContainsDeclaration != true ||
                declaration.OwnerLinkage.ChildrenContainsDeclaration != true)
            {
                throw new InvalidDataException(
                    $"Inventoried function is not a traceable cooked Blueprint declaration: {path}");
            }

            requests.Add(new BlueprintFunctionTraceRequest(
                declaration.PackagePath,
                ReadOwnerName(declaration.OwnerPath),
                declaration.OwnerPath,
                declaration.ObjectName,
                declaration.ObjectPath,
                declaration.Flags,
                declaration.BytecodeExpressionCount.Value));
        }

        return requests;
    }

    private static string ReadOwnerName(string ownerPath)
    {
        var separator = ownerPath.LastIndexOf('.');
        if (separator < 0 || separator == ownerPath.Length - 1)
        {
            throw new InvalidDataException(
                $"Inventoried Blueprint owner path has no object name: {ownerPath}");
        }

        return ownerPath[(separator + 1)..];
    }

    private static void ValidateInventory(
        BlueprintFunctionInventory inventory,
        BuildManifest manifest,
        string manifestSha256,
        MappingIdentity mappings)
    {
        if (inventory.ArtifactType != "blueprint-function-inventory" ||
            inventory.Build is null || inventory.StaticCensus is null ||
            inventory.Mappings is null || inventory.Engine is null ||
            inventory.Extractor is null || inventory.Totals is null ||
            inventory.Functions is null || inventory.Failures is null)
        {
            throw new InvalidDataException("Blueprint function inventory is incomplete.");
        }

        if (inventory.Build.ManifestSha256 != manifestSha256 ||
            inventory.Build.SteamAppId != manifest.Steam.AppId ||
            inventory.Build.SteamBuildId != manifest.Steam.BuildId ||
            inventory.Engine != manifest.Engine || inventory.Mappings != mappings)
        {
            throw new InvalidDataException(
                "Blueprint function inventory does not belong to the supplied build and mappings.");
        }

        if (inventory.CandidateRule != BlueprintFunctionDeclarationScanner.CandidateRule ||
            inventory.InventoryRule != BlueprintFunctionDeclarationScanner.InventoryRule ||
            inventory.Coverage != "complete" || inventory.Failures.Count != 0 ||
            inventory.Totals.CandidatePackageCount < 0 ||
            inventory.Totals.ScannedPackageCount != inventory.Totals.CandidatePackageCount ||
            inventory.Totals.FailedPackageCount != 0 ||
            inventory.Totals.RawFunctionExportCount != inventory.Functions.Count ||
            inventory.Totals.InventoriedFunctionCount != inventory.Functions.Count ||
            inventory.Extractor.Name != "NeonRetroRewind.StaticExtractor" ||
            string.IsNullOrWhiteSpace(inventory.Extractor.Version) ||
            string.IsNullOrWhiteSpace(inventory.Extractor.Cue4ParseVersion) ||
            string.IsNullOrWhiteSpace(inventory.StaticCensus.FileName) ||
            inventory.StaticCensus.SizeBytes <= 0 ||
            inventory.StaticCensus.Sha256 is not { Length: 64 } ||
            inventory.Functions.Any(function =>
                string.IsNullOrWhiteSpace(function.PackagePath) ||
                function.PackageExportIndex <= 0 ||
                string.IsNullOrWhiteSpace(function.ObjectName) ||
                string.IsNullOrWhiteSpace(function.ObjectPath) ||
                string.IsNullOrWhiteSpace(function.OwnerPath) ||
                string.IsNullOrWhiteSpace(function.OwnerExportType) ||
                string.IsNullOrWhiteSpace(function.Flags) ||
                function.Signature is null || function.Signature.Parameters is null ||
                function.Signature.ParameterCount != function.Signature.Parameters.Count ||
                function.OwnerLinkage is null || function.OwnerLinkage.InterfacePaths is null) ||
            inventory.Functions.Select(function => function.ObjectPath)
                .Distinct(StringComparer.Ordinal).Count() != inventory.Functions.Count)
        {
            throw new InvalidDataException(
                "Blueprint function inventory scope, coverage, totals, or declarations are inconsistent.");
        }
    }

    private static bool TryParseArguments(
        string[] args,
        out BlueprintSelectedFunctionTraceOptions options,
        out string error)
    {
        var functionPaths = new List<string>();
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = BlueprintSelectedFunctionTraceOptions.Empty;
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
                options = BlueprintSelectedFunctionTraceOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[]
        {
            "--build-manifest",
            "--function-inventory",
            "--mappings",
            "--package-directory",
            "--output",
        };
        var unknown = values.Keys.FirstOrDefault(
            key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)) ||
            functionPaths.Count == 0 ||
            functionPaths.Distinct(StringComparer.Ordinal).Count() != functionPaths.Count ||
            functionPaths.Any(path =>
                string.IsNullOrWhiteSpace(path) || path.Length > 1024 || path.Any(char.IsControl)))
        {
            options = BlueprintSelectedFunctionTraceOptions.Empty;
            error = unknown is null
                ? "Blueprint-selected-function-trace generation requires all inputs and unique function paths."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new BlueprintSelectedFunctionTraceOptions(
            values["--build-manifest"],
            values["--function-inventory"],
            functionPaths,
            values["--mappings"],
            values["--package-directory"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor blueprint-selected-function-trace --build-manifest <path> --function-inventory <path> --function-path <path> [--function-path <path> ...] --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command rereads exact functions selected from a complete Blueprint function inventory into typed Kismet nodes.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record BlueprintSelectedFunctionTraceOptions(
        string BuildManifestPath,
        string FunctionInventoryPath,
        IReadOnlyList<string> FunctionPaths,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static BlueprintSelectedFunctionTraceOptions Empty { get; } =
            new("", "", [], "", "", "");
    }
}
