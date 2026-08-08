namespace NeonRetroRewind.StaticExtractor;

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

        if (args is ["structured-index", .. var structuredIndexArguments])
        {
            return StructuredAssetIndexCommand.Run(structuredIndexArguments);
        }

        if (args is ["structured-values", .. var structuredValuesArguments])
        {
            return StructuredValuesCommand.Run(structuredValuesArguments);
        }

        if (args is ["rental-evidence", .. var rentalEvidenceArguments])
        {
            return RentalEvidenceCommand.Run(rentalEvidenceArguments);
        }

        if (args is ["rental-blueprint-bodies", .. var rentalBlueprintBodiesArguments])
        {
            return RentalBlueprintBodiesCommand.Run(rentalBlueprintBodiesArguments);
        }

        if (args is ["blueprint-call-sites", .. var blueprintCallSitesArguments])
        {
            return BlueprintCallSitesCommand.Run(blueprintCallSitesArguments);
        }

        if (args is [var packageDirectory] &&
            !packageDirectory.StartsWith("-", StringComparison.Ordinal))
        {
            return PackageProbe.Run(packageDirectory);
        }

        Console.Error.WriteLine("Expected a package directory or command.");
        WriteUsage(Console.Error);
        return InvalidArgumentsExitCode;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage:");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor <package-directory>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor manifest --steam-manifest <path> --executable <path> --package <path> [--package <path> ...] --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor census --build-manifest <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor structured-index --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor structured-values --build-manifest <path> --structured-index <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor rental-evidence --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor rental-blueprint-bodies --build-manifest <path> --rental-evidence <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor blueprint-call-sites --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --target-function <name> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The package probe scans one directory using the configured UE 5.4 profile.");
        writer.WriteLine("The manifest command writes versioned build identity without local paths or Steam account data.");
        writer.WriteLine("The census command writes deterministic file, package, and export-class metadata.");
        writer.WriteLine("The structured-index command validates mapped property deserialization for structured assets.");
        writer.WriteLine("The structured-values command writes normalized DataTable rows and StringTable entries for local use.");
        writer.WriteLine("The rental-evidence command writes mapped class defaults and references for the rental-system package cluster.");
        writer.WriteLine("The rental-blueprint-bodies command writes pseudocode and function metadata for the rental Blueprint classes.");
        writer.WriteLine("The blueprint-call-sites command scans parsed Blueprint bytecode for calls to one exact function name.");
    }
}
