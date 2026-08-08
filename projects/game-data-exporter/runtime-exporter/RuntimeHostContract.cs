namespace NeonRetroRewind.RuntimeExporter;

internal static class RuntimeHostContract
{
    public const string SupportedAppId = "3552140";
    public const string Ue4ssVersion = "3.0.1-1018-g662df915";
    public const string Ue4ssArchiveSha256 = "caa0f9a6c2ca372c2be5042668b2e86d1cc3bf45fa069a689552314d97f9ee9e";
    public const string ProbeName = "NeonRetroRewindMovieReturnProbe";
    public const string ProbeVersion = "0.0.1";
    public const long ProbeScriptSizeBytes = 13019;
    public const string ProbeScriptSha256 = "f36bdeb8af55d5fb61664da5fd6aaa0f85c7ef3b47bf5e1c7485e47d89965d15";
    public const string DiagnosticRelativePath = "diagnostics/movie-return-compatibility-probe.v1.json";
    public const string StagingManifestFileName = "runtime-host-staging.v1.json";
    public const string InstallationManifestFileName = "runtime-host-installation.v1.json";

    public static readonly IReadOnlyList<(string RelativePath, string SourceRelativePath)> ProposedFiles =
    [
        ("dwmapi.dll", "install/dwmapi.dll"),
        ("override.txt", "install/override.txt"),
    ];
}
