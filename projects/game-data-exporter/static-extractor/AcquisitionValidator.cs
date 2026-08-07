using System.Reflection;
using System.Text.Json;

namespace NeonRewind.StaticExtractor;

internal static class AcquisitionValidator
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public static T ReadJson<T>(string path, string description)
    {
        if (!File.Exists(path))
        {
            throw new IOException($"{description} does not exist: {path}");
        }

        return JsonSerializer.Deserialize<T>(File.ReadAllText(path), JsonOptions) ??
            throw new InvalidDataException($"{description} is empty.");
    }

    public static void ValidateManifest(BuildManifest manifest)
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
            manifest.Packages.Count == 0 ||
            manifest.Packages.Any(package =>
                package is null ||
                string.IsNullOrWhiteSpace(package.FileName) ||
                package.SizeBytes < 0 ||
                package.Sha256 is not { Length: 64 }))
        {
            throw new InvalidDataException("Build manifest is incomplete or unsupported.");
        }
    }

    public static IReadOnlyDictionary<string, string> VerifyPackageFiles(
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

    public static MappingIdentity ReadMappingIdentity(string path)
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

    public static void VerifyUnchanged(string path, FileIdentity expected, string description)
    {
        var actual = FileIdentityFactory.Create(path);
        if (actual.SizeBytes != expected.SizeBytes ||
            !string.Equals(actual.Sha256, expected.Sha256, StringComparison.Ordinal))
        {
            throw new InvalidDataException($"{description} changed while the command was running.");
        }
    }

    public static void VerifyUnchanged(string path, MappingIdentity expected, string description)
    {
        var actual = FileIdentityFactory.Create(path);
        if (actual.SizeBytes != expected.SizeBytes ||
            !string.Equals(actual.Sha256, expected.Sha256, StringComparison.Ordinal))
        {
            throw new InvalidDataException($"{description} changed while the command was running.");
        }
    }

    public static string ReadAssemblyMetadata(string key)
    {
        var value = typeof(AcquisitionValidator).Assembly
            .GetCustomAttributes<AssemblyMetadataAttribute>()
            .SingleOrDefault(attribute => string.Equals(attribute.Key, key, StringComparison.Ordinal))
            ?.Value;

        return value ?? throw new InvalidDataException($"Extractor assembly metadata is missing '{key}'.");
    }
}
