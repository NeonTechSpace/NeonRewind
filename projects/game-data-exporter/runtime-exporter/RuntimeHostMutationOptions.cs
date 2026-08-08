namespace NeonRetroRewind.RuntimeExporter;

internal sealed record InstallProbeOptions(string StagingManifestPath, string? ApprovalSha256)
{
    public static bool TryParse(string[] args, out InstallProbeOptions? options, out string? error)
    {
        options = null;
        if (!NamedOptions.TryParse(
                args,
                ["--staging-manifest"],
                ["--approve-staging-sha256"],
                "install-probe",
                out var values,
                out error))
        {
            return false;
        }

        options = new InstallProbeOptions(
            values!["--staging-manifest"],
            values.GetValueOrDefault("--approve-staging-sha256"));
        return true;
    }
}

internal sealed record CleanupProbeOptions(string InstallationManifestPath, string? ApprovalSha256)
{
    public static bool TryParse(string[] args, out CleanupProbeOptions? options, out string? error)
    {
        options = null;
        if (!NamedOptions.TryParse(
                args,
                ["--installation-manifest"],
                ["--approve-installation-sha256"],
                "cleanup-probe",
                out var values,
                out error))
        {
            return false;
        }

        options = new CleanupProbeOptions(
            values!["--installation-manifest"],
            values.GetValueOrDefault("--approve-installation-sha256"));
        return true;
    }
}

internal static class NamedOptions
{
    public static bool TryParse(
        string[] args,
        IReadOnlyList<string> required,
        IReadOnlyList<string> optional,
        string commandName,
        out Dictionary<string, string>? values,
        out string? error)
    {
        values = null;
        error = null;

        if (args.Length % 2 != 0)
        {
            error = $"{commandName} requires named arguments followed by values.";
            return false;
        }

        var allowed = required.Concat(optional).ToHashSet(StringComparer.Ordinal);
        var parsed = new Dictionary<string, string>(StringComparer.Ordinal);

        for (var index = 0; index < args.Length; index += 2)
        {
            var name = args[index];
            var value = args[index + 1];
            if (!allowed.Contains(name))
            {
                error = $"Unknown argument: {name}";
                return false;
            }

            if (!parsed.TryAdd(name, value) || string.IsNullOrWhiteSpace(value))
            {
                error = $"Argument must appear once with a non-empty value: {name}";
                return false;
            }
        }

        var missing = required.FirstOrDefault(name => !parsed.ContainsKey(name));
        if (missing is not null)
        {
            error = $"{commandName} is missing required argument {missing}.";
            return false;
        }

        values = parsed;
        return true;
    }
}
