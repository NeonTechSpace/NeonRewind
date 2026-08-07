using System.Globalization;
using System.Text.Json;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Assets.Exports.Engine;
using CUE4Parse.UE4.Assets.Exports.Internationalization;
using CUE4Parse.UE4.Versions;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using NewtonsoftJsonSerializer = Newtonsoft.Json.JsonSerializer;
using SystemJsonSerializer = System.Text.Json.JsonSerializer;

namespace NeonRewind.StaticExtractor;

internal static class StructuredValuesCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int InputFailureExitCode = 6;
    private const int OutputConflictExitCode = 7;
    private const int ParseFailuresExitCode = 8;
    private const int SchemaVersion = 1;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    private static readonly NewtonsoftJsonSerializer ValueSerializer = NewtonsoftJsonSerializer.Create(
        new JsonSerializerSettings
        {
            Culture = CultureInfo.InvariantCulture,
            FloatFormatHandling = FloatFormatHandling.String,
        });

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
            var index = AcquisitionValidator.ReadJson<StructuredAssetIndex>(options.StructuredIndexPath, "structured index");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var indexIdentity = FileIdentityFactory.Create(options.StructuredIndexPath);
            var mappingIdentity = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);
            ValidateIndex(index, manifest, manifestIdentity.Sha256, mappingIdentity);
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory);

            var values = CreateValues(
                manifest,
                index,
                manifestIdentity.Sha256,
                indexIdentity,
                mappingIdentity,
                options.MappingsPath,
                options.PackageDirectory);

            AcquisitionValidator.VerifyPackageFiles(manifest, options.PackageDirectory, packagePaths);
            AcquisitionValidator.VerifyUnchanged(options.BuildManifestPath, manifestIdentity, "Build manifest");
            AcquisitionValidator.VerifyUnchanged(options.StructuredIndexPath, indexIdentity, "Structured index");
            AcquisitionValidator.VerifyUnchanged(options.MappingsPath, mappingIdentity, "Mappings");

            var json = SystemJsonSerializer.Serialize(values, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(options.OutputPath, json, "Structured values");
            if (writeStatus == ArtifactWriteStatus.Conflict)
            {
                return OutputConflictExitCode;
            }

            return values.Totals.FailedPackageCount > 0 ? ParseFailuresExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Structured-values operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Structured-values input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (System.Text.Json.JsonException exception)
        {
            Console.Error.WriteLine($"Structured-values input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Newtonsoft.Json.JsonException exception)
        {
            Console.Error.WriteLine($"Structured-values serialization failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Structured-values access failed: {exception.Message}");
            return InputFailureExitCode;
        }
    }

    private static StructuredValues CreateValues(
        BuildManifest manifest,
        StructuredAssetIndex index,
        string manifestSha256,
        FileIdentity indexIdentity,
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

        var candidates = index.Packages
            .Where(package => package.Assets.Any(asset => asset.Kind is "data-table" or "string-table"))
            .OrderBy(package => package.Path, StringComparer.Ordinal)
            .ToArray();
        var dataTables = new List<DataTableValues>();
        var stringTables = new List<StringTableValues>();
        var failures = new List<StructuredValuesFailure>();

        foreach (var candidate in candidates)
        {
            try
            {
                ExtractPackage(provider, candidate, dataTables, stringTables);
            }
            catch (Exception exception) when (exception is not OutOfMemoryException)
            {
                failures.Add(new StructuredValuesFailure(candidate.Path, exception.GetType().Name));
            }
        }

        dataTables.Sort(CompareDataTables);
        stringTables.Sort(CompareStringTables);
        var failureTypes = failures
            .GroupBy(failure => failure.ErrorType, StringComparer.Ordinal)
            .OrderBy(group => group.Key, StringComparer.Ordinal)
            .Select(group => new CensusCount(group.Key, group.Count()))
            .ToArray();
        var totals = new StructuredValuesTotals(
            CandidatePackageCount: candidates.Length,
            ExtractedPackageCount: candidates.Length - failures.Count,
            FailedPackageCount: failures.Count,
            DataTableCount: dataTables.Count,
            DataTableRowCount: dataTables.Sum(table => table.Rows.Count),
            DataTableRowPropertyCount: dataTables.Sum(table => table.Rows.Sum(row => row.Values.EnumerateObject().Count())),
            StringTableCount: stringTables.Count,
            StringTableEntryCount: stringTables.Sum(table => table.Entries.Count),
            StringTableMetadataCount: stringTables.Sum(table => table.Entries.Sum(entry => entry.Metadata.Count)));

        if (failures.Count == 0 &&
            (totals.DataTableCount != index.Totals.DataTableCount ||
             totals.DataTableRowCount != index.Totals.DataTableRowCount ||
             totals.DataTableRowPropertyCount != index.Totals.DataTableRowPropertyCount ||
             totals.StringTableCount != index.Totals.StringTableCount ||
             totals.StringTableEntryCount != index.Totals.StringTableEntryCount))
        {
            throw new InvalidDataException("Extracted structured-value totals do not match the structured index.");
        }

        return new StructuredValues(
            ArtifactType: "structured-values",
            SchemaVersion,
            Build: new CensusBuildReference(
                ManifestSha256: manifestSha256,
                ManifestSchemaVersion: manifest.SchemaVersion,
                SteamAppId: manifest.Steam.AppId,
                SteamBuildId: manifest.Steam.BuildId),
            StructuredIndex: new StructuredValuesInput(
                FileName: indexIdentity.FileName,
                SizeBytes: indexIdentity.SizeBytes,
                Sha256: indexIdentity.Sha256,
                SchemaVersion: index.SchemaVersion),
            Mappings: mappingIdentity,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                Name: "NeonRewind.StaticExtractor",
                Version: AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                Cue4ParseVersion: AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Totals: totals,
            DataTables: dataTables,
            StringTables: stringTables,
            Failures: failures,
            FailureTypes: failureTypes);
    }

    private static void ExtractPackage(
        DefaultFileProvider provider,
        StructuredPackageRecord expected,
        ICollection<DataTableValues> dataTables,
        ICollection<StringTableValues> stringTables)
    {
        if (!provider.TryGetGameFile(expected.Path, out var file))
        {
            throw new InvalidDataException("Structured-index package is missing from the mounted provider.");
        }

        var exports = provider.LoadPackage(file).GetExports().ToArray();
        var expectedTables = expected.Assets.Where(asset => asset.Kind == "data-table").ToArray();
        var expectedStrings = expected.Assets.Where(asset => asset.Kind == "string-table").ToArray();
        var actualTables = exports.OfType<UDataTable>().ToDictionary(table => table.Name, StringComparer.Ordinal);
        var actualStrings = exports.OfType<UStringTable>().ToDictionary(table => table.Name, StringComparer.Ordinal);

        if (actualTables.Count != expectedTables.Length || actualStrings.Count != expectedStrings.Length)
        {
            throw new InvalidDataException("Structured assets no longer match the structured index.");
        }

        foreach (var expectedTable in expectedTables.OrderBy(asset => asset.Name, StringComparer.Ordinal))
        {
            if (!actualTables.TryGetValue(expectedTable.Name, out var table))
            {
                throw new InvalidDataException("A DataTable from the structured index could not be loaded.");
            }

            var rows = table.RowMap
                .OrderBy(row => row.Key.Text, StringComparer.Ordinal)
                .Select(row => new DataTableRow(row.Key.Text, NormalizeValues(row.Value)))
                .ToArray();
            dataTables.Add(new DataTableValues(
                Path: expected.Path,
                Name: table.Name,
                Type: table.ExportType,
                RowStruct: table.RowStructName,
                Rows: rows));
        }

        foreach (var expectedTable in expectedStrings.OrderBy(asset => asset.Name, StringComparer.Ordinal))
        {
            if (!actualStrings.TryGetValue(expectedTable.Name, out var table))
            {
                throw new InvalidDataException("A StringTable from the structured index could not be loaded.");
            }

            var entries = table.StringTable.KeysToEntries
                .OrderBy(entry => entry.Key, StringComparer.Ordinal)
                .Select(entry => new StringTableEntry(
                    Key: entry.Key,
                    Value: entry.Value,
                    Metadata: ReadMetadata(table, entry.Key)))
                .ToArray();
            stringTables.Add(new StringTableValues(
                Path: expected.Path,
                Name: table.Name,
                Type: table.ExportType,
                Namespace: table.StringTable.TableNamespace,
                Entries: entries));
        }
    }

    private static JsonElement NormalizeValues(CUE4Parse.UE4.Assets.Objects.FStructFallback row)
    {
        var token = JToken.FromObject(row, ValueSerializer);
        var canonical = Canonicalize(token);
        using var document = JsonDocument.Parse(canonical.ToString(Formatting.None));
        return document.RootElement.Clone();
    }

    private static JToken Canonicalize(JToken token)
        => token switch
        {
            JObject value => new JObject(value.Properties()
                .OrderBy(property => property.Name, StringComparer.Ordinal)
                .Select(property => new JProperty(property.Name, Canonicalize(property.Value)))),
            JArray value => new JArray(value.Select(Canonicalize)),
            _ => token.DeepClone(),
        };

    private static IReadOnlyList<StringTableMetadata> ReadMetadata(UStringTable table, string key)
    {
        if (table.StringTable.KeysToMetaData is null ||
            !table.StringTable.KeysToMetaData.TryGetValue(key, out var metadata))
        {
            return [];
        }

        return metadata
            .OrderBy(pair => pair.Key.Text, StringComparer.Ordinal)
            .Select(pair => new StringTableMetadata(pair.Key.Text, pair.Value))
            .ToArray();
    }

    private static int CompareDataTables(DataTableValues left, DataTableValues right)
    {
        var path = StringComparer.Ordinal.Compare(left.Path, right.Path);
        return path != 0 ? path : StringComparer.Ordinal.Compare(left.Name, right.Name);
    }

    private static int CompareStringTables(StringTableValues left, StringTableValues right)
    {
        var path = StringComparer.Ordinal.Compare(left.Path, right.Path);
        return path != 0 ? path : StringComparer.Ordinal.Compare(left.Name, right.Name);
    }

    private static void ValidateIndex(
        StructuredAssetIndex index,
        BuildManifest manifest,
        string manifestSha256,
        MappingIdentity mappingIdentity)
    {
        if (index.ArtifactType != "structured-asset-index" || index.SchemaVersion != 1)
        {
            throw new InvalidDataException("Expected structured-asset-index schema version 1.");
        }

        if (index.Build is null ||
            index.Mappings is null ||
            index.Totals is null ||
            index.Packages is null ||
            index.Packages.Any(package => package is null || package.Assets is null))
        {
            throw new InvalidDataException("Structured index is incomplete.");
        }

        if (!string.Equals(index.Build.ManifestSha256, manifestSha256, StringComparison.Ordinal) ||
            !string.Equals(index.Build.SteamAppId, manifest.Steam.AppId, StringComparison.Ordinal) ||
            !string.Equals(index.Build.SteamBuildId, manifest.Steam.BuildId, StringComparison.Ordinal) ||
            index.Mappings != mappingIdentity)
        {
            throw new InvalidDataException("Structured index does not belong to the supplied build and mappings.");
        }

        if (index.Totals.FailedPackageCount != 0 || index.Packages.Any(package => package.Status != "parsed"))
        {
            throw new InvalidDataException("Structured index contains package failures.");
        }
    }

    private static bool TryParseArguments(
        string[] args,
        out StructuredValuesOptions options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = StructuredValuesOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = StructuredValuesOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[] { "--build-manifest", "--structured-index", "--mappings", "--package-directory", "--output" };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = StructuredValuesOptions.Empty;
            error = unknown is null
                ? "Structured-values generation requires all five input and output options."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new StructuredValuesOptions(
            values["--build-manifest"],
            values["--structured-index"],
            values["--mappings"],
            values["--package-directory"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRewind.StaticExtractor structured-values --build-manifest <path> --structured-index <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command writes deterministic DataTable rows and StringTable entries for private local use.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record StructuredValuesOptions(
        string BuildManifestPath,
        string StructuredIndexPath,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static StructuredValuesOptions Empty { get; } = new("", "", "", "", "");
    }
}
