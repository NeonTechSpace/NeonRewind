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

        var expectedMetadata = requests.ToDictionary(
            request => request.FunctionPath,
            request => request,
            StringComparer.Ordinal);
        return TraceSelectedDetailed(
            mappingsPath,
            packageDirectory,
            requests.Select(request => new BlueprintFunctionTraceSelection(
                request.PackagePath,
                request.ClassName,
                request.ClassPath,
                request.FunctionName,
                request.FunctionPath)).ToArray(),
            expectedMetadata,
            includeSignatures: false)
            .Select(result => result.Function)
            .ToArray();
    }

    public static IReadOnlyList<BlueprintTracedFunction> TraceSelected(
        string mappingsPath,
        string packageDirectory,
        IReadOnlyList<BlueprintFunctionTraceSelection> selections)
    {
        if (selections.Count == 0 ||
            selections.Select(selection => selection.FunctionPath)
                .Distinct(StringComparer.Ordinal).Count() != selections.Count)
        {
            throw new InvalidDataException("Blueprint trace selections must be nonempty and unique.");
        }

        return TraceSelectedDetailed(
                mappingsPath,
                packageDirectory,
                selections,
                null,
                includeSignatures: false)
            .Select(result => result.Function)
            .ToArray();
    }

    public static BlueprintTracedFunctionWithSignature TraceCandidate(
        string mappingsPath,
        string packageDirectory,
        BlueprintFunctionTraceSelection selection)
    {
        var result = TraceSelectedDetailed(
            mappingsPath,
            packageDirectory,
            [selection],
            null,
            includeSignatures: true).Single();
        return new BlueprintTracedFunctionWithSignature(
            result.Function,
            result.Signature ?? throw new InvalidDataException(
                $"Blueprint candidate signature is missing: {selection.FunctionPath}"));
    }

    private static IReadOnlyList<BlueprintTracedFunctionResult> TraceSelectedDetailed(
        string mappingsPath,
        string packageDirectory,
        IReadOnlyList<BlueprintFunctionTraceSelection> selections,
        IReadOnlyDictionary<string, BlueprintFunctionTraceRequest>? expectedMetadata,
        bool includeSignatures)
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

        var functions = new List<BlueprintTracedFunctionResult>();
        foreach (var classGroup in selections
            .OrderBy(selection => selection.PackagePath, StringComparer.Ordinal)
            .ThenBy(selection => selection.ClassPath, StringComparer.Ordinal)
            .ThenBy(selection => selection.FunctionPath, StringComparer.Ordinal)
            .GroupBy(selection => new TraceClassKey(
                selection.PackagePath,
                selection.ClassName,
                selection.ClassPath)))
        {
            var blueprintClass = LoadClass(provider, classGroup.Key);
            foreach (var selection in classGroup)
            {
                var function = LoadFunction(blueprintClass, selection);
                var trace = BlueprintFunctionTraceBuilder.Build(
                    selection.PackagePath,
                    blueprintClass,
                    function);
                if (expectedMetadata is not null)
                {
                    VerifyMetadata(trace, expectedMetadata[selection.FunctionPath]);
                }

                functions.Add(new BlueprintTracedFunctionResult(
                    trace,
                    includeSignatures ? BlueprintFunctionSignatureReader.Read(function) : null));
            }
        }

        return functions
            .OrderBy(result => result.Function.PackagePath, StringComparer.Ordinal)
            .ThenBy(result => result.Function.ClassPath, StringComparer.Ordinal)
            .ThenBy(result => result.Function.FunctionPath, StringComparer.Ordinal)
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
        BlueprintFunctionTraceSelection expected)
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

internal sealed record BlueprintFunctionTraceSelection(
    string PackagePath,
    string ClassName,
    string ClassPath,
    string FunctionName,
    string FunctionPath);

internal sealed record BlueprintTracedFunctionWithSignature(
    BlueprintTracedFunction Function,
    BlueprintFunctionSignature Signature);

internal sealed record BlueprintTracedFunctionResult(
    BlueprintTracedFunction Function,
    BlueprintFunctionSignature? Signature);
