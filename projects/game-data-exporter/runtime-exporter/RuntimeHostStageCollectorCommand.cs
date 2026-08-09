using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace NeonRetroRewind.RuntimeExporter;

internal static class RuntimeHostStageCollectorCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int PreconditionExitCode = 3;
    private const int ConflictExitCode = 4;
    private static readonly UTF8Encoding Utf8WithoutBom = new(false);
    private static readonly JsonSerializerOptions InputJsonOptions = new()
    {
        PropertyNameCaseInsensitive = false,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
    };
    private static readonly JsonSerializerOptions OutputJsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    public static int Run(string[] args)
    {
        if (!StageCollectorOptions.TryParse(args, out var options, out var error))
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

    private static void Stage(StageCollectorOptions options)
    {
        var archivePath = RuntimeHostStageCommand.ResolveExistingFile(options.Ue4ssArchivePath, "UE4SS archive");
        var manifestPath = RuntimeHostStageCommand.ResolveExistingFile(options.BuildManifestPath, "Build manifest");
        var executablePath = RuntimeHostStageCommand.ResolveExistingFile(options.GameExecutablePath, "Game executable");
        var collectorPath = RuntimeHostStageCommand.ResolveExistingFile(options.CollectorDllPath, "Collector DLL");
        var observationSchemaPath = RuntimeHostStageCommand.ResolveExistingFile(options.ObservationSchemaPath, "Observation schema");
        var targetMechanicsPath = RuntimeHostStageCommand.ResolveExistingFile(options.TargetMechanicsPath, "Target mechanics");
        var observationOutputRoot = ResolveExistingDirectory(options.ObservationOutputRootPath, "Observation output root");
        var outputPath = RuntimeHostStageCommand.ResolveNewOutputDirectory(options.OutputPath);
        var gameDirectory = RuntimeHostStageCommand.ValidateGameDirectory(executablePath);

        RuntimeHostStageCommand.EnsureGameIsClosed(executablePath);
        RuntimeHostStageCommand.EnsureTargetsAreAbsent(gameDirectory);

        var manifestIdentity = FileIdentityFactory.Create(manifestPath);
        var buildManifest = RuntimeHostStageCommand.ReadAndValidateBuildManifest(manifestPath);
        RuntimeHostStageCommand.VerifyUnchanged(manifestPath, manifestIdentity, "Build manifest");
        var executableIdentity = FileIdentityFactory.Create(executablePath);
        RuntimeHostStageCommand.ValidateExecutableIdentity(buildManifest, executableIdentity);

        var archiveIdentity = FileIdentityFactory.Create(archivePath);
        if (!string.Equals(archiveIdentity.Sha256, RuntimeHostContract.Ue4ssArchiveSha256, StringComparison.Ordinal))
        {
            throw new InvalidDataException("UE4SS archive SHA-256 does not match the supported runtime host.");
        }

        ValidateInputFileName(collectorPath, "main.dll", "Collector DLL");
        ValidateInputFileName(observationSchemaPath, RuntimeHostContract.ObservationSchemaFileName, "Observation schema");
        ValidateInputFileName(targetMechanicsPath, RuntimeHostContract.TargetMechanicsFileName, "Target mechanics");

        var collectorIdentity = FileIdentityFactory.Create(collectorPath);
        var observationSchemaIdentity = FileIdentityFactory.Create(observationSchemaPath);
        ValidateObservationSchema(observationSchemaPath);
        var targetMechanicsIdentity = ReadAndValidateTargetMechanics(targetMechanicsPath, buildManifest);

        var outputParent = Path.GetDirectoryName(outputPath)!;
        var temporaryPath = Path.Combine(outputParent, $".{Path.GetFileName(outputPath)}.{Environment.ProcessId}.{Guid.NewGuid():N}.tmp");
        Directory.CreateDirectory(temporaryPath);

        try
        {
            RuntimeHostStageCommand.ExtractVerifiedArchive(archivePath, temporaryPath);
            BuildStage(
                temporaryPath,
                outputPath,
                gameDirectory,
                collectorPath,
                observationSchemaPath,
                targetMechanicsPath,
                observationOutputRoot,
                buildManifest,
                manifestIdentity,
                executableIdentity,
                archiveIdentity,
                collectorIdentity,
                observationSchemaIdentity,
                targetMechanicsIdentity);
            RuntimeHostStageCommand.VerifyUnchanged(manifestPath, manifestIdentity, "Build manifest");
            RuntimeHostStageCommand.VerifyUnchanged(executablePath, executableIdentity, "Game executable");
            RuntimeHostStageCommand.VerifyUnchanged(archivePath, archiveIdentity, "UE4SS archive");
            RuntimeHostStageCommand.VerifyUnchanged(collectorPath, collectorIdentity, "Collector DLL");
            RuntimeHostStageCommand.VerifyUnchanged(observationSchemaPath, observationSchemaIdentity, "Observation schema");
            VerifyTargetMechanicsUnchanged(targetMechanicsPath, targetMechanicsIdentity);
            RuntimeHostStageCommand.EnsureGameIsClosed(executablePath);
            RuntimeHostStageCommand.EnsureTargetsAreAbsent(gameDirectory);
            Directory.Move(temporaryPath, outputPath);
        }
        finally
        {
            if (Directory.Exists(temporaryPath))
            {
                Directory.Delete(temporaryPath, recursive: true);
            }
        }

        Console.WriteLine($"Wrote collector runtime-host staging directory: {outputPath}");
        Console.WriteLine($"Review the proposed files in: {Path.Combine(outputPath, RuntimeHostContract.StagingManifestFileName)}");
        Console.WriteLine("No files were copied into the game directory.");
    }

    private static void BuildStage(
        string temporaryPath,
        string finalOutputPath,
        string gameDirectory,
        string collectorPath,
        string observationSchemaPath,
        string targetMechanicsPath,
        string observationOutputRoot,
        BuildManifestInput buildManifest,
        FileIdentity manifestIdentity,
        FileIdentity executableIdentity,
        FileIdentity archiveIdentity,
        FileIdentity collectorIdentity,
        FileIdentity observationSchemaIdentity,
        TargetMechanicsIdentity targetMechanicsIdentity)
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
        var collectorDirectory = Path.Combine(modsDirectory, RuntimeHostContract.CollectorName);
        var collectorDllDirectory = Path.Combine(collectorDirectory, "dlls");
        var inputsDirectory = Path.Combine(temporaryPath, "inputs");
        Directory.CreateDirectory(installDirectory);
        Directory.CreateDirectory(collectorDllDirectory);
        Directory.CreateDirectory(inputsDirectory);

        var stagedProxyPath = Path.Combine(installDirectory, "dwmapi.dll");
        File.Move(extractedProxyPath, stagedProxyPath);

        var stagedCollectorPath = Path.Combine(collectorDllDirectory, "main.dll");
        var stagedSchemaPath = Path.Combine(collectorDirectory, RuntimeHostContract.ObservationSchemaFileName);
        var stagedMechanicsPath = Path.Combine(inputsDirectory, RuntimeHostContract.TargetMechanicsFileName);
        File.Copy(collectorPath, stagedCollectorPath);
        File.Copy(observationSchemaPath, stagedSchemaPath);
        File.Copy(targetMechanicsPath, stagedMechanicsPath);

        var stagedCollectorIdentity = FileIdentityFactory.Create(stagedCollectorPath);
        var stagedSchemaIdentity = FileIdentityFactory.Create(stagedSchemaPath);
        var stagedMechanicsIdentity = FileIdentityFactory.Create(stagedMechanicsPath);
        if (stagedCollectorIdentity != collectorIdentity ||
            stagedSchemaIdentity != observationSchemaIdentity ||
            stagedMechanicsIdentity.FileName != targetMechanicsIdentity.FileName ||
            stagedMechanicsIdentity.SizeBytes != targetMechanicsIdentity.SizeBytes ||
            stagedMechanicsIdentity.Sha256 != targetMechanicsIdentity.Sha256)
        {
            throw new InvalidDataException("A collector input changed while it was copied into staging.");
        }

        var collectorConfig = new RuntimeCollectorConfig(
            "movie-return-runtime-collector-config",
            new RuntimeCollectorBuildIdentity(buildManifest.Steam.AppId, buildManifest.Steam.BuildId),
            targetMechanicsIdentity,
            new RuntimeCollectorIdentity(RuntimeHostContract.CollectorRecordName, RuntimeHostContract.CollectorVersion),
            new RuntimeCollectorHostIdentity("UE4SS", RuntimeHostContract.Ue4ssVersion),
            new RuntimeCollectorSchemaIdentity(
                observationSchemaIdentity.FileName,
                observationSchemaIdentity.SizeBytes,
                observationSchemaIdentity.Sha256,
                RuntimeHostContract.CollectorSchemaRelativePath),
            observationOutputRoot);
        var configJson = JsonSerializer.Serialize(collectorConfig, OutputJsonOptions)
            .Replace("\r\n", "\n", StringComparison.Ordinal) + "\n";
        var configPath = Path.Combine(collectorDirectory, "config.json");
        File.WriteAllText(configPath, configJson, Utf8WithoutBom);
        var configIdentity = FileIdentityFactory.Create(configPath);

        var finalModsDirectory = Path.Combine(finalOutputPath, "mods");
        var finalModsListPath = Path.Combine(finalOutputPath, "mods.txt");
        var finalUe4ssDirectory = Path.Combine(finalOutputPath, "ue4ss");
        File.WriteAllText(Path.Combine(temporaryPath, "mods.txt"), $"{RuntimeHostContract.CollectorName} : 1\n", Utf8WithoutBom);
        IniSettingsEditor.ConfigureForSingleMod(settingsPath, finalModsDirectory, finalModsListPath);

        var overridePath = Path.Combine(installDirectory, "override.txt");
        File.WriteAllText(overridePath, RuntimeHostStageCommand.ToPortablePath(finalUe4ssDirectory) + "\n", Utf8WithoutBom);

        var proposedFiles = new[]
        {
            RuntimeHostStageCommand.CreateProposedFile("dwmapi.dll", "install/dwmapi.dll", stagedProxyPath),
            RuntimeHostStageCommand.CreateProposedFile("override.txt", "install/override.txt", overridePath),
        };

        var stagingManifest = new RuntimeHostStagingManifest(
            "runtime-host-staging",
            new RuntimeBuildIdentity(
                buildManifest.Steam.AppId,
                buildManifest.Steam.BuildId,
                manifestIdentity,
                executableIdentity),
            new RuntimeHostIdentity("UE4SS", RuntimeHostContract.Ue4ssVersion, archiveIdentity),
            null,
            new CollectorIdentity(
                RuntimeHostContract.CollectorName,
                RuntimeHostContract.CollectorVersion,
                collectorIdentity,
                configIdentity,
                observationSchemaIdentity,
                targetMechanicsIdentity,
                observationOutputRoot),
            new GameDirectoryIdentity(gameDirectory),
            proposedFiles);

        var manifestJson = JsonSerializer.Serialize(stagingManifest, OutputJsonOptions)
            .Replace("\r\n", "\n", StringComparison.Ordinal) + "\n";
        File.WriteAllText(Path.Combine(temporaryPath, RuntimeHostContract.StagingManifestFileName), manifestJson, Utf8WithoutBom);
    }

    private static TargetMechanicsIdentity ReadAndValidateTargetMechanics(string path, BuildManifestInput buildManifest)
    {
        var artifact = JsonSerializer.Deserialize<TargetMechanicsInput>(File.ReadAllText(path), InputJsonOptions)
            ?? throw new InvalidDataException("Target mechanics artifact is empty.");
        if (artifact.ArtifactType != RuntimeHostContract.TargetMechanicsArtifactType ||
            artifact.Build is null ||
            artifact.Build.SteamAppId != buildManifest.Steam.AppId ||
            artifact.Build.SteamBuildId != buildManifest.Steam.BuildId ||
            artifact.Scope != "movie-return-readiness-and-selection" ||
            artifact.EvidenceLevel != "decompiled-blueprint" ||
            artifact.RuntimeValidation != "not-run" ||
            artifact.Sources.ValueKind != JsonValueKind.Object ||
            artifact.Readiness.ValueKind != JsonValueKind.Object ||
            artifact.Selection.ValueKind != JsonValueKind.Object)
        {
            throw new InvalidDataException("Target mechanics artifact does not match the staged game build.");
        }

        var identity = FileIdentityFactory.Create(path);
        return new TargetMechanicsIdentity(
            identity.FileName,
            identity.SizeBytes,
            identity.Sha256,
            artifact.ArtifactType);
    }

    private static void ValidateObservationSchema(string path)
    {
        using var document = JsonDocument.Parse(File.ReadAllText(path));
        if (document.RootElement.ValueKind != JsonValueKind.Object ||
            !document.RootElement.TryGetProperty("$id", out var id) ||
            id.GetString() != "urn:neonretrorewind:schema:runtime:movie-return-observation")
        {
            throw new InvalidDataException("Observation schema does not identify the movie-return observation contract.");
        }
    }

    private static void VerifyTargetMechanicsUnchanged(string path, TargetMechanicsIdentity expected)
    {
        var actual = FileIdentityFactory.Create(path);
        if (actual.FileName != expected.FileName || actual.SizeBytes != expected.SizeBytes || actual.Sha256 != expected.Sha256)
        {
            throw new InvalidDataException("Target mechanics changed while the runtime host was being staged.");
        }
    }

    private static void ValidateInputFileName(string path, string expected, string name)
    {
        if (!string.Equals(Path.GetFileName(path), expected, StringComparison.Ordinal))
        {
            throw new InvalidDataException($"{name} must be named {expected}.");
        }
    }

    private static string ResolveExistingDirectory(string path, string name)
    {
        var resolved = Path.TrimEndingDirectorySeparator(Path.GetFullPath(path));
        if (!Directory.Exists(resolved))
        {
            throw new IOException($"{name} does not exist: {resolved}");
        }

        if ((File.GetAttributes(resolved) & FileAttributes.ReparsePoint) != 0)
        {
            throw new InvalidDataException($"{name} must not be a symbolic link or reparse point: {resolved}");
        }

        return resolved;
    }
}
