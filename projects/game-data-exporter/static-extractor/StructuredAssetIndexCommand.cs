using System.Reflection;
using System.Text.Json;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Assets.Exports;
using CUE4Parse.UE4.Assets.Exports.Engine;
using CUE4Parse.UE4.Assets.Exports.Internationalization;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Versions;

namespace NeonRewind.StaticExtractor;

internal static class StructuredAssetIndexCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int InputFailureExitCode = 6;
    private const int OutputConflictExitCode = 7;
    private const int ParseFailuresExitCode = 8;
    private const int SchemaVersion = 1;

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
            var manifest = ReadJson<BuildManifest>(options.BuildManifestPath, "build manifest");
            ValidateManifest(manifest);
            var census = ReadJson<StaticCensus>(options.StaticCensusPath, "static census");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var censusIdentity = FileIdentityFactory.Create(options.StaticCensusPath);
            var mappingIdentity = ReadMappingIdentity(options.MappingsPath);
            ValidateCensus(census, manifest, manifestIdentity.Sha256);
            var packagePaths = VerifyPackageFiles(manifest, options.PackageDirectory);

            var index = CreateIndex(
                manifest,
                census,
                manifestIdentity.Sha256,
                censusIdentity,
                mappingIdentity,
                options.MappingsPath,
                options.PackageDirectory);

            VerifyPackageFiles(manifest, options.PackageDirectory, packagePaths);
            VerifyUnchanged(options.BuildManifestPath, manifestIdentity, "Build manifest");
            VerifyUnchanged(options.StaticCensusPath, censusIdentity, "Static census");
            VerifyUnchanged(options.MappingsPath, mappingIdentity, "Mappings");

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
            SchemaVersion,
            Build: new CensusBuildReference(
                ManifestSha256: manifestSha256,
                ManifestSchemaVersion: manifest.SchemaVersion,
                SteamAppId: manifest.Steam.AppId,
                SteamBuildId: manifest.Steam.BuildId),
            StaticCensus: new StructuredIndexInput(
                FileName: censusIdentity.FileName,
                SizeBytes: censusIdentity.SizeBytes,
                Sha256: censusIdentity.Sha256,
                SchemaVersion: census.SchemaVersion),
            Mappings: mappingIdentity,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                Name: "NeonRewind.StaticExtractor",
                Version: ReadAssemblyMetadata("ExtractorVersion"),
                Cue4ParseVersion: ReadAssemblyMetadata("Cue4ParsePackageVersion")),
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

    private static T ReadJson<T>(string path, string description)
    {
        if (!File.Exists(path))
        {
            throw new IOException($"{description} does not exist: {path}");
        }

        return JsonSerializer.Deserialize<T>(File.ReadAllText(path), JsonOptions) ??
            throw new InvalidDataException($"{description} is empty.");
    }

    private static void ValidateManifest(BuildManifest manifest)
    {
        if (manifest.ArtifactType != "build-manifest" || manifest.SchemaVersion != 1)
        {
            throw new InvalidDataException("Expected build-manifest schema version 1.");
        }

        if (manifest.Steam is null ||
            string.IsNullOrWhiteSpace(manifest.Steam.AppId) ||
            string.IsNullOrWhiteSpace(manifest.Steam.BuildId) ||
            manifest.Engine is not { Version: "5.4", Cue4ParseProfile: "GAME_UE5_4" } ||
            manifest.Packages is null ||
            manifest.Packages.Count == 0)
        {
            throw new InvalidDataException("Build manifest is incomplete or unsupported.");
        }
    }

    private static void ValidateCensus(
        StaticCensus census,
        BuildManifest manifest,
        string manifestSha256)
    {
        if (census.ArtifactType != "static-census" || census.SchemaVersion != 1)
        {
            throw new InvalidDataException("Expected static-census schema version 1.");
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

    private static IReadOnlyDictionary<string, string> VerifyPackageFiles(
        BuildManifest manifest,
        string packageDirectory,
        IReadOnlyDictionary<string, string>? expectedPaths = null)
    {
        if (!Directory.Exists(packageDirectory))
        {
            throw new IOException($"Package directory does not exist: {packageDirectory}");
        }

        var paths = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var expected in manifest.Packages)
        {
            if (!string.Equals(expected.FileName, Path.GetFileName(expected.FileName), StringComparison.Ordinal))
            {
                throw new InvalidDataException("Build manifest contains a package path instead of a file name.");
            }

            var path = expectedPaths?.GetValueOrDefault(expected.FileName) ??
                Path.Combine(Path.GetFullPath(packageDirectory), expected.FileName);
            var actual = FileIdentityFactory.Create(path);
            if (actual.SizeBytes != expected.SizeBytes ||
                !string.Equals(actual.Sha256, expected.Sha256, StringComparison.Ordinal))
            {
                throw new InvalidDataException($"Package identity does not match the build manifest: {expected.FileName}");
            }

            paths.Add(expected.FileName, path);
        }

        return paths;
    }

    private static MappingIdentity ReadMappingIdentity(string path)
    {
        if (!File.Exists(path))
        {
            throw new IOException($"Mappings do not exist: {path}");
        }

        using var stream = File.OpenRead(path);
        using var reader = new BinaryReader(stream);
        if (stream.Length < 16 || reader.ReadUInt16() != 0x30C4)
        {
            throw new InvalidDataException("Mappings are not a supported .usmap file.");
        }

        var formatVersion = reader.ReadByte();
        if (formatVersion != 4)
        {
            throw new InvalidDataException($"Expected .usmap format version 4, found {formatVersion}.");
        }

        var identity = FileIdentityFactory.Create(path);
        return new MappingIdentity(identity.FileName, identity.SizeBytes, identity.Sha256, formatVersion);
    }

    private static void VerifyUnchanged(string path, FileIdentity expected, string description)
    {
        var actual = FileIdentityFactory.Create(path);
        if (actual.SizeBytes != expected.SizeBytes || !string.Equals(actual.Sha256, expected.Sha256, StringComparison.Ordinal))
        {
            throw new InvalidDataException($"{description} changed while the structured index was running.");
        }
    }

    private static void VerifyUnchanged(string path, MappingIdentity expected, string description)
    {
        var actual = FileIdentityFactory.Create(path);
        if (actual.SizeBytes != expected.SizeBytes || !string.Equals(actual.Sha256, expected.Sha256, StringComparison.Ordinal))
        {
            throw new InvalidDataException($"{description} changed while the structured index was running.");
        }
    }

    private static string ReadAssemblyMetadata(string key)
    {
        var value = typeof(StructuredAssetIndexCommand).Assembly
            .GetCustomAttributes<AssemblyMetadataAttribute>()
            .SingleOrDefault(attribute => string.Equals(attribute.Key, key, StringComparison.Ordinal))
            ?.Value;

        return value ?? throw new InvalidDataException($"Extractor assembly metadata is missing '{key}'.");
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
        writer.WriteLine("Usage: NeonRewind.StaticExtractor structured-index --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --output <path>");
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
