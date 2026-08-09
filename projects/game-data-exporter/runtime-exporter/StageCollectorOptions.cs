namespace NeonRetroRewind.RuntimeExporter;

internal sealed record StageCollectorOptions(
    string Ue4ssArchivePath,
    string BuildManifestPath,
    string GameExecutablePath,
    string CollectorDllPath,
    string ObservationSchemaPath,
    string TargetMechanicsPath,
    string ObservationOutputRootPath,
    string OutputPath)
{
    public static bool TryParse(string[] args, out StageCollectorOptions? options, out string? error)
    {
        options = null;
        if (!NamedOptions.TryParse(
                args,
                [
                    "--ue4ss-archive",
                    "--build-manifest",
                    "--game-executable",
                    "--collector-dll",
                    "--observation-schema",
                    "--target-mechanics",
                    "--observation-output-root",
                    "--output",
                ],
                [],
                "stage-collector",
                out var values,
                out error))
        {
            return false;
        }

        options = new StageCollectorOptions(
            values!["--ue4ss-archive"],
            values["--build-manifest"],
            values["--game-executable"],
            values["--collector-dll"],
            values["--observation-schema"],
            values["--target-mechanics"],
            values["--observation-output-root"],
            values["--output"]);
        return true;
    }
}
