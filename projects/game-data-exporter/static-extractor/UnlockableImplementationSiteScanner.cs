using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Objects.UObject;
using CUE4Parse.UE4.Versions;

namespace NeonRetroRewind.StaticExtractor;

internal static class UnlockableImplementationSiteScanner
{
    public const string BaseClassPath =
        "ExampleGame/Content/ExampleProject/core/blueprint/research/BP_ExampleItem.BP_ExampleItem_C";
    public const string ManagerClassPath =
        "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C";
    public const string CandidateRule = "parsed-packages-with-generated-blueprint-class-exports";

    public static readonly IReadOnlyList<string> TargetFunctionNames =
        ["CanApplyExample", "IsExampleEligible", "ApplyExample", "TryApplyExample"];

    public static UnlockableImplementationScan Scan(
        StaticCensus census,
        string mappingsPath,
        string packageDirectory)
    {
        var versions = new VersionContainer(EGame.GAME_UE5_4);
        using var provider = new DefaultFileProvider(
            Path.GetFullPath(packageDirectory),
            SearchOption.TopDirectoryOnly,
            versions,
            StringComparer.OrdinalIgnoreCase)
        {
            MappingsContainer = new FileUsmapTypeMappingsProvider(Path.GetFullPath(mappingsPath)),
            ReadScriptData = true,
        };

        provider.Initialize();
        provider.Mount();
        provider.PostMount();
        if (provider.MountedVfs.Count == 0 || provider.UnloadedVfs.Count > 0)
        {
            throw new InvalidDataException("Package containers did not mount completely.");
        }

        var candidates = census.Packages
            .Where(package =>
                package.Status == "parsed" &&
                package.ExportClasses.Any(exportClass =>
                    exportClass.Count > 0 &&
                    exportClass.Name.EndsWith("BlueprintGeneratedClass", StringComparison.Ordinal)))
            .OrderBy(package => package.Path, StringComparer.Ordinal)
            .ToArray();
        var targetNames = new HashSet<string>(TargetFunctionNames, StringComparer.Ordinal);
        var classes = new List<ScannedBlueprintClass>();
        var callSites = new List<BlueprintNamedCallSite>();
        var failures = new List<BlueprintCallSiteFailure>();

        foreach (var candidate in candidates)
        {
            try
            {
                if (!provider.TryGetGameFile(candidate.Path, out var file))
                {
                    throw new InvalidDataException("Candidate package is missing from the mounted provider.");
                }

                var packageClasses = new List<ScannedBlueprintClass>();
                var packageCallSites = new List<BlueprintNamedCallSite>();
                foreach (var blueprintClass in provider.LoadPackage(file)
                    .GetExports()
                    .OfType<UBlueprintGeneratedClass>()
                    .OrderBy(value => value.GetPathName(), StringComparer.Ordinal))
                {
                    var functions = ReadFunctions(candidate.Path, blueprintClass);
                    var classCalls = BlueprintCallScanner.ScanClassForTargets(
                        candidate.Path,
                        blueprintClass,
                        targetNames,
                        out var scannedFunctionCount);
                    if (scannedFunctionCount != functions.Count)
                    {
                        throw new InvalidDataException("Blueprint function metadata changed during scanning.");
                    }

                    packageClasses.Add(new ScannedBlueprintClass(
                        candidate.Path,
                        blueprintClass.Name,
                        blueprintClass.GetPathName(),
                        ResolveSuperclassPath(blueprintClass),
                        functions));
                    packageCallSites.AddRange(classCalls);
                }

                classes.AddRange(packageClasses);
                callSites.AddRange(packageCallSites);
            }
            catch (Exception exception) when (exception is not OutOfMemoryException)
            {
                failures.Add(new BlueprintCallSiteFailure(candidate.Path, exception.GetType().Name));
            }
        }

        var classByPath = classes.ToDictionary(value => value.ClassPath, StringComparer.Ordinal);
        if (!classByPath.ContainsKey(BaseClassPath) || !classByPath.ContainsKey(ManagerClassPath))
        {
            throw new InvalidDataException("Unlockable base or manager class was not found in the complete scan.");
        }

        if (classes.Any(class_ => class_.SuperclassPath == "BP_ExampleItem_C"))
        {
            throw new InvalidDataException(
                "An unlock-item superclass reference could not be resolved to its full class path.");
        }

        var derivedClasses = new List<UnlockableDerivedClass>();
        var overrides = new List<UnlockableFunctionSite>();
        foreach (var class_ in classes.OrderBy(value => value.ClassPath, StringComparer.Ordinal))
        {
            if (!TryBuildInheritancePath(class_, classByPath, out var inheritancePath))
            {
                continue;
            }

            derivedClasses.Add(new UnlockableDerivedClass(
                class_.PackagePath,
                class_.ClassName,
                class_.ClassPath,
                class_.SuperclassPath,
                inheritancePath));
            overrides.AddRange(class_.Functions.Where(function =>
                function.FunctionName is "IsExampleEligible" or "ApplyExample"));
        }

        var managerEventGraphs = classByPath[ManagerClassPath].Functions
            .Where(function => function.FunctionName == "ExecuteExampleGraph_ExampleUnlockSystem")
            .OrderBy(function => function.FunctionPath, StringComparer.Ordinal)
            .ToArray();
        if (managerEventGraphs.Length != 1)
        {
            throw new InvalidDataException(
                $"Expected one ExampleUnlockSystem event graph, found {managerEventGraphs.Length}.");
        }

        var orderedFailures = failures
            .OrderBy(failure => failure.PackagePath, StringComparer.Ordinal)
            .ToArray();

        return new UnlockableImplementationScan(
            CandidatePackageCount: candidates.Length,
            ScannedPackageCount: candidates.Length - orderedFailures.Length,
            BlueprintInheritanceLinkCount: classes.Count(class_ =>
                classByPath.ContainsKey(class_.SuperclassPath)),
            Classes: classes.OrderBy(value => value.ClassPath, StringComparer.Ordinal).ToArray(),
            DerivedClasses: derivedClasses,
            Overrides: overrides
                .OrderBy(function => function.ClassPath, StringComparer.Ordinal)
                .ThenBy(function => function.FunctionPath, StringComparer.Ordinal)
                .ToArray(),
            ManagerEventGraphs: managerEventGraphs,
            CallSites: callSites
                .OrderBy(callSite => callSite.TargetFunctionName, StringComparer.Ordinal)
                .ThenBy(callSite => callSite.PackagePath, StringComparer.Ordinal)
                .ThenBy(callSite => callSite.ClassPath, StringComparer.Ordinal)
                .ThenBy(callSite => callSite.FunctionPath, StringComparer.Ordinal)
                .ThenBy(callSite => callSite.StatementIndex)
                .ThenBy(callSite => callSite.CallKind, StringComparer.Ordinal)
                .ToArray(),
            Failures: orderedFailures);
    }

    private static IReadOnlyList<UnlockableFunctionSite> ReadFunctions(
        string packagePath,
        UBlueprintGeneratedClass blueprintClass)
        => blueprintClass.FuncMap
            .Select(pair => LoadFunction(pair.Key.Text, pair.Value))
            .OrderBy(function => function.GetPathName(), StringComparer.Ordinal)
            .Select(function => new UnlockableFunctionSite(
                packagePath,
                blueprintClass.Name,
                blueprintClass.GetPathName(),
                function.Name,
                function.GetPathName(),
                function.FunctionFlags.ToString(),
                function.ScriptBytecode?.Length ?? 0))
            .ToArray();

    private static UFunction LoadFunction(string expectedName, FPackageIndex functionIndex)
    {
        var function = functionIndex.Load<UFunction>();
        if (function is null || function.Name != expectedName)
        {
            throw new InvalidDataException($"Could not load Blueprint function: {expectedName}");
        }

        return function;
    }

    private static string ResolveSuperclassPath(UBlueprintGeneratedClass blueprintClass)
    {
        var superStruct = blueprintClass.SuperStruct;
        if (superStruct is null || superStruct.IsNull)
        {
            throw new InvalidDataException($"Blueprint class has no superclass: {blueprintClass.GetPathName()}");
        }

        var path = superStruct.ResolvedObject?.GetPathName() ?? superStruct.Name;
        if (string.IsNullOrWhiteSpace(path))
        {
            throw new InvalidDataException($"Blueprint class superclass has no path: {blueprintClass.GetPathName()}");
        }

        return path;
    }

    private static bool TryBuildInheritancePath(
        ScannedBlueprintClass candidate,
        IReadOnlyDictionary<string, ScannedBlueprintClass> classByPath,
        out IReadOnlyList<string> inheritancePath)
    {
        var reversePath = new List<string> { candidate.ClassPath };
        var seen = new HashSet<string>(StringComparer.Ordinal) { candidate.ClassPath };
        var superclassPath = candidate.SuperclassPath;
        while (true)
        {
            if (!seen.Add(superclassPath))
            {
                throw new InvalidDataException($"Blueprint inheritance cycle found at {superclassPath}.");
            }

            reversePath.Add(superclassPath);
            if (superclassPath == BaseClassPath)
            {
                reversePath.Reverse();
                inheritancePath = reversePath;
                return candidate.ClassPath != BaseClassPath;
            }

            if (!classByPath.TryGetValue(superclassPath, out var superclass))
            {
                inheritancePath = [];
                return false;
            }

            superclassPath = superclass.SuperclassPath;
        }
    }

    internal sealed record UnlockableImplementationScan(
        int CandidatePackageCount,
        int ScannedPackageCount,
        int BlueprintInheritanceLinkCount,
        IReadOnlyList<ScannedBlueprintClass> Classes,
        IReadOnlyList<UnlockableDerivedClass> DerivedClasses,
        IReadOnlyList<UnlockableFunctionSite> Overrides,
        IReadOnlyList<UnlockableFunctionSite> ManagerEventGraphs,
        IReadOnlyList<BlueprintNamedCallSite> CallSites,
        IReadOnlyList<BlueprintCallSiteFailure> Failures);

    internal sealed record ScannedBlueprintClass(
        string PackagePath,
        string ClassName,
        string ClassPath,
        string SuperclassPath,
        IReadOnlyList<UnlockableFunctionSite> Functions);
}
