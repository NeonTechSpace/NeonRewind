using System.Text.Json;

namespace NeonRetroRewind.StaticExtractor;

internal static class UnlockableImplementationSitesCommand
{
    private const int InvalidArgumentsExitCode = 2;
    private const int InputFailureExitCode = 6;
    private const int OutputConflictExitCode = 7;
    private const int ParseFailuresExitCode = 8;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    public static int Run(string[] args)
    {
        if (args is ["--help"] or ["-h"])
        {
            WriteUsage(Console.Out);
            return 0;
        }

        if (!TryParseArguments(args, out var options, out var argumentError))
        {
            Console.Error.WriteLine(argumentError);
            WriteUsage(Console.Error);
            return InvalidArgumentsExitCode;
        }

        try
        {
            var manifest = AcquisitionValidator.ReadJson<BuildManifest>(
                options.BuildManifestPath,
                "build manifest");
            AcquisitionValidator.ValidateManifest(manifest);
            var census = AcquisitionValidator.ReadJson<StaticCensus>(
                options.StaticCensusPath,
                "static census");
            var evidence = AcquisitionValidator.ReadJson<UnlockableEvidence>(
                options.UnlockableEvidencePath,
                "unlockable evidence");
            var trace = AcquisitionValidator.ReadJson<UnlockableFunctionTrace>(
                options.UnlockableFunctionTracePath,
                "unlockable function trace");
            var manifestIdentity = FileIdentityFactory.Create(options.BuildManifestPath);
            var censusIdentity = FileIdentityFactory.Create(options.StaticCensusPath);
            var evidenceIdentity = FileIdentityFactory.Create(options.UnlockableEvidencePath);
            var traceIdentity = FileIdentityFactory.Create(options.UnlockableFunctionTracePath);
            var mappingIdentity = AcquisitionValidator.ReadMappingIdentity(options.MappingsPath);

            UnlockableArtifactValidator.ValidateCensus(
                census,
                manifest,
                manifestIdentity.Sha256);
            UnlockableArtifactValidator.ValidateEvidence(
                evidence,
                manifest,
                manifestIdentity.Sha256,
                mappingIdentity);
            UnlockableArtifactValidator.ValidateTrace(
                trace,
                manifest,
                manifestIdentity.Sha256,
                mappingIdentity,
                evidenceIdentity);
            ValidateCensusIdentity(evidence, censusIdentity);
            var packagePaths = AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory);

            var scan = UnlockableImplementationSiteScanner.Scan(
                census,
                options.MappingsPath,
                options.PackageDirectory);
            var artifact = CreateArtifact(
                manifest,
                manifestIdentity.Sha256,
                censusIdentity,
                evidenceIdentity,
                traceIdentity,
                mappingIdentity,
                scan);

            AcquisitionValidator.VerifyPackageFiles(
                manifest,
                options.PackageDirectory,
                packagePaths);
            AcquisitionValidator.VerifyUnchanged(
                options.BuildManifestPath,
                manifestIdentity,
                "Build manifest");
            AcquisitionValidator.VerifyUnchanged(
                options.StaticCensusPath,
                censusIdentity,
                "Static census");
            AcquisitionValidator.VerifyUnchanged(
                options.UnlockableEvidencePath,
                evidenceIdentity,
                "Unlockable evidence");
            AcquisitionValidator.VerifyUnchanged(
                options.UnlockableFunctionTracePath,
                traceIdentity,
                "Unlockable function trace");
            AcquisitionValidator.VerifyUnchanged(
                options.MappingsPath,
                mappingIdentity,
                "Mappings");

            var json = JsonSerializer.Serialize(artifact, JsonOptions) + "\n";
            var writeStatus = ImmutableArtifactWriter.Write(
                options.OutputPath,
                json,
                "Unlockable implementation sites");
            if (writeStatus == ArtifactWriteStatus.Conflict)
            {
                return OutputConflictExitCode;
            }

            return scan.Failures.Count > 0 ? ParseFailuresExitCode : 0;
        }
        catch (IOException exception)
        {
            Console.Error.WriteLine($"Unlockable-implementation-sites operation failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (InvalidDataException exception)
        {
            Console.Error.WriteLine($"Unlockable-implementation-sites input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (JsonException exception)
        {
            Console.Error.WriteLine($"Unlockable-implementation-sites input failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (UnauthorizedAccessException exception)
        {
            Console.Error.WriteLine($"Unlockable-implementation-sites access failed: {exception.Message}");
            return InputFailureExitCode;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            Console.Error.WriteLine(
                $"Unlockable-implementation-sites extraction failed ({exception.GetType().Name}).");
            return InputFailureExitCode;
        }
    }

    private static UnlockableImplementationSites CreateArtifact(
        BuildManifest manifest,
        string manifestSha256,
        FileIdentity censusIdentity,
        FileIdentity evidenceIdentity,
        FileIdentity traceIdentity,
        MappingIdentity mappings,
        UnlockableImplementationSiteScanner.UnlockableImplementationScan scan)
    {
        var functionCount = scan.Classes.Sum(class_ => class_.Functions.Count);
        return new UnlockableImplementationSites(
            ArtifactType: "unlockable-implementation-sites",
            Build: new CensusBuildReference(
                manifestSha256,
                manifest.Steam.AppId,
                manifest.Steam.BuildId),
            StaticCensus: new StaticCensusInput(
                censusIdentity.FileName,
                censusIdentity.SizeBytes,
                censusIdentity.Sha256),
            UnlockableEvidence: new UnlockableEvidenceInput(
                evidenceIdentity.FileName,
                evidenceIdentity.SizeBytes,
                evidenceIdentity.Sha256),
            UnlockableFunctionTrace: new UnlockableEvidenceInput(
                traceIdentity.FileName,
                traceIdentity.SizeBytes,
                traceIdentity.Sha256),
            Mappings: mappings,
            Engine: manifest.Engine,
            Extractor: new ExtractorIdentity(
                "NeonRetroRewind.StaticExtractor",
                AcquisitionValidator.ReadAssemblyMetadata("ExtractorVersion"),
                AcquisitionValidator.ReadAssemblyMetadata("Cue4ParsePackageVersion")),
            BaseClassPath: UnlockableImplementationSiteScanner.BaseClassPath,
            TargetFunctionNames: UnlockableImplementationSiteScanner.TargetFunctionNames,
            CandidateRule: UnlockableImplementationSiteScanner.CandidateRule,
            Coverage: scan.Failures.Count == 0 ? "complete" : "partial",
            Totals: new UnlockableImplementationSiteTotals(
                scan.CandidatePackageCount,
                scan.ScannedPackageCount,
                scan.Failures.Count,
                scan.Classes.Count,
                functionCount,
                scan.BlueprintInheritanceLinkCount,
                scan.DerivedClasses.Count,
                scan.Overrides.Count,
                scan.ManagerEventGraphs.Count,
                scan.CallSites.Count),
            DerivedClasses: scan.DerivedClasses,
            Overrides: scan.Overrides,
            ManagerEventGraphs: scan.ManagerEventGraphs,
            CallSites: scan.CallSites,
            Failures: scan.Failures);
    }

    private static void ValidateCensusIdentity(
        UnlockableEvidence evidence,
        FileIdentity censusIdentity)
    {
        if (evidence.StaticCensus.FileName != censusIdentity.FileName ||
            evidence.StaticCensus.SizeBytes != censusIdentity.SizeBytes ||
            evidence.StaticCensus.Sha256 != censusIdentity.Sha256)
        {
            throw new InvalidDataException(
                "Unlockable evidence does not identify the supplied static census.");
        }
    }

    private static bool TryParseArguments(
        string[] args,
        out UnlockableImplementationSitesOptions options,
        out string error)
    {
        var values = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < args.Length; index++)
        {
            var option = args[index];
            if (index + 1 >= args.Length)
            {
                options = UnlockableImplementationSitesOptions.Empty;
                error = $"Missing value for option '{option}'.";
                return false;
            }

            if (!values.TryAdd(option, args[++index]))
            {
                options = UnlockableImplementationSitesOptions.Empty;
                error = $"Duplicate option '{option}'.";
                return false;
            }
        }

        var required = new[]
        {
            "--build-manifest",
            "--static-census",
            "--unlockable-evidence",
            "--unlockable-function-trace",
            "--mappings",
            "--package-directory",
            "--output",
        };
        var unknown = values.Keys.FirstOrDefault(key => !required.Contains(key, StringComparer.Ordinal));
        if (unknown is not null || required.Any(option => !values.ContainsKey(option)))
        {
            options = UnlockableImplementationSitesOptions.Empty;
            error = unknown is null
                ? "Unlockable-implementation-sites generation requires all seven input and output options."
                : $"Unknown option '{unknown}'.";
            return false;
        }

        options = new UnlockableImplementationSitesOptions(
            values["--build-manifest"],
            values["--static-census"],
            values["--unlockable-evidence"],
            values["--unlockable-function-trace"],
            values["--mappings"],
            values["--package-directory"],
            values["--output"]);
        error = string.Empty;
        return true;
    }

    private static void WriteUsage(TextWriter writer)
    {
        writer.WriteLine("Usage: NeonRetroRewind.StaticExtractor unlockable-implementation-sites --build-manifest <path> --static-census <path> --unlockable-evidence <path> --unlockable-function-trace <path> --mappings <path> --package-directory <path> --output <path>");
        writer.WriteLine();
        writer.WriteLine("The command scans generated Blueprint classes once for unlock-item descendants, overrides, manager event graphs, and calls to the four selected unlock hooks.");
        writer.WriteLine("The output directory must already exist, and different existing content is never overwritten.");
    }

    private sealed record UnlockableImplementationSitesOptions(
        string BuildManifestPath,
        string StaticCensusPath,
        string UnlockableEvidencePath,
        string UnlockableFunctionTracePath,
        string MappingsPath,
        string PackageDirectory,
        string OutputPath)
    {
        public static UnlockableImplementationSitesOptions Empty { get; } =
            new("", "", "", "", "", "", "");
    }
}
