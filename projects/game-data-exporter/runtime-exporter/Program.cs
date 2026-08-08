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

        Console.Error.WriteLine("Expected the stage-probe command.");
        WriteUsage(Console.Error);
        return InvalidArgumentsExitCode;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage:");
        writer.WriteLine("  NeonRetroRewind.RuntimeExporter stage-probe --ue4ss-archive <path> --build-manifest <path> --game-executable <path> --probe-script <path> --output <new-directory>");
        writer.WriteLine();
        writer.WriteLine("The command verifies the supported build and UE4SS archive, then creates an ignored local staging directory.");
        writer.WriteLine("It does not copy files into the game directory, launch programs, change Steam, or send input.");
    }
}
