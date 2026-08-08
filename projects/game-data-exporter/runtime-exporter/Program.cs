namespace NeonRetroRewind.RuntimeExporter;

internal static class Program
{
    private const int InvalidArgumentsExitCode = 2;

    public static int Main(string[] args)
    {
        if (args is ["--help"] or ["-h"])
        {
            WriteUsage(Console.Out);
            return 0;
        }

        if (args is ["stage-probe", .. var stageArguments])
        {
            return RuntimeHostStageCommand.Run(stageArguments);
        }

        if (args is ["install-probe", .. var installArguments])
        {
            return RuntimeHostInstallCommand.Run(installArguments);
        }

        if (args is ["cleanup-probe", .. var cleanupArguments])
        {
            return RuntimeHostCleanupCommand.Run(cleanupArguments);
        }

        Console.Error.WriteLine("Expected the stage-probe, install-probe, or cleanup-probe command.");
        WriteUsage(Console.Error);
        return InvalidArgumentsExitCode;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage:");
        writer.WriteLine("  NeonRetroRewind.RuntimeExporter stage-probe --ue4ss-archive <path> --build-manifest <path> --game-executable <path> --probe-script <path> --output <new-directory>");
        writer.WriteLine("  NeonRetroRewind.RuntimeExporter install-probe --staging-manifest <path> [--approve-staging-sha256 <sha256>]");
        writer.WriteLine("  NeonRetroRewind.RuntimeExporter cleanup-probe --installation-manifest <path> [--approve-installation-sha256 <sha256>]");
        writer.WriteLine();
        writer.WriteLine("Run install-probe or cleanup-probe without an approval hash to preview the exact file list.");
        writer.WriteLine("The commands never launch programs, change Steam, move focus, or send input.");
    }
}
