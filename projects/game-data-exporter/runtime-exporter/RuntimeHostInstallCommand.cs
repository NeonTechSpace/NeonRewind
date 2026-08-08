namespace NeonRetroRewind.RuntimeExporter;

internal static class RuntimeHostInstallCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int PreconditionExitCode = 3;
    private const int ConflictExitCode = 4;
    private const int ApprovalRequiredExitCode = 5;

    public static int Run(string[] args)
    {
        if (!InstallProbeOptions.TryParse(args, out var options, out var error))
        {
            Console.Error.WriteLine(error);
            return InvalidArgumentsExitCode;
        }

        try
        {
            return Install(options!);
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

    private static int Install(InstallProbeOptions options)
    {
        var staging = RuntimeHostManifestService.ReadStaging(options.StagingManifestPath);
        RuntimeHostManifestService.EnsureGameIsClosed(staging.ExecutablePath);
        WritePreview(staging);

        if (options.ApprovalSha256 is null)
        {
            throw new RuntimeHostApprovalRequiredException(
                "No files were copied. Review the list, then rerun with --approve-staging-sha256 followed by the displayed staging-manifest SHA-256.");
        }

        if (!RuntimeHostManifestService.IsValidSha256(options.ApprovalSha256) ||
            !string.Equals(options.ApprovalSha256, staging.Identity.Sha256, StringComparison.Ordinal))
        {
            throw new RuntimeHostApprovalRequiredException("The supplied staging-manifest approval does not match the reviewed manifest.");
        }

        using var operationLock = RuntimeHostOperationLock.Acquire(staging.GameDirectory);
        staging = RuntimeHostManifestService.ReadStaging(staging.Path);
        if (!string.Equals(options.ApprovalSha256, staging.Identity.Sha256, StringComparison.Ordinal))
        {
            throw new RuntimeHostApprovalRequiredException("The staging manifest changed after approval. Review it again before installation.");
        }

        RuntimeHostManifestService.EnsureGameIsClosed(staging.ExecutablePath);
        EnsureInstallCanStartOrResume(staging);

        var installationIdentity = RuntimeHostManifestService.WriteOrVerifyInstallationManifest(staging);
        var createdTargets = new List<string>();

        try
        {
            foreach (var relativePath in new[] { "override.txt", "dwmapi.dll" })
            {
                var file = staging.Files.Single(candidate => candidate.Entry.RelativePath == relativePath);
                RuntimeHostManifestService.EnsureGameIsClosed(staging.ExecutablePath);
                VerifyStableInputs(staging);

                if (!File.Exists(file.TargetPath))
                {
                    File.Copy(file.SourcePath, file.TargetPath, overwrite: false);
                    createdTargets.Add(file.TargetPath);
                }

                RuntimeHostManifestService.VerifyRegularFileIdentity(
                    file.TargetPath,
                    ToIdentity(file.Entry),
                    $"Installed {file.Entry.RelativePath}");
            }

            RuntimeHostManifestService.EnsureGameIsClosed(staging.ExecutablePath);
            VerifyStableInputs(staging);
            VerifyAllTargets(staging);
        }
        catch
        {
            RollBackCreatedTargets(staging, createdTargets);
            throw;
        }

        Console.WriteLine("Installed the approved runtime-host files.");
        Console.WriteLine($"Installation manifest: {Path.Combine(staging.Directory, RuntimeHostContract.InstallationManifestFileName)}");
        Console.WriteLine($"Installation-manifest SHA-256: {installationIdentity.Sha256}");
        Console.WriteLine("The tooling did not launch the game or Steam.");
        return 0;
    }

    private static void WritePreview(VerifiedStagingManifest staging)
    {
        Console.WriteLine("Proposed game-directory copies:");
        foreach (var file in staging.Files)
        {
            Console.WriteLine($"  ADD {file.TargetPath}");
            Console.WriteLine($"      source: {file.SourcePath}");
            Console.WriteLine($"      bytes: {file.Entry.SizeBytes}");
            Console.WriteLine($"      sha256: {file.Entry.Sha256}");
        }

        Console.WriteLine($"Staging-manifest SHA-256: {staging.Identity.Sha256}");
    }

    private static void EnsureInstallCanStartOrResume(VerifiedStagingManifest staging)
    {
        var installationPath = Path.Combine(staging.Directory, RuntimeHostContract.InstallationManifestFileName);
        if (!File.Exists(installationPath))
        {
            var existing = staging.Files.FirstOrDefault(file => File.Exists(file.TargetPath) || Directory.Exists(file.TargetPath));
            if (existing is not null)
            {
                throw new RuntimeHostConflictException($"Proposed game-directory target already exists: {existing.TargetPath}");
            }

            return;
        }

        var expected = RuntimeHostManifestService.CreateInstallationJson(staging);
        if (!string.Equals(File.ReadAllText(installationPath), expected, StringComparison.Ordinal))
        {
            throw new RuntimeHostConflictException($"A different installation manifest already exists: {installationPath}");
        }

        foreach (var file in staging.Files.Where(file => File.Exists(file.TargetPath)))
        {
            RuntimeHostManifestService.VerifyRegularFileIdentity(
                file.TargetPath,
                ToIdentity(file.Entry),
                $"Existing installed {file.Entry.RelativePath}");
        }

        var directoryTarget = staging.Files.FirstOrDefault(file => Directory.Exists(file.TargetPath));
        if (directoryTarget is not null)
        {
            throw new RuntimeHostConflictException($"Installed-file target is a directory: {directoryTarget.TargetPath}");
        }
    }

    private static void VerifyAllTargets(VerifiedStagingManifest staging)
    {
        foreach (var file in staging.Files)
        {
            RuntimeHostManifestService.VerifyRegularFileIdentity(
                file.TargetPath,
                ToIdentity(file.Entry),
                $"Installed {file.Entry.RelativePath}");
        }
    }

    private static void RollBackCreatedTargets(VerifiedStagingManifest staging, IReadOnlyList<string> createdTargets)
    {
        foreach (var target in createdTargets.Reverse())
        {
            try
            {
                RuntimeHostManifestService.EnsureGameIsClosed(staging.ExecutablePath);
                if (File.Exists(target))
                {
                    var file = staging.Files.Single(candidate => candidate.TargetPath == target);
                    RuntimeHostManifestService.VerifyRegularFileIdentity(
                        target,
                        ToIdentity(file.Entry),
                        $"Rollback target {file.Entry.RelativePath}");
                    File.Delete(target);
                }
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or InvalidDataException)
            {
                Console.Error.WriteLine($"Automatic rollback could not remove {target}: {exception.Message}");
            }
        }
    }

    private static void VerifyStableInputs(VerifiedStagingManifest staging)
    {
        RuntimeHostManifestService.VerifyRegularFileIdentity(staging.Path, staging.Identity, "Staging manifest");
        RuntimeHostManifestService.VerifyRegularFileIdentity(
            staging.ExecutablePath,
            staging.Manifest.Build.Executable,
            "Game executable");

        foreach (var file in staging.Files)
        {
            RuntimeHostManifestService.VerifyRegularFileIdentity(
                file.SourcePath,
                ToIdentity(file.Entry),
                $"Staged source {file.Entry.SourceRelativePath}");
        }
    }

    private static FileIdentity ToIdentity(ProposedGameFile file) =>
        new(Path.GetFileName(file.RelativePath), file.SizeBytes, file.Sha256);
}
