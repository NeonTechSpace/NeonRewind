using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Objects.UObject;
using CUE4Parse.UE4.Versions;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintFunctionTracer
{
    public static IReadOnlyList<BlueprintTracedFunction> Trace(
        string mappingsPath,
        string packageDirectory,
        IReadOnlyList<BlueprintFunctionTraceRequest> requests)
    {
        if (requests.Count == 0 ||
            requests.Select(request => request.FunctionPath)
                .Distinct(StringComparer.Ordinal).Count() != requests.Count)
        {
            throw new InvalidDataException("Blueprint trace requests must be nonempty and unique.");
        }

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

        var functions = new List<BlueprintTracedFunction>();
        foreach (var classGroup in requests
            .OrderBy(request => request.PackagePath, StringComparer.Ordinal)
            .ThenBy(request => request.ClassPath, StringComparer.Ordinal)
            .ThenBy(request => request.FunctionPath, StringComparer.Ordinal)
            .GroupBy(request => new TraceClassKey(
                request.PackagePath,
                request.ClassName,
                request.ClassPath)))
        {
            var blueprintClass = LoadClass(provider, classGroup.Key);
            foreach (var request in classGroup)
            {
                var function = LoadFunction(blueprintClass, request);
                var trace = BlueprintFunctionTraceBuilder.Build(
                    request.PackagePath,
                    blueprintClass,
                    function);
                VerifyMetadata(trace, request);
                functions.Add(trace);
            }
        }

        return functions
            .OrderBy(function => function.PackagePath, StringComparer.Ordinal)
            .ThenBy(function => function.ClassPath, StringComparer.Ordinal)
            .ThenBy(function => function.FunctionPath, StringComparer.Ordinal)
            .ToArray();
    }

    private static UBlueprintGeneratedClass LoadClass(
        DefaultFileProvider provider,
        TraceClassKey expected)
    {
        if (!provider.TryGetGameFile(expected.PackagePath, out var file))
        {
            throw new InvalidDataException($"Blueprint trace package is missing: {expected.PackagePath}");
        }

        try
        {
            var blueprintClass = provider.LoadPackage(file)
                .GetExports()
                .OfType<UBlueprintGeneratedClass>()
                .SingleOrDefault(value => value.Name == expected.ClassName) ??
                throw new InvalidDataException($"Blueprint trace class is missing: {expected.ClassPath}");
            if (blueprintClass.GetPathName() != expected.ClassPath)
            {
                throw new InvalidDataException($"Blueprint trace class path changed: {expected.ClassPath}");
            }

            return blueprintClass;
        }
        catch (InvalidDataException)
        {
            throw;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            throw new InvalidDataException(
                $"Could not load Blueprint trace package {expected.PackagePath} ({exception.GetType().Name}).",
                exception);
        }
    }

    private static UFunction LoadFunction(
        UBlueprintGeneratedClass blueprintClass,
        BlueprintFunctionTraceRequest expected)
    {
        var matches = blueprintClass.FuncMap
            .Where(pair => pair.Key.Text == expected.FunctionName)
            .Select(pair => pair.Value.Load<UFunction>())
            .Where(function => function is not null)
            .Cast<UFunction>()
            .ToArray();
        if (matches.Length != 1 || matches[0].GetPathName() != expected.FunctionPath)
        {
            throw new InvalidDataException($"Blueprint trace function changed: {expected.FunctionPath}");
        }

        return matches[0];
    }

    private static void VerifyMetadata(
        BlueprintTracedFunction actual,
        BlueprintFunctionTraceRequest expected)
    {
        if (actual.PackagePath != expected.PackagePath ||
            actual.ClassName != expected.ClassName ||
            actual.ClassPath != expected.ClassPath ||
            actual.FunctionName != expected.FunctionName ||
            actual.FunctionPath != expected.FunctionPath ||
            actual.Flags != expected.Flags ||
            actual.BytecodeExpressionCount != expected.BytecodeExpressionCount)
        {
            throw new InvalidDataException($"Blueprint trace function metadata changed: {expected.FunctionPath}");
        }
    }

    private sealed record TraceClassKey(string PackagePath, string ClassName, string ClassPath);
}

internal sealed record BlueprintFunctionTraceRequest(
    string PackagePath,
    string ClassName,
    string ClassPath,
    string FunctionName,
    string FunctionPath,
    string Flags,
    int BytecodeExpressionCount);
