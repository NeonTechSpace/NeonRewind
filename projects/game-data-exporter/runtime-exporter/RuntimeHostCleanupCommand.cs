namespace NeonRetroRewind.RuntimeExporter;

internal static class RuntimeHostCleanupCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int PreconditionExitCode = 3;
    private const int ConflictExitCode = 4;
    private const int ApprovalRequiredExitCode = 5;

    public static int Run(string[] args)
    {
        if (!CleanupProbeOptions.TryParse(args, out var options, out var error))
        {
            Console.Error.WriteLine(error);
            return InvalidArgumentsExitCode;
        }

        try
        {
            return Cleanup(options!);
        }
        catch (RuntimeHostApprovalRequiredException exception)
        {
            Console.Error.WriteLine(exception.Message);
            return ApprovalRequiredExitCode;
        }
        catch (RuntimeHostConflictException exception)
        {
            Console.Error.WriteLine(exception.Message);
            return ConflictExitCode;
        }
        catch (Exception exception) when (exception is IOException or InvalidDataException or System.Text.Json.JsonException or UnauthorizedAccessException or ArgumentException or NotSupportedException)
        {
            Console.Error.WriteLine(exception.Message);
            return PreconditionExitCode;
        }
    }

    private static int Cleanup(CleanupProbeOptions options)
    {
        var installation = RuntimeHostManifestService.ReadInstallation(options.InstallationManifestPath);
        RuntimeHostManifestService.EnsureGameIsClosed(installation.Staging.ExecutablePath);
        VerifyInstalledTargets(installation);
        WritePreview(installation);

        if (options.ApprovalSha256 is null)
        {
            throw new RuntimeHostApprovalRequiredException(
                "No files were removed. Review the list, then rerun with --approve-installation-sha256 followed by the displayed installation-manifest SHA-256.");
        }

        if (!RuntimeHostManifestService.IsValidSha256(options.ApprovalSha256) ||
            !string.Equals(options.ApprovalSha256, installation.Identity.Sha256, StringComparison.Ordinal))
        {
            throw new RuntimeHostApprovalRequiredException("The supplied installation-manifest approval does not match the reviewed manifest.");
        }

        using var operationLock = RuntimeHostOperationLock.Acquire(installation.Staging.GameDirectory);
        installation = RuntimeHostManifestService.ReadInstallation(installation.Path);
        if (!string.Equals(options.ApprovalSha256, installation.Identity.Sha256, StringComparison.Ordinal))
        {
            throw new RuntimeHostApprovalRequiredException("The installation manifest changed after approval. Review it again before cleanup.");
        }

        RuntimeHostManifestService.EnsureGameIsClosed(installation.Staging.ExecutablePath);
        VerifyInstalledTargets(installation);

        foreach (var relativePath in new[] { "dwmapi.dll", "override.txt" })
        {
            var file = installation.Staging.Files.Single(candidate => candidate.Entry.RelativePath == relativePath);
            RuntimeHostManifestService.EnsureGameIsClosed(installation.Staging.ExecutablePath);
            RuntimeHostManifestService.VerifyRegularFileIdentity(
                installation.Staging.ExecutablePath,
                installation.Staging.Manifest.Build.Executable,
                "Game executable");
            RuntimeHostManifestService.VerifyRegularFileIdentity(
                file.TargetPath,
                ToIdentity(file.Entry),
                $"Installed {file.Entry.RelativePath}");
            File.Delete(file.TargetPath);
            if (File.Exists(file.TargetPath) || Directory.Exists(file.TargetPath))
            {
                throw new IOException($"Cleanup could not remove the approved file: {file.TargetPath}");
            }
        }

        RuntimeHostManifestService.EnsureGameIsClosed(installation.Staging.ExecutablePath);
        RuntimeHostManifestService.VerifyRegularFileIdentity(
            installation.Staging.ExecutablePath,
            installation.Staging.Manifest.Build.Executable,
            "Game executable");
        Console.WriteLine("Removed the two approved runtime-host files from the game directory.");
        Console.WriteLine($"Preserved installation manifest: {installation.Path}");
        return 0;
    }

    private static void VerifyInstalledTargets(VerifiedInstallationManifest installation)
    {
        foreach (var file in installation.Staging.Files)
        {
            RuntimeHostManifestService.VerifyRegularFileIdentity(
                file.TargetPath,
                ToIdentity(file.Entry),
                $"Installed {file.Entry.RelativePath}");
        }
    }

    private static void WritePreview(VerifiedInstallationManifest installation)
    {
        Console.WriteLine("Proposed game-directory removals:");
        foreach (var file in installation.Staging.Files)
        {
            Console.WriteLine($"  REMOVE {file.TargetPath}");
            Console.WriteLine($"         bytes: {file.Entry.SizeBytes}");
            Console.WriteLine($"         sha256: {file.Entry.Sha256}");
        }

        Console.WriteLine($"Installation-manifest SHA-256: {installation.Identity.Sha256}");
    }

    private static FileIdentity ToIdentity(ProposedGameFile file) =>
        new(Path.GetFileName(file.RelativePath), file.SizeBytes, file.Sha256);
}
