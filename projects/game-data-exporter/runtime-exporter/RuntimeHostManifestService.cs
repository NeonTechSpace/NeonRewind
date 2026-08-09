using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace NeonRetroRewind.RuntimeExporter;

internal static class RuntimeHostManifestService
{
    private static readonly UTF8Encoding Utf8WithoutBom = new(false);
    private static readonly JsonSerializerOptions InputJsonOptions = new()
    {
        PropertyNameCaseInsensitive = false,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
    };
    private static readonly JsonSerializerOptions OutputJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    public static VerifiedStagingManifest ReadStaging(string manifestPath, RuntimeHostPayloadKind payloadKind) =>
        ReadStaging(manifestPath, payloadKind, requireCurrentRuntimeHost: true);

    private static VerifiedStagingManifest ReadStaging(
        string manifestPath,
        RuntimeHostPayloadKind payloadKind,
        bool requireCurrentRuntimeHost)
    {
        var path = ResolveExistingRegularFile(manifestPath, "Staging manifest");
        if (!string.Equals(Path.GetFileName(path), RuntimeHostContract.StagingManifestFileName, StringComparison.Ordinal))
        {
            throw new InvalidDataException($"Staging manifest must be named {RuntimeHostContract.StagingManifestFileName}.");
        }

        var identity = FileIdentityFactory.Create(path);
        var manifest = JsonSerializer.Deserialize<RuntimeHostStagingManifest>(File.ReadAllText(path), InputJsonOptions)
            ?? throw new InvalidDataException("Staging manifest is empty.");
        ValidateStagingContract(manifest, payloadKind, requireCurrentRuntimeHost);

        var stagingDirectory = Path.GetDirectoryName(path)!;
        var gameDirectory = ResolveGameDirectory(manifest.GameDirectory.AbsolutePath);
        var executablePath = Path.Combine(gameDirectory, manifest.Build.Executable.FileName);
        VerifyRegularFileIdentity(executablePath, manifest.Build.Executable, "Game executable");

        var files = manifest.ProposedFiles.Select(entry =>
        {
            var sourcePath = ResolveContainedPath(stagingDirectory, entry.SourceRelativePath, "Staged source");
            VerifyRegularFileIdentity(
                sourcePath,
                new FileIdentity(Path.GetFileName(sourcePath), entry.SizeBytes, entry.Sha256),
                $"Staged source {entry.SourceRelativePath}");
            return new VerifiedProposedGameFile(
                entry,
                sourcePath,
                Path.Combine(gameDirectory, entry.RelativePath));
        }).ToArray();

        if (requireCurrentRuntimeHost)
        {
            VerifyPayloadFiles(stagingDirectory, manifest);
        }

        VerifyRegularFileIdentity(path, identity, "Staging manifest");
        return new VerifiedStagingManifest(
            path,
            stagingDirectory,
            identity,
            manifest,
            gameDirectory,
            executablePath,
            files);
    }

    public static VerifiedInstallationManifest ReadInstallation(string manifestPath, RuntimeHostPayloadKind payloadKind)
    {
        var path = ResolveExistingRegularFile(manifestPath, "Installation manifest");
        if (!string.Equals(Path.GetFileName(path), RuntimeHostContract.InstallationManifestFileName, StringComparison.Ordinal))
        {
            throw new InvalidDataException($"Installation manifest must be named {RuntimeHostContract.InstallationManifestFileName}.");
        }

        var identity = FileIdentityFactory.Create(path);
        var manifest = JsonSerializer.Deserialize<RuntimeHostInstallationManifest>(File.ReadAllText(path), InputJsonOptions)
            ?? throw new InvalidDataException("Installation manifest is empty.");
        ValidateInstallationContract(manifest);

        var stagingPath = Path.Combine(Path.GetDirectoryName(path)!, RuntimeHostContract.StagingManifestFileName);
        VerifyRegularFileIdentity(stagingPath, manifest.StagingManifest, "Referenced staging manifest");
        var staging = ReadStaging(stagingPath, payloadKind, requireCurrentRuntimeHost: false);

        if (manifest.Build != staging.Manifest.Build ||
            !string.Equals(manifest.GameDirectory.AbsolutePath, staging.Manifest.GameDirectory.AbsolutePath, StringComparison.OrdinalIgnoreCase) ||
            manifest.InstalledFiles.Count != staging.Files.Count)
        {
            throw new InvalidDataException("Installation manifest does not match its staging manifest.");
        }

        for (var index = 0; index < manifest.InstalledFiles.Count; index++)
        {
            var installed = manifest.InstalledFiles[index];
            var proposed = staging.Files[index].Entry;
            if (installed.RelativePath != proposed.RelativePath ||
                installed.SizeBytes != proposed.SizeBytes ||
                installed.Sha256 != proposed.Sha256)
            {
                throw new InvalidDataException("Installation manifest file identities do not match the staging manifest.");
            }
        }

        VerifyRegularFileIdentity(path, identity, "Installation manifest");
        return new VerifiedInstallationManifest(path, identity, manifest, staging);
    }

    public static string CreateInstallationJson(VerifiedStagingManifest staging)
    {
        var manifest = new RuntimeHostInstallationManifest(
            "runtime-host-installation",
            staging.Identity,
            staging.Manifest.Build,
            staging.Manifest.GameDirectory,
            staging.Files.Select(file => new InstalledGameFile(
                file.Entry.RelativePath,
                file.Entry.SizeBytes,
                file.Entry.Sha256)).ToArray());

        return JsonSerializer.Serialize(manifest, OutputJsonOptions)
            .Replace("\r\n", "\n", StringComparison.Ordinal) + "\n";
    }

    public static FileIdentity WriteOrVerifyInstallationManifest(VerifiedStagingManifest staging)
    {
        var path = Path.Combine(staging.Directory, RuntimeHostContract.InstallationManifestFileName);
        var expected = CreateInstallationJson(staging);

        if (File.Exists(path))
        {
            if (!string.Equals(File.ReadAllText(path), expected, StringComparison.Ordinal))
            {
                throw new RuntimeHostConflictException($"Refusing to replace a different installation manifest: {path}");
            }
        }
        else
        {
            using var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None);
            using var writer = new StreamWriter(stream, Utf8WithoutBom, leaveOpen: true);
            writer.Write(expected);
            writer.Flush();
            stream.Flush(flushToDisk: true);
        }

        return FileIdentityFactory.Create(path);
    }

    public static void EnsureGameIsClosed(string executablePath)
    {
        var processName = Path.GetFileNameWithoutExtension(executablePath);
        foreach (var process in Process.GetProcessesByName(processName))
        {
            using (process)
            {
                try
                {
                    if (string.Equals(process.MainModule?.FileName, executablePath, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new RuntimeHostConflictException("The supported game executable is running. Close it before changing the runtime host.");
                    }
                }
                catch (Exception exception) when (exception is System.ComponentModel.Win32Exception or InvalidOperationException or NotSupportedException)
                {
                    throw new RuntimeHostConflictException("Could not verify whether the supported game executable is closed.");
                }
            }
        }
    }

    public static void VerifyRegularFileIdentity(string path, FileIdentity expected, string name)
    {
        var resolved = Path.GetFullPath(path);
        if (!File.Exists(resolved))
        {
            throw new IOException($"{name} does not exist: {resolved}");
        }

        if ((File.GetAttributes(resolved) & FileAttributes.ReparsePoint) != 0)
        {
            throw new InvalidDataException($"{name} must not be a symbolic link or reparse point: {resolved}");
        }

        var actual = FileIdentityFactory.Create(resolved);
        if (actual != expected)
        {
            throw new InvalidDataException($"{name} identity does not match the approved manifest: {resolved}");
        }
    }

    public static bool IsValidSha256(string? value) =>
        value is { Length: 64 } && value.All(character => character is >= '0' and <= '9' or >= 'a' and <= 'f');

    private static void ValidateStagingContract(
        RuntimeHostStagingManifest manifest,
        RuntimeHostPayloadKind payloadKind,
        bool requireCurrentRuntimeHost)
    {
        if (manifest.ArtifactType != "runtime-host-staging" ||
            manifest.Build is null ||
            manifest.RuntimeHost is null ||
            manifest.RuntimeHost.Archive is null ||
            manifest.GameDirectory is null ||
            manifest.ProposedFiles is null ||
            manifest.Build.SteamAppId != RuntimeHostContract.SupportedAppId ||
            string.IsNullOrWhiteSpace(manifest.Build.SteamBuildId) ||
            !manifest.Build.SteamBuildId.All(char.IsAsciiDigit) ||
            manifest.RuntimeHost.Name != "UE4SS" ||
            string.IsNullOrWhiteSpace(manifest.RuntimeHost.Version) ||
            string.IsNullOrWhiteSpace(manifest.GameDirectory.AbsolutePath) ||
            manifest.ProposedFiles.Count != RuntimeHostContract.ProposedFiles.Count ||
            (manifest.Probe is null) == (manifest.Collector is null) ||
            (payloadKind == RuntimeHostPayloadKind.Probe) != (manifest.Probe is not null))
        {
            throw new InvalidDataException("Staging manifest does not match the supported runtime-host contract.");
        }

        if (requireCurrentRuntimeHost &&
            (manifest.RuntimeHost.Version != RuntimeHostContract.Ue4ssVersion ||
             manifest.RuntimeHost.Archive.Sha256 != RuntimeHostContract.Ue4ssArchiveSha256))
        {
            throw new InvalidDataException("Staging manifest does not match the current runtime-host identity.");
        }

        ValidateFileIdentity(manifest.Build.BuildManifest, "Build manifest identity");
        ValidateFileIdentity(manifest.Build.Executable, "Executable identity");
        ValidateFileIdentity(manifest.RuntimeHost.Archive, "Runtime-host archive identity");
        if (manifest.Probe is not null)
        {
            ValidateProbe(manifest.Probe, requireCurrentRuntimeHost);
        }
        else
        {
            ValidateCollector(manifest.Collector!, requireCurrentRuntimeHost);
        }

        for (var index = 0; index < RuntimeHostContract.ProposedFiles.Count; index++)
        {
            var expected = RuntimeHostContract.ProposedFiles[index];
            var actual = manifest.ProposedFiles[index];
            if (actual is null ||
                actual.RelativePath != expected.RelativePath ||
                actual.SourceRelativePath != expected.SourceRelativePath ||
                actual.SizeBytes <= 0 ||
                !IsValidSha256(actual.Sha256))
            {
                throw new InvalidDataException("Staging manifest contains an unsupported proposed file.");
            }
        }
    }

    private static void ValidateProbe(ProbeIdentity probe, bool requireCurrentRuntimeHost)
    {
        if (probe.Source is null ||
            probe.Name != RuntimeHostContract.ProbeName ||
            string.IsNullOrWhiteSpace(probe.Version) ||
            probe.Source.FileName != "main.lua" ||
            probe.DiagnosticRelativePath != RuntimeHostContract.DiagnosticRelativePath)
        {
            throw new InvalidDataException("Staging manifest contains an unsupported probe identity.");
        }

        ValidateFileIdentity(probe.Source, "Probe source identity");
        if (requireCurrentRuntimeHost &&
            (probe.Version != RuntimeHostContract.ProbeVersion ||
             probe.Source.SizeBytes != RuntimeHostContract.ProbeScriptSizeBytes ||
             probe.Source.Sha256 != RuntimeHostContract.ProbeScriptSha256))
        {
            throw new InvalidDataException("Staging manifest does not match the current probe identity.");
        }
    }

    private static void ValidateCollector(CollectorIdentity collector, bool requireCurrentRuntimeHost)
    {
        if (collector.Binary is null ||
            collector.Config is null ||
            collector.ObservationSchema is null ||
            collector.TargetMechanics is null ||
            collector.Name != RuntimeHostContract.CollectorName ||
            collector.Binary.FileName != "main.dll" ||
            collector.Config.FileName != "config.json" ||
            collector.ObservationSchema.FileName != RuntimeHostContract.ObservationSchemaFileName ||
            collector.TargetMechanics.FileName != RuntimeHostContract.TargetMechanicsFileName ||
            collector.TargetMechanics.ArtifactType != RuntimeHostContract.TargetMechanicsArtifactType ||
            string.IsNullOrWhiteSpace(collector.Version) ||
            string.IsNullOrWhiteSpace(collector.ObservationOutputRootAbsolutePath) ||
            !Path.IsPathFullyQualified(collector.ObservationOutputRootAbsolutePath))
        {
            throw new InvalidDataException("Staging manifest contains an unsupported collector identity.");
        }

        ValidateFileIdentity(collector.Binary, "Collector binary identity");
        ValidateFileIdentity(collector.Config, "Collector config identity");
        ValidateFileIdentity(collector.ObservationSchema, "Observation schema identity");
        ValidateFileIdentity(
            new FileIdentity(
                collector.TargetMechanics.FileName,
                collector.TargetMechanics.SizeBytes,
                collector.TargetMechanics.Sha256),
            "Target mechanics identity");

        if (requireCurrentRuntimeHost && collector.Version != RuntimeHostContract.CollectorVersion)
        {
            throw new InvalidDataException("Staging manifest does not match the current collector identity.");
        }
    }

    private static void VerifyPayloadFiles(string stagingDirectory, RuntimeHostStagingManifest manifest)
    {
        if (manifest.Probe is not null)
        {
            var source = ResolveContainedPath(
                stagingDirectory,
                $"mods/{RuntimeHostContract.ProbeName}/Scripts/main.lua",
                "Staged probe source");
            VerifyRegularFileIdentity(source, manifest.Probe.Source, "Staged probe source");
            return;
        }

        var collector = manifest.Collector!;
        var outputRoot = Path.TrimEndingDirectorySeparator(
            Path.GetFullPath(collector.ObservationOutputRootAbsolutePath));
        if (!Directory.Exists(outputRoot) || (File.GetAttributes(outputRoot) & FileAttributes.ReparsePoint) != 0)
        {
            throw new InvalidDataException($"Collector observation output root is unavailable or unsafe: {outputRoot}");
        }

        VerifyRegularFileIdentity(
            ResolveContainedPath(stagingDirectory, RuntimeHostContract.CollectorBinaryRelativePath, "Staged collector binary"),
            collector.Binary,
            "Staged collector binary");
        var configPath = ResolveContainedPath(
            stagingDirectory,
            RuntimeHostContract.CollectorConfigRelativePath,
            "Staged collector config");
        VerifyRegularFileIdentity(configPath, collector.Config, "Staged collector config");
        VerifyCollectorConfig(configPath, manifest, collector);
        VerifyRegularFileIdentity(
            ResolveContainedPath(stagingDirectory, RuntimeHostContract.CollectorSchemaRelativePath, "Staged observation schema"),
            collector.ObservationSchema,
            "Staged observation schema");
        VerifyRegularFileIdentity(
            ResolveContainedPath(stagingDirectory, RuntimeHostContract.CollectorMechanicsRelativePath, "Staged target mechanics"),
            new FileIdentity(
                collector.TargetMechanics.FileName,
                collector.TargetMechanics.SizeBytes,
                collector.TargetMechanics.Sha256),
            "Staged target mechanics");
    }

    private static void VerifyCollectorConfig(
        string path,
        RuntimeHostStagingManifest manifest,
        CollectorIdentity collector)
    {
        var config = JsonSerializer.Deserialize<RuntimeCollectorConfig>(File.ReadAllText(path), InputJsonOptions)
            ?? throw new InvalidDataException("Staged collector config is empty.");
        if (config.ArtifactType != "movie-return-runtime-collector-config" ||
            config.Build is null ||
            config.TargetMechanics is null ||
            config.Collector is null ||
            config.RuntimeHost is null ||
            config.ObservationSchema is null ||
            config.Build.SteamAppId != manifest.Build.SteamAppId ||
            config.Build.SteamBuildId != manifest.Build.SteamBuildId ||
            config.TargetMechanics != collector.TargetMechanics ||
            config.Collector.Name != RuntimeHostContract.CollectorRecordName ||
            config.Collector.Version != collector.Version ||
            config.RuntimeHost.Name != manifest.RuntimeHost.Name ||
            config.RuntimeHost.Version != manifest.RuntimeHost.Version ||
            config.ObservationSchema.FileName != collector.ObservationSchema.FileName ||
            config.ObservationSchema.SizeBytes != collector.ObservationSchema.SizeBytes ||
            config.ObservationSchema.Sha256 != collector.ObservationSchema.Sha256 ||
            config.ObservationSchema.StagedRelativePath != RuntimeHostContract.CollectorSchemaRelativePath ||
            config.ObservationOutputRootAbsolutePath != collector.ObservationOutputRootAbsolutePath)
        {
            throw new InvalidDataException("Staged collector config does not match its staging manifest.");
        }
    }

    private static void ValidateInstallationContract(RuntimeHostInstallationManifest manifest)
    {
        if (manifest.ArtifactType != "runtime-host-installation" ||
            manifest.StagingManifest is null ||
            manifest.Build is null ||
            manifest.GameDirectory is null ||
            manifest.InstalledFiles is null ||
            manifest.InstalledFiles.Count != RuntimeHostContract.ProposedFiles.Count)
        {
            throw new InvalidDataException("Installation manifest does not match the supported runtime-host contract.");
        }

        ValidateFileIdentity(manifest.StagingManifest, "Staging manifest identity");
        if (manifest.StagingManifest.FileName != RuntimeHostContract.StagingManifestFileName)
        {
            throw new InvalidDataException("Installation manifest references an unsupported staging manifest.");
        }

        for (var index = 0; index < RuntimeHostContract.ProposedFiles.Count; index++)
        {
            var installed = manifest.InstalledFiles[index];
            if (installed is null ||
                installed.RelativePath != RuntimeHostContract.ProposedFiles[index].RelativePath ||
                installed.SizeBytes <= 0 ||
                !IsValidSha256(installed.Sha256))
            {
                throw new InvalidDataException("Installation manifest contains an unsupported installed file.");
            }
        }
    }

    private static void ValidateFileIdentity(FileIdentity identity, string name)
    {
        if (identity is null ||
            string.IsNullOrWhiteSpace(identity.FileName) ||
            identity.FileName != Path.GetFileName(identity.FileName) ||
            identity.SizeBytes <= 0 ||
            !IsValidSha256(identity.Sha256))
        {
            throw new InvalidDataException($"{name} is invalid.");
        }
    }

    private static string ResolveExistingRegularFile(string path, string name)
    {
        var resolved = Path.GetFullPath(path);
        if (!File.Exists(resolved))
        {
            throw new IOException($"{name} does not exist: {resolved}");
        }

        if ((File.GetAttributes(resolved) & FileAttributes.ReparsePoint) != 0)
        {
            throw new InvalidDataException($"{name} must not be a symbolic link or reparse point: {resolved}");
        }

        return resolved;
    }

    private static string ResolveGameDirectory(string path)
    {
        var resolved = Path.GetFullPath(path).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var win64 = new DirectoryInfo(resolved);
        if (!win64.Exists ||
            !string.Equals(win64.Name, "Win64", StringComparison.OrdinalIgnoreCase) ||
            win64.Parent is null ||
            !string.Equals(win64.Parent.Name, "Binaries", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidDataException("Manifest game directory is not an existing Binaries\\Win64 directory.");
        }

        return resolved;
    }

    private static string ResolveContainedPath(string root, string portableRelativePath, string name)
    {
        if (portableRelativePath.Contains(':') ||
            portableRelativePath.StartsWith("/", StringComparison.Ordinal) ||
            portableRelativePath.StartsWith("\\", StringComparison.Ordinal))
        {
            throw new InvalidDataException($"{name} path is unsafe: {portableRelativePath}");
        }

        var rootWithSeparator = Path.GetFullPath(root) + Path.DirectorySeparatorChar;
        var resolved = Path.GetFullPath(Path.Combine(root, portableRelativePath.Replace('/', Path.DirectorySeparatorChar)));
        if (!resolved.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidDataException($"{name} path escapes its staging directory: {portableRelativePath}");
        }

        return resolved;
    }
}
