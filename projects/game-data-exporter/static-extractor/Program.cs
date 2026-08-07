namespace NeonRewind.StaticExtractor;

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

        if (args is ["manifest", .. var manifestArguments])
        {
            return BuildManifestCommand.Run(manifestArguments);
        }

        if (args is ["census", .. var censusArguments])
        {
            return StaticCensusCommand.Run(censusArguments);
        }

        if (args is [var packageDirectory] &&
            !packageDirectory.StartsWith("-", StringComparison.Ordinal))
        {
            return PackageProbe.Run(packageDirectory);
        }

        Console.Error.WriteLine("Expected a package directory or the manifest command.");
        WriteUsage(Console.Error);
        return InvalidArgumentsExitCode;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage:");
        writer.WriteLine("  NeonRewind.StaticExtractor <package-directory>");
        writer.WriteLine("  NeonRewind.StaticExtractor manifest --steam-manifest <path> --executable <path> --package <path> [--package <path> ...] --output <path>");
        writer.WriteLine("  NeonRewind.StaticExtractor census --build-manifest <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The package probe scans one directory using the configured UE 5.4 profile.");
        writer.WriteLine("The manifest command writes versioned build identity without local paths or Steam account data.");
        writer.WriteLine("The census command writes deterministic file, package, and export-class metadata.");
    }
}
