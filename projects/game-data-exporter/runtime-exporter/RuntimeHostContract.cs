namespace NeonRetroRewind.RuntimeExporter;

internal static class RuntimeHostContract
{
    public const string SupportedAppId = "3552140";
    public const string Ue4ssVersion = "3.0.1-1018-g662df915";
    public const string Ue4ssArchiveSha256 = "caa0f9a6c2ca372c2be5042668b2e86d1cc3bf45fa069a689552314d97f9ee9e";
    public const string ProbeName = "NeonRetroRewindMovieReturnProbe";
    public const string ProbeVersion = "0.0.4";
    public const long ProbeScriptSizeBytes = 15068;
    public const string ProbeScriptSha256 = "5c8f29dfe42d5e2f7b8ba866d8df1bfd3c5620101f6253f697e3c1111f20657a";
    public const string DiagnosticRelativePath = "diagnostics/movie-return-compatibility-probe.json";
    public const string StagingManifestFileName = "runtime-host-staging.json";
    public const string InstallationManifestFileName = "runtime-host-installation.json";

    public static readonly IReadOnlyList<(string RelativePath, string SourceRelativePath)> ProposedFiles =
    [
        ("dwmapi.dll", "install/dwmapi.dll"),
        ("override.txt", "install/override.txt"),
    ];
}
