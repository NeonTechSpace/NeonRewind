namespace NeonRetroRewind.RuntimeExporter;

internal sealed record StageProbeOptions(
    string Ue4ssArchivePath,
    string BuildManifestPath,
    string GameExecutablePath,
    string ProbeScriptPath,
    string OutputPath)
{
    private static readonly string[] RequiredArguments =
    [
        "--ue4ss-archive",
        "--build-manifest",
        "--game-executable",
        "--probe-script",
        "--output",
    ];

    public static bool TryParse(string[] args, out StageProbeOptions? options, out string? error)
    {
        options = null;
        error = null;

        if (args.Length != RequiredArguments.Length * 2)
        {
            error = "stage-probe requires exactly five named path arguments.";
            return false;
        }

        var values = new Dictionary<string, string>(StringComparer.Ordinal);

        for (var index = 0; index < args.Length; index += 2)
        {
            var name = args[index];
            var value = args[index + 1];

            if (!RequiredArguments.Contains(name, StringComparer.Ordinal))
            {
                error = $"Unknown argument: {name}";
                return false;
            }

            if (!values.TryAdd(name, value) || string.IsNullOrWhiteSpace(value))
            {
                error = $"Argument must appear once with a non-empty value: {name}";
                return false;
            }
        }

        if (RequiredArguments.Any(required => !values.ContainsKey(required)))
        {
            error = "stage-probe is missing a required argument.";
            return false;
        }

        options = new StageProbeOptions(
            values["--ue4ss-archive"],
            values["--build-manifest"],
            values["--game-executable"],
            values["--probe-script"],
            values["--output"]);
        return true;
    }
}
