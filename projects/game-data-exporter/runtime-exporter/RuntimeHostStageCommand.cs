using System.Diagnostics;
using System.IO.Compression;
using System.Text;
using System.Text.Json;

namespace NeonRetroRewind.RuntimeExporter;

internal static class RuntimeHostStageCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int PreconditionExitCode = 3;
    private const int ConflictExitCode = 4;
    private static readonly UTF8Encoding Utf8WithoutBom = new(false);
    private static readonly JsonSerializerOptions InputJsonOptions = new()
    {
        PropertyNameCaseInsensitive = false,
    };
    private static readonly JsonSerializerOptions OutputJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    public static int Run(string[] args)
    {
        if (!StageProbeOptions.TryParse(args, out var options, out var error))
        {
            Console.Error.WriteLine(error);
            return InvalidArgumentsExitCode;
        }

        try
        {
            Stage(options!);
            return 0;
        }
        catch (RuntimeHostConflictException exception)
        {
            Console.Error.WriteLine(exception.Message);
            return ConflictExitCode;
        }
        catch (Exception exception) when (exception is IOException or InvalidDataException or JsonException or UnauthorizedAccessException or ArgumentException or NotSupportedException)
        {
            Console.Error.WriteLine(exception.Message);
            return PreconditionExitCode;
        }
    }

    private static void Stage(StageProbeOptions options)
    {
        var archivePath = ResolveExistingFile(options.Ue4ssArchivePath, "UE4SS archive");
        var manifestPath = ResolveExistingFile(options.BuildManifestPath, "Build manifest");
        var executablePath = ResolveExistingFile(options.GameExecutablePath, "Game executable");
        var probeScriptPath = ResolveExistingFile(options.ProbeScriptPath, "Probe script");
        var outputPath = ResolveNewOutputDirectory(options.OutputPath);
        var gameDirectory = ValidateGameDirectory(executablePath);

        EnsureGameIsClosed(executablePath);
        EnsureTargetsAreAbsent(gameDirectory);

        var manifestIdentity = FileIdentityFactory.Create(manifestPath);
        var buildManifest = ReadAndValidateBuildManifest(manifestPath);
        VerifyUnchanged(manifestPath, manifestIdentity, "Build manifest");
        var executableIdentity = FileIdentityFactory.Create(executablePath);
        ValidateExecutableIdentity(buildManifest, executableIdentity);

        var archiveIdentity = FileIdentityFactory.Create(archivePath);
        if (!string.Equals(archiveIdentity.Sha256, RuntimeHostContract.Ue4ssArchiveSha256, StringComparison.Ordinal))
        {
            throw new InvalidDataException("UE4SS archive SHA-256 does not match the supported runtime host.");
        }

        if (!string.Equals(Path.GetFileName(probeScriptPath), "main.lua", StringComparison.Ordinal))
        {
            throw new InvalidDataException("Probe script must be named main.lua.");
        }

        var probeIdentity = FileIdentityFactory.Create(probeScriptPath);
        if (!string.Equals(probeIdentity.Sha256, RuntimeHostContract.ProbeScriptSha256, StringComparison.Ordinal))
        {
            throw new InvalidDataException("Probe script SHA-256 does not match the runtime exporter version.");
        }

        var outputParent = Path.GetDirectoryName(outputPath)!;
        var temporaryPath = Path.Combine(outputParent, $".{Path.GetFileName(outputPath)}.{Environment.ProcessId}.{Guid.NewGuid():N}.tmp");
        Directory.CreateDirectory(temporaryPath);

        try
        {
            ExtractVerifiedArchive(archivePath, temporaryPath);
            BuildStage(
                temporaryPath,
                outputPath,
                gameDirectory,
                probeScriptPath,
                buildManifest,
                manifestIdentity,
                executableIdentity,
                archiveIdentity,
                probeIdentity);
            VerifyUnchanged(manifestPath, manifestIdentity, "Build manifest");
            VerifyUnchanged(executablePath, executableIdentity, "Game executable");
            VerifyUnchanged(archivePath, archiveIdentity, "UE4SS archive");
            VerifyUnchanged(probeScriptPath, probeIdentity, "Probe script");
            EnsureGameIsClosed(executablePath);
            EnsureTargetsAreAbsent(gameDirectory);
            Directory.Move(temporaryPath, outputPath);
        }
        finally
        {
            if (Directory.Exists(temporaryPath))
            {
                Directory.Delete(temporaryPath, recursive: true);
            }
        }

        Console.WriteLine($"Wrote runtime-host staging directory: {outputPath}");
        Console.WriteLine($"Review the proposed files in: {Path.Combine(outputPath, "runtime-host-staging.v1.json")}");
        Console.WriteLine("No files were copied into the game directory.");
    }

    private static void BuildStage(
        string temporaryPath,
        string finalOutputPath,
        string gameDirectory,
        string probeScriptPath,
        BuildManifestInput buildManifest,
        FileIdentity manifestIdentity,
        FileIdentity executableIdentity,
        FileIdentity archiveIdentity,
        FileIdentity probeIdentity)
    {
        var ue4ssDirectory = Path.Combine(temporaryPath, "ue4ss");
        var ue4ssDllPath = Path.Combine(ue4ssDirectory, "UE4SS.dll");
        var settingsPath = Path.Combine(ue4ssDirectory, "UE4SS-settings.ini");
        var extractedProxyPath = Path.Combine(temporaryPath, "dwmapi.dll");

        foreach (var requiredPath in new[] { ue4ssDllPath, settingsPath, extractedProxyPath })
        {
            if (!File.Exists(requiredPath))
            {
                throw new InvalidDataException($"UE4SS archive is missing required entry: {Path.GetFileName(requiredPath)}");
            }
        }

        var installDirectory = Path.Combine(temporaryPath, "install");
        var modsDirectory = Path.Combine(temporaryPath, "mods");
        var probeDirectory = Path.Combine(modsDirectory, RuntimeHostContract.ProbeName, "Scripts");
        var diagnosticsDirectory = Path.Combine(temporaryPath, "diagnostics");
        Directory.CreateDirectory(installDirectory);
        Directory.CreateDirectory(probeDirectory);
        Directory.CreateDirectory(diagnosticsDirectory);

        var stagedProxyPath = Path.Combine(installDirectory, "dwmapi.dll");
        File.Move(extractedProxyPath, stagedProxyPath);

        var stagedProbePath = Path.Combine(probeDirectory, "main.lua");
        File.Copy(probeScriptPath, stagedProbePath);

        var finalModsDirectory = Path.Combine(finalOutputPath, "mods");
        var finalModsListPath = Path.Combine(finalOutputPath, "mods.txt");
        var finalDiagnosticPath = Path.Combine(
            finalOutputPath,
            RuntimeHostContract.DiagnosticRelativePath.Replace('/', Path.DirectorySeparatorChar));
        var finalUe4ssDirectory = Path.Combine(finalOutputPath, "ue4ss");

        File.WriteAllText(
            Path.Combine(probeDirectory, "config.lua"),
            CreateProbeConfig(buildManifest, finalDiagnosticPath),
            Utf8WithoutBom);
        File.WriteAllText(Path.Combine(temporaryPath, "mods.txt"), $"{RuntimeHostContract.ProbeName} : 1\n", Utf8WithoutBom);
        IniSettingsEditor.ConfigureForProbe(settingsPath, finalModsDirectory, finalModsListPath);

        var overridePath = Path.Combine(installDirectory, "override.txt");
        File.WriteAllText(overridePath, ToPortablePath(finalUe4ssDirectory) + "\n", Utf8WithoutBom);

        var proposedFiles = new[]
        {
            CreateProposedFile("dwmapi.dll", "install/dwmapi.dll", stagedProxyPath),
            CreateProposedFile("override.txt", "install/override.txt", overridePath),
        };

        var stagingManifest = new RuntimeHostStagingManifest(
            "runtime-host-staging",
            1,
            new RuntimeBuildIdentity(
                buildManifest.Steam.AppId,
                buildManifest.Steam.BuildId,
                manifestIdentity,
                executableIdentity),
            new RuntimeHostIdentity("UE4SS", RuntimeHostContract.Ue4ssVersion, archiveIdentity),
            new ProbeIdentity(
                RuntimeHostContract.ProbeName,
                RuntimeHostContract.ProbeVersion,
                probeIdentity,
                RuntimeHostContract.DiagnosticRelativePath),
            new GameDirectoryIdentity(gameDirectory),
            proposedFiles);

        var manifestJson = JsonSerializer.Serialize(stagingManifest, OutputJsonOptions)
            .Replace("\r\n", "\n", StringComparison.Ordinal) + "\n";
        File.WriteAllText(Path.Combine(temporaryPath, RuntimeHostContract.StagingManifestFileName), manifestJson, Utf8WithoutBom);
    }

    private static BuildManifestInput ReadAndValidateBuildManifest(string path)
    {
        var manifest = JsonSerializer.Deserialize<BuildManifestInput>(File.ReadAllText(path), InputJsonOptions)
            ?? throw new InvalidDataException("Build manifest is empty.");

        if (manifest.ArtifactType != "build-manifest" ||
            manifest.SchemaVersion != 1 ||
            manifest.Steam is null ||
            manifest.Executable is null ||
            manifest.Engine is null ||
            manifest.Steam.AppId != RuntimeHostContract.SupportedAppId ||
            string.IsNullOrWhiteSpace(manifest.Steam.BuildId) ||
            manifest.Steam.BuildId.Any(character => character is < '0' or > '9') ||
            manifest.Engine.Version != "5.4")
        {
            throw new InvalidDataException("Build manifest does not identify the supported game build and engine.");
        }

        return manifest;
    }

    private static void ValidateExecutableIdentity(BuildManifestInput manifest, FileIdentity actual)
    {
        if (string.IsNullOrWhiteSpace(manifest.Executable.FileName) ||
            Path.GetFileName(manifest.Executable.FileName) != manifest.Executable.FileName ||
            manifest.Executable.SizeBytes <= 0 ||
            string.IsNullOrEmpty(manifest.Executable.Sha256) ||
            manifest.Executable.Sha256.Length != 64 ||
            manifest.Executable.Sha256.Any(character => character is not (>= '0' and <= '9') and not (>= 'a' and <= 'f')) ||
            actual.FileName != manifest.Executable.FileName ||
            actual.SizeBytes != manifest.Executable.SizeBytes ||
            actual.Sha256 != manifest.Executable.Sha256)
        {
            throw new InvalidDataException("Game executable identity does not match the supported build manifest.");
        }
    }

    private static void ExtractVerifiedArchive(string archivePath, string destinationRoot)
    {
        using var archive = ZipFile.OpenRead(archivePath);
        var destinations = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var proxyCount = 0;

        foreach (var entry in archive.Entries)
        {
            var relativePath = entry.FullName.Replace('\\', '/');
            if (relativePath.Length == 0)
            {
                continue;
            }

            var isDirectory = relativePath.EndsWith("/", StringComparison.Ordinal);
            if (!isDirectory && relativePath != "dwmapi.dll" && !relativePath.StartsWith("ue4ss/", StringComparison.Ordinal))
            {
                throw new InvalidDataException($"UE4SS archive contains an unexpected file: {relativePath}");
            }

            var destinationPath = ResolveArchiveDestination(destinationRoot, relativePath);
            if (!destinations.Add(destinationPath))
            {
                throw new InvalidDataException($"UE4SS archive contains a duplicate path: {relativePath}");
            }

            if (isDirectory)
            {
                Directory.CreateDirectory(destinationPath);
                continue;
            }

            if (relativePath == "dwmapi.dll")
            {
                proxyCount++;
            }

            Directory.CreateDirectory(Path.GetDirectoryName(destinationPath)!);
            entry.ExtractToFile(destinationPath);
        }

        if (proxyCount != 1)
        {
            throw new InvalidDataException("UE4SS archive must contain exactly one root dwmapi.dll.");
        }
    }

    private static string ResolveArchiveDestination(string destinationRoot, string relativePath)
    {
        if (relativePath.Contains(':') || relativePath.StartsWith("/", StringComparison.Ordinal))
        {
            throw new InvalidDataException($"UE4SS archive contains an unsafe path: {relativePath}");
        }

        var rootWithSeparator = Path.GetFullPath(destinationRoot) + Path.DirectorySeparatorChar;
        var destinationPath = Path.GetFullPath(Path.Combine(destinationRoot, relativePath.Replace('/', Path.DirectorySeparatorChar)));
        if (!destinationPath.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidDataException($"UE4SS archive contains a path outside its staging directory: {relativePath}");
        }

        return destinationPath;
    }

    private static ProposedGameFile CreateProposedFile(string relativePath, string sourceRelativePath, string sourcePath)
    {
        var identity = FileIdentityFactory.Create(sourcePath);
        return new ProposedGameFile(relativePath, sourceRelativePath, identity.SizeBytes, identity.Sha256);
    }

    private static void VerifyUnchanged(string path, FileIdentity expected, string name)
    {
        var actual = FileIdentityFactory.Create(path);
        if (actual != expected)
        {
            throw new InvalidDataException($"{name} changed while the runtime host was being staged.");
        }
    }

    private static string CreateProbeConfig(BuildManifestInput manifest, string diagnosticPath) =>
        "return {\n" +
        $"    steam_app_id = {ToLuaString(manifest.Steam.AppId)},\n" +
        $"    steam_build_id = {ToLuaString(manifest.Steam.BuildId)},\n" +
        $"    probe_name = {ToLuaString(RuntimeHostContract.ProbeName)},\n" +
        $"    probe_version = {ToLuaString(RuntimeHostContract.ProbeVersion)},\n" +
        $"    output_path = {ToLuaString(ToPortablePath(diagnosticPath))},\n" +
        "}\n";

    private static string ToLuaString(string value) =>
        "\"" + value.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("\"", "\\\"", StringComparison.Ordinal) + "\"";

    private static string ToPortablePath(string path) =>
        Path.GetFullPath(path).Replace('\\', '/');

    private static string ResolveExistingFile(string path, string name)
    {
        var resolved = Path.GetFullPath(path);
        if (!File.Exists(resolved))
        {
            throw new IOException($"{name} does not exist: {resolved}");
        }

        return resolved;
    }

    private static string ResolveNewOutputDirectory(string path)
    {
        var resolved = Path.GetFullPath(path).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var parent = Path.GetDirectoryName(resolved);

        if (string.IsNullOrEmpty(parent) || !Directory.Exists(parent))
        {
            throw new IOException($"Staging parent directory does not exist: {parent}");
        }

        if (Directory.Exists(resolved) || File.Exists(resolved))
        {
            throw new RuntimeHostConflictException($"Refusing to replace an existing staging path: {resolved}");
        }

        return resolved;
    }

    private static string ValidateGameDirectory(string executablePath)
    {
        var win64Directory = Directory.GetParent(executablePath)
            ?? throw new InvalidDataException("Game executable has no parent directory.");
        var binariesDirectory = win64Directory.Parent;

        if (!string.Equals(win64Directory.Name, "Win64", StringComparison.OrdinalIgnoreCase) ||
            binariesDirectory is null ||
            !string.Equals(binariesDirectory.Name, "Binaries", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidDataException("Game executable is not in the expected Binaries\\Win64 directory.");
        }

        return win64Directory.FullName;
    }

    private static void EnsureTargetsAreAbsent(string gameDirectory)
    {
        foreach (var relativePath in new[] { "dwmapi.dll", "override.txt" })
        {
            var target = Path.Combine(gameDirectory, relativePath);
            if (File.Exists(target) || Directory.Exists(target))
            {
                throw new RuntimeHostConflictException($"Proposed game-directory target already exists: {target}");
            }
        }
    }

    private static void EnsureGameIsClosed(string executablePath)
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
                        throw new RuntimeHostConflictException("The supported game executable is running. Close it before staging the runtime host.");
                    }
                }
                catch (Exception exception) when (exception is System.ComponentModel.Win32Exception or InvalidOperationException or NotSupportedException)
                {
                    throw new RuntimeHostConflictException("Could not verify whether the supported game executable is closed.");
                }
            }
        }
    }

}
