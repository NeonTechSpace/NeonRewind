using System.Reflection;
using System.Text.Json;
using CUE4Parse.FileProvider;
using CUE4Parse.FileProvider.Objects;
using CUE4Parse.UE4.Assets;
using CUE4Parse.UE4.IO.Objects;
using CUE4Parse.UE4.Versions;

namespace NeonRewind.StaticExtractor;

internal static class StaticCensusCommand
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
            var buildManifest = ReadBuildManifest(options.BuildManifestPath);
            var manifestSha256 = FileIdentityFactory.ComputeSha256(options.BuildManifestPath);
            var packagePaths = VerifyPackageFiles(buildManifest, options.PackageDirectory);
            var census = CreateCensus(buildManifest, manifestSha256, options.PackageDirectory);

            VerifyPackageFilesUnchanged(buildManifest, packagePaths);
            VerifyBuildManifestUnchanged(options.BuildManifestPath, manifestSha256);

            var json = JsonSerializer.Serialize(census, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(options.OutputPath, json, "Static census");
            if (writeStatus == ArtifactWriteStatus.Conflict)
            {
                return OutputConflictExitCode;
            }

            return census.Totals.FailedPackageCount > 0 ? ParseFailuresExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Static-census operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Static-census input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine($"Static-census input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Static-census access failed: {exception.Message}");
            return InputFailureExitCode;
        }
    }

    private static BuildManifest ReadBuildManifest(string path)
    {
        if (!File.Exists(path))
        {
            throw new IOException($"Build manifest does not exist: {path}");
        }

        var manifest = JsonSerializer.Deserialize<BuildManifest>(
            File.ReadAllText(path),
            JsonOptions) ?? throw new InvalidDataException("Build manifest is empty.");

        if (manifest.ArtifactType != "build-manifest" || manifest.SchemaVersion != 1)
        {
            throw new InvalidDataException("Expected build-manifest schema version 1.");
        }

        if (manifest.Steam is null ||
            string.IsNullOrWhiteSpace(manifest.Steam.AppId) ||
            string.IsNullOrWhiteSpace(manifest.Steam.BuildId))
        {
            throw new InvalidDataException("Build manifest has incomplete Steam identity.");
        }

        if (manifest.Engine is not { Version: "5.4", Cue4ParseProfile: "GAME_UE5_4" })
        {
            throw new InvalidDataException("Only the configured GAME_UE5_4 profile is supported.");
        }

        if (manifest.Packages is null || manifest.Packages.Count == 0)
        {
            throw new InvalidDataException("Build manifest contains no package files.");
        }

        if (manifest.Packages.Any(package =>
                package is null ||
                string.IsNullOrWhiteSpace(package.FileName) ||
                package.SizeBytes < 0 ||
                package.Sha256 is not { Length: 64 }))
        {
            throw new InvalidDataException("Build manifest contains an invalid package identity.");
        }

        return manifest;
    }

    private static IReadOnlyDictionary<string, string> VerifyPackageFiles(
        BuildManifest manifest,
        string packageDirectory)
    {
        if (!Directory.Exists(packageDirectory))
        {
            throw new IOException($"Package directory does not exist: {packageDirectory}");
        }

        var resolvedDirectory = Path.GetFullPath(packageDirectory);
        var packagePaths = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var expectedIdentity in manifest.Packages)
        {
            if (!string.Equals(
                    expectedIdentity.FileName,
                    Path.GetFileName(expectedIdentity.FileName),
                    StringComparison.Ordinal))
            {
                throw new InvalidDataException("Build manifest contains a package path instead of a file name.");
            }

            var path = Path.Combine(resolvedDirectory, expectedIdentity.FileName);
            if (!File.Exists(path))
            {
                throw new IOException($"Manifest package does not exist: {expectedIdentity.FileName}");
            }

            var actualIdentity = FileIdentityFactory.Create(path);
            if (actualIdentity.SizeBytes != expectedIdentity.SizeBytes ||
                !string.Equals(actualIdentity.Sha256, expectedIdentity.Sha256, StringComparison.Ordinal))
            {
                throw new InvalidDataException($"Package identity does not match the build manifest: {expectedIdentity.FileName}");
            }

            if (!packagePaths.TryAdd(expectedIdentity.FileName, path))
            {
                throw new InvalidDataException($"Build manifest contains a duplicate package file name: {expectedIdentity.FileName}");
            }
        }

        return packagePaths;
    }

    private static void VerifyPackageFilesUnchanged(
        BuildManifest manifest,
        IReadOnlyDictionary<string, string> packagePaths)
    {
        foreach (var expectedIdentity in manifest.Packages)
        {
            var actualIdentity = FileIdentityFactory.Create(packagePaths[expectedIdentity.FileName]);
            if (actualIdentity.SizeBytes != expectedIdentity.SizeBytes ||
                !string.Equals(actualIdentity.Sha256, expectedIdentity.Sha256, StringComparison.Ordinal))
            {
                throw new InvalidDataException($"Package changed while the census was running: {expectedIdentity.FileName}");
            }
        }
    }

    private static void VerifyBuildManifestUnchanged(string path, string expectedSha256)
    {
        var actualSha256 = FileIdentityFactory.ComputeSha256(path);
        if (!string.Equals(actualSha256, expectedSha256, StringComparison.Ordinal))
        {
            throw new InvalidDataException("Build manifest changed while the census was running.");
        }
    }

    private static StaticCensus CreateCensus(
        BuildManifest manifest,
        string manifestSha256,
        string packageDirectory)
    {
        var versions = new VersionContainer(EGame.GAME_UE5_4);
        using var provider = new DefaultFileProvider(
            Path.GetFullPath(packageDirectory),
            SearchOption.TopDirectoryOnly,
            versions,
            StringComparer.OrdinalIgnoreCase);

        provider.Initialize();
        provider.Mount();
        provider.PostMount();

        if (provider.MountedVfs.Count == 0)
        {
            throw new InvalidDataException("No package containers could be mounted.");
        }

        if (provider.UnloadedVfs.Count > 0)
        {
            throw new InvalidDataException("One or more package containers could not be mounted.");
        }

        var effectiveFiles = GetEffectiveFiles(provider);
        var fileRecords = effectiveFiles.Select(CreateFileRecord).ToArray();
        var packageFiles = effectiveFiles.Where(file => file.IsUePackage).ToArray();
        var packageRecords = new List<CensusPackageRecord>(packageFiles.Length);

        for (var index = 0; index < packageFiles.Length; index++)
        {
            if (index > 0 && index % 500 == 0)
            {
                Console.WriteLine($"Scanned {index} of {packageFiles.Length} Unreal packages.");
            }

            packageRecords.Add(CreatePackageRecord(provider, packageFiles[index]));
        }

        var parsedPackages = packageRecords.Where(record => record.Status == "parsed").ToArray();
        var exportClasses = SumCounts(parsedPackages.Select(record => record.ExportClasses));
        var failureTypes = CountNames(packageRecords
            .Where(record => record.ErrorType is not null)
            .Select(record => record.ErrorType!));

        return new StaticCensus(
            ArtifactType: "static-census",
            SchemaVersion,
            Build: new CensusBuildReference(
                ManifestSha256: manifestSha256,
                ManifestSchemaVersion: manifest.SchemaVersion,
                SteamAppId: manifest.Steam.AppId,
                SteamBuildId: manifest.Steam.BuildId),
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                Name: "NeonRewind.StaticExtractor",
                Version: ReadAssemblyMetadata("ExtractorVersion"),
                Cue4ParseVersion: ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            Totals: new CensusTotals(
                FileCount: fileRecords.Length,
                PackageCount: packageRecords.Count,
                ParsedPackageCount: parsedPackages.Length,
                FailedPackageCount: packageRecords.Count - parsedPackages.Length,
                ImportCount: parsedPackages.Sum(record => (long)record.ImportCount!.Value),
                ExportCount: parsedPackages.Sum(record => (long)record.ExportCount!.Value)),
            Files: fileRecords,
            Packages: packageRecords,
            ExportClasses: exportClasses,
            FailureTypes: failureTypes);
    }

    private static GameFile[] GetEffectiveFiles(DefaultFileProvider provider)
    {
        var files = new List<GameFile>();
        var paths = provider.Files.Keys
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(path => path, StringComparer.Ordinal);

        foreach (var path in paths)
        {
            if (!provider.TryGetGameFile(path, out var file))
            {
                throw new InvalidDataException($"Mounted file disappeared from the provider index: {path}");
            }

            files.Add(file);
        }

        return files.ToArray();
    }

    private static CensusFileRecord CreateFileRecord(GameFile file)
        => new(
            Path: file.Path,
            SizeBytes: file.Size,
            Extension: file.Extension.ToLowerInvariant(),
            Kind: file.IsUePackage ? "package" : file.IsUePackagePayload ? "payload" : "file",
            Encrypted: file.IsEncrypted);

    private static CensusPackageRecord CreatePackageRecord(
        DefaultFileProvider provider,
        GameFile file)
    {
        try
        {
            var header = ReadPackageHeader(provider, file);

            return new CensusPackageRecord(
                Path: file.Path,
                Status: "parsed",
                Format: header.Format,
                ImportCount: header.ImportCount,
                ExportCount: header.ExportCount,
                ExportClasses: CountNames(header.ExportClassNames),
                ErrorType: null);
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            return new CensusPackageRecord(
                Path: file.Path,
                Status: "failed",
                Format: null,
                ImportCount: null,
                ExportCount: null,
                ExportClasses: [],
                ErrorType: exception.GetType().Name);
        }
    }

    private static PackageHeader ReadPackageHeader(
        DefaultFileProvider provider,
        GameFile file)
    {
        if (file is not FIoStoreEntry)
        {
            var legacyHeader = LegacyPackageHeaderReader.Read(file);
            return new PackageHeader(
                "legacy",
                legacyHeader.ImportCount,
                legacyHeader.ExportCount,
                legacyHeader.ExportClassNames);
        }

        var ioPackage = provider.LoadPackage(file) as IoPackage ??
            throw new InvalidDataException("Expected an IoStore package.");
        var classNames = ioPackage.ExportMap
            .Select(export => ResolveIoClassName(ioPackage, export.ClassIndex))
            .ToArray();

        return new PackageHeader(
            "io-store",
            ioPackage.ImportMapLength,
            ioPackage.ExportMapLength,
            classNames);
    }

    private static string ResolveIoClassName(
        IoPackage package,
        CUE4Parse.UE4.IO.Objects.FPackageObjectIndex classIndex)
    {
        try
        {
            return package.ResolveObjectIndex(classIndex)?.Name.Text ?? "<unresolved>";
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            return "<unresolved>";
        }
    }

    private static IReadOnlyList<CensusCount> CountNames(IEnumerable<string> names)
        => names
            .GroupBy(name => name, StringComparer.Ordinal)
            .OrderBy(group => group.Key, StringComparer.Ordinal)
            .Select(group => new CensusCount(group.Key, group.Count()))
            .ToArray();

    private static IReadOnlyList<CensusCount> SumCounts(
        IEnumerable<IReadOnlyList<CensusCount>> countSets)
    {
        var totals = new Dictionary<string, int>(StringComparer.Ordinal);

        foreach (var count in countSets.SelectMany(countSet => countSet))
        {
            totals[count.Name] = checked(totals.GetValueOrDefault(count.Name) + count.Count);
        }

        return totals
            .OrderBy(pair => pair.Key, StringComparer.Ordinal)
            .Select(pair => new CensusCount(pair.Key, pair.Value))
            .ToArray();
    }

    private static string ReadAssemblyMetadata(string key)
    {
        var value = typeof(StaticCensusCommand).Assembly
            .GetCustomAttributes<AssemblyMetadataAttribute>()
            .SingleOrDefault(attribute => string.Equals(attribute.Key, key, StringComparison.Ordinal))
            ?.Value;

        return value ?? throw new InvalidDataException($"Extractor assembly metadata is missing '{key}'.");
    }

    private static bool TryParseArguments(
        string[] args,
        out StaticCensusOptions options,
        out string error)
    {
        string? buildManifestPath = null;
        string? packageDirectory = null;
        string? outputPath = null;

        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = StaticCensusOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            var value = args[++index];
            switch (option)
            {
                case "--build-manifest" when buildManifestPath is null:
                    buildManifestPath = value;
                    break;
                case "--package-directory" when packageDirectory is null:
                    packageDirectory = value;
                    break;
                case "--output" when outputPath is null:
                    outputPath = value;
                    break;
                default:
                    options = StaticCensusOptions.Empty;
                    error = $"Unknown or duplicate option '{option}'.";
                    return false;
            }
        }

        if (buildManifestPath is null || packageDirectory is null || outputPath is null)
        {
            options = StaticCensusOptions.Empty;
            error = "Census generation requires one build manifest, one package directory, and one output path.";
            return false;
        }

        options = new StaticCensusOptions(buildManifestPath, packageDirectory, outputPath);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRewind.StaticExtractor census --build-manifest <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command verifies package hashes, inventories mounted files, and reads package import/export metadata.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record StaticCensusOptions(
        string BuildManifestPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static StaticCensusOptions Empty { get; } = new(
            string.Empty,
            string.Empty,
            string.Empty);
    }

    private sealed record PackageHeader(
        string Format,
        int ImportCount,
        int ExportCount,
        IReadOnlyList<string> ExportClassNames);
}
