using System.Diagnostics;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace NeonRewind.StaticExtractor;

internal static partial class BuildManifestCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int InputFailureExitCode = 6;
    private const int OutputConflictExitCode = 7;
    private const int SchemaVersion = 1;

    private static readonly UTF8Encoding Utf8WithoutBom = new(false);
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
            var manifest = CreateManifest(options);
            var json = JsonSerializer.Serialize(manifest, JsonOptions) + "\n";
            return WriteManifest(options.OutputPath, json);
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Build-manifest operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Build-manifest input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Build-manifest access failed: {exception.Message}");
            return InputFailureExitCode;
        }
    }

    private static BuildManifest CreateManifest(BuildManifestOptions options)
    {
        EnsureInputFileExists(options.SteamManifestPath, "Steam app manifest");
        EnsureInputFileExists(options.ExecutablePath, "game executable");

        foreach (var packagePath in options.PackagePaths)
        {
            EnsureInputFileExists(packagePath, "package");
            EnsureSupportedPackageFile(packagePath);
        }

        var steamFieldsBeforeHashing = ReadSteamBuildFields(options.SteamManifestPath);
        var executableInfo = FileVersionInfo.GetVersionInfo(Path.GetFullPath(options.ExecutablePath));
        var reportedGameVersion = FirstNonEmpty(executableInfo.ProductVersion, executableInfo.FileVersion);
        var executableIdentity = CreateFileIdentity(options.ExecutablePath);
        var packageIdentities = options.PackagePaths
            .Select(CreateFileIdentity)
            .OrderBy(identity => identity.FileName, StringComparer.Ordinal)
            .ToArray();
        var steamFieldsAfterHashing = ReadSteamBuildFields(options.SteamManifestPath);

        EnsureUniqueFileNames(packageIdentities);
        EnsureSteamBuildDidNotChange(steamFieldsBeforeHashing, steamFieldsAfterHashing);

        return new BuildManifest(
            ArtifactType: "build-manifest",
            SchemaVersion,
            Steam: new SteamBuildIdentity(
                AppId: steamFieldsAfterHashing["appid"],
                BuildId: steamFieldsAfterHashing["buildid"],
                Name: steamFieldsAfterHashing["name"]),
            ReportedGameVersion: reportedGameVersion,
            Executable: executableIdentity,
            Packages: packageIdentities,
            Engine: new EngineIdentity(
                Version: "5.4",
                Cue4ParseProfile: "GAME_UE5_4",
                Source: "configured",
                Confidence: "probable"),
            Extractor: new ExtractorIdentity(
                Name: "NeonRewind.StaticExtractor",
                Version: ReadAssemblyMetadata("ExtractorVersion"),
                Cue4ParseVersion: ReadAssemblyMetadata("Cue4ParsePackageVersion")));
    }

    private static int WriteManifest(string outputPath, string json)
    {
        var resolvedOutputPath = Path.GetFullPath(outputPath);
        var outputDirectory = Path.GetDirectoryName(resolvedOutputPath);

        if (string.IsNullOrEmpty(outputDirectory) || !Directory.Exists(outputDirectory))
        {
            throw new IOException($"Output directory does not exist: {outputDirectory}");
        }

        if (File.Exists(resolvedOutputPath))
        {
            var existingJson = File.ReadAllText(resolvedOutputPath, Encoding.UTF8);
            if (string.Equals(existingJson, json, StringComparison.Ordinal))
            {
                Console.WriteLine($"Build manifest is unchanged: {resolvedOutputPath}");
                return 0;
            }

            Console.Error.WriteLine($"Refusing to overwrite a different build manifest: {resolvedOutputPath}");
            return OutputConflictExitCode;
        }

        var temporaryPath = resolvedOutputPath + $".{Environment.ProcessId}.{Guid.NewGuid():N}.tmp";

        try
        {
            File.WriteAllText(temporaryPath, json, Utf8WithoutBom);
            File.Move(temporaryPath, resolvedOutputPath);
        }
        finally
        {
            if (File.Exists(temporaryPath))
            {
                File.Delete(temporaryPath);
            }
        }

        Console.WriteLine($"Wrote build manifest: {resolvedOutputPath}");
        return 0;
    }

    private static Dictionary<string, string> ReadSteamBuildFields(string manifestPath)
    {
        var fields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var depth = 0;

        foreach (var line in File.ReadLines(manifestPath))
        {
            var trimmedLine = line.Trim();

            if (trimmedLine == "{")
            {
                depth++;
                continue;
            }

            if (trimmedLine == "}")
            {
                depth--;
                if (depth < 0)
                {
                    throw new InvalidDataException("Steam app manifest has unbalanced braces.");
                }

                continue;
            }

            if (depth != 1)
            {
                continue;
            }

            var match = VdfKeyValuePattern().Match(line);
            if (match.Success)
            {
                fields[match.Groups["key"].Value] = match.Groups["value"].Value;
            }
        }

        if (depth != 0)
        {
            throw new InvalidDataException("Steam app manifest has unbalanced braces.");
        }

        foreach (var requiredField in new[] { "appid", "buildid", "name" })
        {
            if (!fields.TryGetValue(requiredField, out var value) || string.IsNullOrWhiteSpace(value))
            {
                throw new InvalidDataException($"Steam app manifest is missing top-level field '{requiredField}'.");
            }
        }

        return fields;
    }

    private static FileIdentity CreateFileIdentity(string path)
    {
        var file = new FileInfo(Path.GetFullPath(path));
        using var stream = file.OpenRead();
        var hash = SHA256.HashData(stream);

        return new FileIdentity(
            FileName: file.Name,
            SizeBytes: file.Length,
            Sha256: Convert.ToHexStringLower(hash));
    }

    private static void EnsureInputFileExists(string path, string description)
    {
        if (!File.Exists(path))
        {
            throw new IOException($"The {description} does not exist: {path}");
        }
    }

    private static void EnsureSupportedPackageFile(string path)
    {
        var extension = Path.GetExtension(path);
        if (extension.ToLowerInvariant() is not (".pak" or ".utoc" or ".ucas"))
        {
            throw new InvalidDataException($"Unsupported package extension '{extension}'. Expected .pak, .utoc, or .ucas.");
        }
    }

    private static void EnsureUniqueFileNames(IEnumerable<FileIdentity> packages)
    {
        var duplicateFileName = packages
            .GroupBy(package => package.FileName, StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault(group => group.Count() > 1)?.Key;

        if (duplicateFileName is not null)
        {
            throw new InvalidDataException($"Package file names must be unique: {duplicateFileName}");
        }
    }

    private static void EnsureSteamBuildDidNotChange(
        IReadOnlyDictionary<string, string> fieldsBeforeHashing,
        IReadOnlyDictionary<string, string> fieldsAfterHashing)
    {
        foreach (var field in new[] { "appid", "buildid", "name" })
        {
            if (!string.Equals(
                    fieldsBeforeHashing[field],
                    fieldsAfterHashing[field],
                    StringComparison.Ordinal))
            {
                throw new InvalidDataException("Steam build identity changed while files were being hashed. Run the command again after the game update finishes.");
            }
        }
    }

    private static string ReadAssemblyMetadata(string key)
    {
        var value = typeof(BuildManifestCommand).Assembly
            .GetCustomAttributes<AssemblyMetadataAttribute>()
            .SingleOrDefault(attribute => string.Equals(attribute.Key, key, StringComparison.Ordinal))
            ?.Value;

        return value ?? throw new InvalidDataException($"Extractor assembly metadata is missing '{key}'.");
    }

    private static string? FirstNonEmpty(params string?[] values)
        => values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));

    private static bool TryParseArguments(
        string[] args,
        out BuildManifestOptions options,
        out string error)
    {
        string? steamManifestPath = null;
        string? executablePath = null;
        string? outputPath = null;
        var packagePaths = new List<string>();

        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = BuildManifestOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            var value = args[++index];
            switch (option)
            {
                case "--steam-manifest" when steamManifestPath is null:
                    steamManifestPath = value;
                    break;
                case "--executable" when executablePath is null:
                    executablePath = value;
                    break;
                case "--package":
                    packagePaths.Add(value);
                    break;
                case "--output" when outputPath is null:
                    outputPath = value;
                    break;
                default:
                    options = BuildManifestOptions.Empty;
                    error = $"Unknown or duplicate option '{option}'.";
                    return false;
            }
        }

        if (steamManifestPath is null || executablePath is null ||
            outputPath is null || packagePaths.Count == 0)
        {
            options = BuildManifestOptions.Empty;
            error = "Manifest generation requires one Steam manifest, one executable, at least one package, and one output path.";
            return false;
        }

        options = new BuildManifestOptions(
            steamManifestPath,
            executablePath,
            packagePaths,
            outputPath);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRewind.StaticExtractor manifest --steam-manifest <path> --executable <path> --package <path> [--package <path> ...] --output <path>");
        writer.WriteLine();
        writer.WriteLine("The output directory must already exist.");
        writer.WriteLine("An identical manifest is left unchanged. Different existing content is never overwritten.");
    }

    [GeneratedRegex("^\\s*\"(?<key>[^\"]+)\"\\s+\"(?<value>[^\"]*)\"\\s*$", RegexOptions.CultureInvariant)]
    private static partial Regex VdfKeyValuePattern();

    private sealed record BuildManifestOptions(
        string SteamManifestPath,
        string ExecutablePath,
        IReadOnlyList<string> PackagePaths,
        string OutputPath)
    {
        public static BuildManifestOptions Empty { get; } = new(
            string.Empty,
            string.Empty,
            [],
            string.Empty);
    }
}
