using System.Collections;
using System.Reflection;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Kismet;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Objects.UObject;
using CUE4Parse.UE4.Versions;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintPropertyReferenceScanner
{
    public const string CandidateRule = "parsed-packages-with-function-exports";
    public const string ReferenceRule = "exact-kismet-property-pointer-name";

    public static BlueprintPropertyReferenceScan Scan(
        StaticCensus census,
        string mappingsPath,
        string packageDirectory,
        string targetPropertyName)
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
                    exportClass.Name == "Function" && exportClass.Count > 0))
            .OrderBy(package => package.Path, StringComparer.Ordinal)
            .ToArray();
        var references = new List<BlueprintPropertyReference>();
        var failures = new List<BlueprintCallSiteFailure>();
        var classCount = 0;
        var functionCount = 0;

        foreach (var candidate in candidates)
        {
            try
            {
                if (!provider.TryGetGameFile(candidate.Path, out var file))
                {
                    throw new InvalidDataException("Candidate package is missing from the mounted provider.");
                }

                var classes = provider.LoadPackage(file)
                    .GetExports()
                    .OfType<UBlueprintGeneratedClass>()
                    .OrderBy(blueprintClass => blueprintClass.GetPathName(), StringComparer.Ordinal)
                    .ToArray();
                var packageReferences = new List<BlueprintPropertyReference>();
                var packageFunctionCount = 0;
                foreach (var blueprintClass in classes)
                {
                    packageReferences.AddRange(ScanClass(
                        candidate.Path,
                        blueprintClass,
                        targetPropertyName,
                        out var classFunctionCount));
                    packageFunctionCount += classFunctionCount;
                }

                classCount += classes.Length;
                functionCount += packageFunctionCount;
                references.AddRange(packageReferences);
            }
            catch (Exception exception) when (exception is not OutOfMemoryException)
            {
                failures.Add(new BlueprintCallSiteFailure(candidate.Path, exception.GetType().Name));
            }
        }

        return new BlueprintPropertyReferenceScan(
            CandidatePackageCount: candidates.Length,
            ScannedPackageCount: candidates.Length - failures.Count,
            ClassCount: classCount,
            FunctionCount: functionCount,
            References: references
                .OrderBy(reference => reference.PackagePath, StringComparer.Ordinal)
                .ThenBy(reference => reference.ClassPath, StringComparer.Ordinal)
                .ThenBy(reference => reference.FunctionPath, StringComparer.Ordinal)
                .ThenBy(reference => reference.StatementIndex)
                .ThenBy(reference => reference.Opcode, StringComparer.Ordinal)
                .ThenBy(reference => reference.PointerField, StringComparer.Ordinal)
                .ThenBy(reference => reference.Access, StringComparer.Ordinal)
                .ToArray(),
            Failures: failures
                .OrderBy(failure => failure.PackagePath, StringComparer.Ordinal)
                .ToArray());
    }

    private static IReadOnlyList<BlueprintPropertyReference> ScanClass(
        string packagePath,
        UBlueprintGeneratedClass blueprintClass,
        string targetPropertyName,
        out int functionCount)
    {
        var functions = blueprintClass.FuncMap
            .Select(pair => LoadFunction(pair.Key.Text, pair.Value))
            .OrderBy(function => function.Name, StringComparer.Ordinal)
            .ToArray();
        functionCount = functions.Length;
        var references = new List<BlueprintPropertyReference>();

        foreach (var function in functions)
        {
            if (function.ScriptBytecode is null)
            {
                continue;
            }

            var visited = new HashSet<object>(ReferenceEqualityComparer.Instance);
            for (var index = 0; index < function.ScriptBytecode.Length; index++)
            {
                VisitValue(
                    function.ScriptBytecode[index],
                    null,
                    $"script[{index}]",
                    visited,
                    (expression, parent, edge, pointerField) =>
                    {
                        if (expression.StatementIndex < 0)
                        {
                            throw new InvalidDataException(
                                "Blueprint property reference has no statement index.");
                        }

                        references.Add(new BlueprintPropertyReference(
                            PackagePath: packagePath,
                            ClassName: blueprintClass.Name,
                            ClassPath: blueprintClass.GetPathName(),
                            FunctionName: function.Name,
                            FunctionPath: function.GetPathName(),
                            Access: ClassifyAccess(expression, parent, edge, pointerField),
                            Opcode: expression.GetType().Name,
                            PointerField: pointerField,
                            StatementIndex: expression.StatementIndex));
                    },
                    targetPropertyName);
            }
        }

        return references;
    }

    private static void VisitValue(
        object? value,
        KismetExpression? parent,
        string edge,
        HashSet<object> visited,
        Action<KismetExpression, KismetExpression?, string, string> addReference,
        string targetPropertyName)
    {
        if (value is null || value is string)
        {
            return;
        }

        var type = value.GetType();
        if (!type.IsValueType && !visited.Add(value))
        {
            return;
        }

        if (value is KismetExpression expression)
        {
            foreach (var field in type.GetFields(BindingFlags.Public | BindingFlags.Instance)
                .Where(field => field.FieldType == typeof(FKismetPropertyPointer))
                .OrderBy(field => field.MetadataToken))
            {
                if (string.Equals(
                    field.GetValue(expression)?.ToString(),
                    targetPropertyName,
                    StringComparison.Ordinal))
                {
                    addReference(expression, parent, edge, field.Name);
                }
            }

            foreach (var field in type.GetFields(BindingFlags.Public | BindingFlags.Instance)
                .OrderBy(field => field.MetadataToken))
            {
                VisitChild(
                    field.GetValue(expression),
                    expression,
                    field.Name,
                    visited,
                    addReference,
                    targetPropertyName);
            }

            return;
        }

        if (value is IEnumerable enumerable)
        {
            var index = 0;
            foreach (var item in enumerable)
            {
                VisitChild(
                    item,
                    parent,
                    $"{edge}[{index}]",
                    visited,
                    addReference,
                    targetPropertyName);
                index++;
            }

            return;
        }

        if (type.Namespace?.StartsWith("CUE4Parse.UE4.Kismet", StringComparison.Ordinal) != true)
        {
            return;
        }

        foreach (var field in type.GetFields(BindingFlags.Public | BindingFlags.Instance)
            .OrderBy(field => field.MetadataToken))
        {
            VisitChild(
                field.GetValue(value),
                parent,
                $"{edge}.{field.Name}",
                visited,
                addReference,
                targetPropertyName);
        }
    }

    private static void VisitChild(
        object? value,
        KismetExpression? parent,
        string edge,
        HashSet<object> visited,
        Action<KismetExpression, KismetExpression?, string, string> addReference,
        string targetPropertyName)
    {
        if (value is KismetExpression ||
            value is IEnumerable && value is not string ||
            value?.GetType().Namespace?.StartsWith(
                "CUE4Parse.UE4.Kismet",
                StringComparison.Ordinal) == true)
        {
            VisitValue(
                value,
                parent,
                edge,
                visited,
                addReference,
                targetPropertyName);
        }
    }

    private static string ClassifyAccess(
        KismetExpression expression,
        KismetExpression? parent,
        string edge,
        string pointerField)
    {
        if (expression is EX_VariableBase)
        {
            return parent?.GetType().Name.StartsWith("EX_Let", StringComparison.Ordinal) == true &&
                edge == "Variable"
                ? "write"
                : "read";
        }

        if (expression is EX_LetValueOnPersistentFrame && pointerField == "DestinationProperty")
        {
            return "write";
        }

        return "metadata";
    }

    private static UFunction LoadFunction(string expectedName, FPackageIndex functionIndex)
    {
        var function = functionIndex.Load<UFunction>();
        if (function is null || function.Name != expectedName)
        {
            throw new InvalidDataException($"Could not load Blueprint function: {expectedName}");
        }

        return function;
    }

    internal sealed record BlueprintPropertyReferenceScan(
        int CandidatePackageCount,
        int ScannedPackageCount,
        int ClassCount,
        int FunctionCount,
        IReadOnlyList<BlueprintPropertyReference> References,
        IReadOnlyList<BlueprintCallSiteFailure> Failures);
}
