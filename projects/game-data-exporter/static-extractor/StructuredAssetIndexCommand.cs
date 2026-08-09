using System.Text.Json;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Assets.Exports;
using CUE4Parse.UE4.Assets.Exports.Engine;
using CUE4Parse.UE4.Assets.Exports.Internationalization;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Versions;

namespace NeonRetroRewind.StaticExtractor;

internal static class StructuredAssetIndexCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int InputFailureExitCode = 6;
    private const int OutputConflictExitCode = 7;
    private const int ParseFailuresExitCode = 8;

    private static readonly HashSet<string> CandidateClasses = new(StringComparer.Ordinal)
    {
        "CompositeDataTable",
        "CurveTable",
        "DataAsset",
        "DataTable",
        "PrimaryDataAsset",
        "StringTable",
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
            var census = AcquisitionValidator.ReadJson<StaticCensus>(options.StaticCensusPath, "static census");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var censusIdentity = FileIdentityFactory.Create(options.StaticCensusPath);
            var mappingIdentity = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            ValidateCensus(census, manifest, manifestIdentity.Sha256);
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory);

            var index = CreateIndex(
                manifest,
                census,
                manifestIdentity.Sha256,
                censusIdentity,
                mappingIdentity,
                options.MappingsPath,
                options.PackageDirectory);

            AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory, packagePaths);
            AcquisitionValidator.VerifyUnchanged(options.BuildManifestPath, manifestIdentity, "Build manifest");
            AcquisitionValidator.VerifyUnchanged(options.StaticCensusPath, censusIdentity, "Static census");
            AcquisitionValidator.VerifyUnchanged(options.MappingsPath, mappingIdentity, "Mappings");

            var json = JsonSerializer.Serialize(index, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(options.OutputPath, json, "Structured asset index");
            if (writeStatus == ArtifactWriteStatus.Conflict)
            {
                return OutputConflictExitCode;
            }

            return index.Totals.FailedPackageCount > 0 ? ParseFailuresExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Structured-index operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Structured-index input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine($"Structured-index input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Structured-index access failed: {exception.Message}");
            return InputFailureExitCode;
        }
    }

    private static StructuredAssetIndex CreateIndex(
        BuildManifest manifest,
        StaticCensus census,
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

        var candidates = census.Packages
            .Select(record => new
            {
                Record = record,
                Classes = record.ExportClasses
                    .Where(count => CandidateClasses.Contains(count.Name))
                    .Select(count => count.Name)
                    .Distinct(StringComparer.Ordinal)
                    .OrderBy(name => name, StringComparer.Ordinal)
                    .ToArray(),
            })
            .Where(candidate => candidate.Classes.Length > 0)
            .OrderBy(candidate => candidate.Record.Path, StringComparer.Ordinal)
            .ToArray();

        var packageRecords = new List<StructuredPackageRecord>(candidates.Length);
        foreach (var candidate in candidates)
        {
            packageRecords.Add(CreatePackageRecord(provider, candidate.Record.Path, candidate.Classes));
        }

        var parsed = packageRecords.Where(record => record.Status == "parsed").ToArray();
        var assets = parsed.SelectMany(record => record.Assets).ToArray();
        var failureTypes = packageRecords
            .Where(record => record.ErrorType is not null)
            .GroupBy(record => record.ErrorType!, StringComparer.Ordinal)
            .OrderBy(group => group.Key, StringComparer.Ordinal)
            .Select(group => new CensusCount(group.Key, group.Count()))
            .ToArray();

        return new StructuredAssetIndex(
            ArtifactType: "structured-asset-index",
            Build: new CensusBuildReference(
                ManifestSha256: manifestSha256,
                SteamAppId: manifest.Steam.AppId,
                SteamBuildId: manifest.Steam.BuildId),
            StaticCensus: new StructuredIndexInput(
                FileName: censusIdentity.FileName,
                SizeBytes: censusIdentity.SizeBytes,
                Sha256: censusIdentity.Sha256),
            Mappings: mappingIdentity,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                Name: "NeonRetroRewind.StaticExtractor",
                Version: AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                Cue4ParseVersion: AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Totals: new StructuredIndexTotals(
                CandidatePackageCount: packageRecords.Count,
                ParsedPackageCount: parsed.Length,
                FailedPackageCount: packageRecords.Count - parsed.Length,
                ExportCount: parsed.Sum(record => record.ExportCount!.Value),
                ExportPropertyCount: parsed.Sum(record => record.ExportPropertyCount!.Value),
                DataAssetCount: assets.Count(asset => asset.Kind == "data-asset"),
                DataTableCount: assets.Count(asset => asset.Kind == "data-table"),
                DataTableRowCount: assets.Where(asset => asset.Kind == "data-table").Sum(asset => asset.EntryCount!.Value),
                DataTableRowPropertyCount: assets.Where(asset => asset.Kind == "data-table").Sum(asset => asset.EntryPropertyCount!.Value),
                StringTableCount: assets.Count(asset => asset.Kind == "string-table"),
                StringTableEntryCount: assets.Where(asset => asset.Kind == "string-table").Sum(asset => asset.EntryCount!.Value)),
            Packages: packageRecords,
            FailureTypes: failureTypes);
    }

    private static StructuredPackageRecord CreatePackageRecord(
        DefaultFileProvider provider,
        string path,
        IReadOnlyList<string> candidateClasses)
    {
        try
        {
            if (!provider.TryGetGameFile(path, out var file))
            {
                throw new InvalidDataException("Static-census package is missing from the mounted provider.");
            }

            var exports = provider.LoadPackage(file).GetExports().ToArray();
            var assets = exports
                .Select(CreateAssetRecord)
                .Where(record => record is not null)
                .Cast<StructuredAssetRecord>()
                .OrderBy(record => record.Name, StringComparer.Ordinal)
                .ThenBy(record => record.Type, StringComparer.Ordinal)
                .ToArray();

            return new StructuredPackageRecord(
                Path: path,
                Status: "parsed",
                CandidateClasses: candidateClasses,
                ExportCount: exports.Length,
                ExportPropertyCount: exports.Sum(export => export.Properties.Count),
                Assets: assets,
                ErrorType: null);
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            return new StructuredPackageRecord(
                Path: path,
                Status: "failed",
                CandidateClasses: candidateClasses,
                ExportCount: null,
                ExportPropertyCount: null,
                Assets: [],
                ErrorType: exception.GetType().Name);
        }
    }

    private static StructuredAssetRecord? CreateAssetRecord(UObject export)
        => export switch
        {
            UDataTable table => new StructuredAssetRecord(
                Name: table.Name,
                Type: table.ExportType,
                Kind: "data-table",
                ExportPropertyCount: table.Properties.Count,
                EntryCount: table.RowMap?.Count ?? 0,
                EntryPropertyCount: table.RowMap?.Values.Sum(row => row.Properties.Count) ?? 0,
                RowStruct: table.RowStructName),
            UStringTable table => new StructuredAssetRecord(
                Name: table.Name,
                Type: table.ExportType,
                Kind: "string-table",
                ExportPropertyCount: table.Properties.Count,
                EntryCount: table.StringTable.KeysToEntries.Count,
                EntryPropertyCount: null,
                RowStruct: null),
            UDataAsset asset => new StructuredAssetRecord(
                Name: asset.Name,
                Type: asset.ExportType,
                Kind: "data-asset",
                ExportPropertyCount: asset.Properties.Count,
                EntryCount: null,
                EntryPropertyCount: null,
                RowStruct: null),
            _ => null,
        };

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

    private static bool TryParseArguments(
        string[] args,
        out StructuredIndexOptions options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = StructuredIndexOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = StructuredIndexOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[] { "--build-manifest", "--static-census", "--mappings", "--package-directory", "--output" };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = StructuredIndexOptions.Empty;
            error = unknown is null
                ? "Structured-index generation requires all five input and output options."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new StructuredIndexOptions(
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
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor structured-index --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command fully deserializes mapped DataTable, StringTable, and data-asset candidates from a static census.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record StructuredIndexOptions(
        string BuildManifestPath,
        string StaticCensusPath,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static StructuredIndexOptions Empty { get; } = new("", "", "", "", "");
    }
}
