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

        if (args is ["unlockable-evidence", .. var unlockableEvidenceArguments])
        {
            return UnlockableEvidenceCommand.Run(unlockableEvidenceArguments);
        }

        if (args is ["statistic-evidence", .. var statisticEvidenceArguments])
        {
            return StatisticEvidenceCommand.Run(statisticEvidenceArguments);
        }

        if (args is ["unlockable-function-trace", .. var unlockableFunctionTraceArguments])
        {
            return UnlockableFunctionTraceCommand.Run(unlockableFunctionTraceArguments);
        }

        if (args is ["unlockable-implementation-sites", .. var unlockableImplementationSitesArguments])
        {
            return UnlockableImplementationSitesCommand.Run(unlockableImplementationSitesArguments);
        }

        if (args is ["unlockable-manager-trace", .. var unlockableManagerTraceArguments])
        {
            return UnlockableManagerTraceCommand.Run(unlockableManagerTraceArguments);
        }

        if (args is ["rental-blueprint-bodies", .. var rentalBlueprintBodiesArguments])
        {
            return RentalBlueprintBodiesCommand.Run(rentalBlueprintBodiesArguments);
        }

        if (args is ["blueprint-call-sites", .. var blueprintCallSitesArguments])
        {
            return BlueprintCallSitesCommand.Run(blueprintCallSitesArguments);
        }

        if (args is ["blueprint-property-references", .. var blueprintPropertyReferenceArguments])
        {
            return BlueprintPropertyReferencesCommand.Run(blueprintPropertyReferenceArguments);
        }

        if (args is ["blueprint-property-reference-trace", .. var propertyReferenceTraceArguments])
        {
            return BlueprintPropertyReferenceTraceCommand.Run(propertyReferenceTraceArguments);
        }

        if (args is ["blueprint-caller-bodies", .. var blueprintCallerBodiesArguments])
        {
            return BlueprintCallerBodiesCommand.Run(blueprintCallerBodiesArguments);
        }

        if (args is ["blueprint-function-trace", .. var blueprintFunctionTraceArguments])
        {
            return BlueprintFunctionTraceCommand.Run(blueprintFunctionTraceArguments);
        }

        if (args is ["blueprint-call-candidate-trace", .. var blueprintCallCandidateArguments])
        {
            return BlueprintCallCandidateTraceCommand.Run(blueprintCallCandidateArguments);
        }

        if (args is ["blueprint-function-declarations", .. var declarationArguments])
        {
            return BlueprintFunctionDeclarationsCommand.Run(declarationArguments);
        }

        if (args is ["blueprint-call-target-trace", .. var callTargetArguments])
        {
            return BlueprintCallTargetTraceCommand.Run(callTargetArguments);
        }

        if (args is ["rental-function-trace", .. var rentalFunctionTraceArguments])
        {
            return RentalFunctionTraceCommand.Run(rentalFunctionTraceArguments);
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
        writer.WriteLine("  NeonRetroRewind.StaticExtractor unlockable-evidence --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor statistic-evidence --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor unlockable-function-trace --build-manifest <path> --unlockable-evidence <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor unlockable-implementation-sites --build-manifest <path> --static-census <path> --unlockable-evidence <path> --unlockable-function-trace <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor unlockable-manager-trace --build-manifest <path> --unlockable-implementation-sites <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor rental-blueprint-bodies --build-manifest <path> --rental-evidence <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor blueprint-call-sites --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --target-function <name> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor blueprint-property-references --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --target-property <name> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor blueprint-property-reference-trace --build-manifest <path> --property-references <path> --function-path <path> [--function-path <path> ...] --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor blueprint-caller-bodies --build-manifest <path> --call-sites <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor blueprint-function-trace --build-manifest <path> --caller-bodies <path> [--caller-bodies <path> ...] --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor blueprint-call-candidate-trace --build-manifest <path> --source-trace <path> --caller-function-path <path> --statement-index <integer> --expected-call-kind <kind> --expected-call-function <name> --expected-argument-count <integer> --candidate-function-path <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor blueprint-function-declarations --build-manifest <path> --static-census <path> --mappings <path> --package-directory <path> --target-function <name> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor blueprint-call-target-trace --build-manifest <path> --source-trace <path> --declarations <path> --caller-function-path <path> --statement-index <integer> --expected-call-kind <kind> --expected-call-function <name> --expected-argument-count <integer> --target-function-path <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine("  NeonRetroRewind.StaticExtractor rental-function-trace --build-manifest <path> --rental-blueprint-bodies <path> --function-path <path> [--function-path <path> ...] --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The package probe scans one directory using the configured UE 5.4 profile.");
        writer.WriteLine("The manifest command writes build identity without local paths or Steam account data.");
        writer.WriteLine("The census command writes deterministic file, package, and export-class metadata.");
        writer.WriteLine("The structured-index command validates mapped property deserialization for structured assets.");
        writer.WriteLine("The structured-values command writes normalized DataTable rows and StringTable entries for local use.");
        writer.WriteLine("The rental-evidence command writes mapped class defaults and references for the rental-system package cluster.");
        writer.WriteLine("The unlockable-evidence command writes mapped class defaults and references for the unlockable-system package cluster.");
        writer.WriteLine("The statistic-evidence command writes mapped class defaults and references for the statistic package cluster.");
        writer.WriteLine("The unlockable-function-trace command rereads the four unlock eligibility and mutation functions into typed Kismet nodes without parsing pseudocode.");
        writer.WriteLine("The unlockable-implementation-sites command locates unlock-item descendants, overrides, manager event graphs, and calls to the four selected hooks.");
        writer.WriteLine("The unlockable-manager-trace command rereads the discovered manager event graph into typed Kismet nodes without parsing pseudocode.");
        writer.WriteLine("The rental-blueprint-bodies command writes pseudocode and function metadata for the rental Blueprint classes.");
        writer.WriteLine("The blueprint-call-sites command scans parsed Blueprint bytecode for calls to one exact function name.");
        writer.WriteLine("The blueprint-property-references command scans parsed Blueprint bytecode for exact Kismet property-pointer names.");
        writer.WriteLine("The blueprint-property-reference-trace command rereads selected property-reader functions into typed Kismet nodes.");
        writer.WriteLine("The blueprint-caller-bodies command decompiles the exact caller functions recorded by a complete call-site artifact.");
        writer.WriteLine("The blueprint-function-trace command rereads exact caller functions into typed Kismet nodes without parsing pseudocode.");
        writer.WriteLine("The blueprint-call-candidate-trace command compares one recorded call with an explicitly selected same-class candidate without asserting that they are related.");
        writer.WriteLine("The blueprint-function-declarations command scans raw cooked Function exports for one exact object name and records declaration signatures and owner linkage.");
        writer.WriteLine("The blueprint-call-target-trace command verifies an object-constant, scalar object instance-variable, or implicit same-class local-virtual call receiver against one exact declaration and traces the bound function.");
        writer.WriteLine("The rental-function-trace command rereads selected rental functions into typed Kismet nodes without parsing pseudocode.");
    }
}
