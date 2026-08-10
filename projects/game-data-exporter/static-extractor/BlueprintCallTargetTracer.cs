using System.Collections;
using System.Reflection;
using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Kismet;
using CUE4Parse.UE4.Assets;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Objects.UObject;
using CUE4Parse.UE4.Versions;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintCallTargetTracer
{
    private const string KismetNamespacePrefix = "CUE4Parse.UE4.Kismet";

    public static BlueprintResolvedCallTarget Trace(
        string mappingsPath,
        string packageDirectory,
        BlueprintFunctionTraceSelection caller,
        BlueprintRecordedCall recordedCall,
        BlueprintFunctionDeclaration declaration)
    {
        var receiver = ResolveReceiver(
            mappingsPath,
            packageDirectory,
            caller,
            recordedCall,
            declaration);
        if (receiver.ClassPath != declaration.OwnerPath)
        {
            throw new InvalidDataException(
                $"Call receiver class does not match the declaration owner: {receiver.ClassPath}");
        }

        var className = ReadObjectName(declaration.OwnerPath, "declaration owner");
        var target = BlueprintFunctionTracer.TraceCandidate(
            mappingsPath,
            packageDirectory,
            new BlueprintFunctionTraceSelection(
                declaration.PackagePath,
                className,
                declaration.OwnerPath,
                declaration.ObjectName,
                declaration.ObjectPath));
        VerifyTarget(target, declaration);
        return new BlueprintResolvedCallTarget(receiver, target);
    }

    private static BlueprintCallReceiver ResolveReceiver(
        string mappingsPath,
        string packageDirectory,
        BlueprintFunctionTraceSelection caller,
        BlueprintRecordedCall recordedCall,
        BlueprintFunctionDeclaration declaration)
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

        if (!provider.TryGetGameFile(caller.PackagePath, out var file))
        {
            throw new InvalidDataException($"Call-target caller package is missing: {caller.PackagePath}");
        }

        var blueprintClass = provider.LoadPackage(file)
            .GetExports()
            .OfType<UBlueprintGeneratedClass>()
            .SingleOrDefault(value => value.Name == caller.ClassName) ??
            throw new InvalidDataException($"Call-target caller class is missing: {caller.ClassPath}");
        if (blueprintClass.GetPathName() != caller.ClassPath)
        {
            throw new InvalidDataException($"Call-target caller class changed: {caller.ClassPath}");
        }

        var functionMatches = blueprintClass.FuncMap
            .Where(pair => pair.Key.Text == caller.FunctionName)
            .Select(pair => pair.Value.Load<UFunction>())
            .Where(function => function is not null)
            .Cast<UFunction>()
            .ToArray();
        if (functionMatches.Length != 1 || functionMatches[0].GetPathName() != caller.FunctionPath)
        {
            throw new InvalidDataException($"Call-target caller function changed: {caller.FunctionPath}");
        }

        var bytecode = functionMatches[0].ScriptBytecode ??
            throw new InvalidDataException($"Call-target caller has no bytecode: {caller.FunctionPath}");
        var matches = new List<RawCallMatch>();
        var visited = new HashSet<object>(ReferenceEqualityComparer.Instance);
        foreach (var expression in bytecode)
        {
            FindCall(expression, null, "script", recordedCall, matches, visited);
        }

        if (matches.Count != 1 ||
            matches[0].Parent is not EX_Context context ||
            matches[0].Edge != nameof(EX_Context.ContextExpression) ||
            !ReferenceEquals(context.ContextExpression, matches[0].Expression) ||
            context.ObjectExpression is not EX_ObjectConst objectConstant)
        {
            throw new InvalidDataException(
                "The recorded call is not a unique EX_Context call with an EX_ObjectConst receiver.");
        }

        var resolvedObject = objectConstant.Value.ResolvedObject ??
            throw new InvalidDataException("The call receiver object constant did not resolve.");
        var receiverClass = resolvedObject.Class ??
            throw new InvalidDataException("The call receiver has no resolved class.");
        var loadedObject = objectConstant.Value.Load() ??
            throw new InvalidDataException("The call receiver object did not load.");
        VerifyRawDeclaration(provider, declaration);

        return new BlueprintCallReceiver(
            ContextStatementIndex: context.StatementIndex,
            ContextOpcode: nameof(EX_Context),
            CallEdge: nameof(EX_Context.ContextExpression),
            ReceiverStatementIndex: objectConstant.StatementIndex,
            ReceiverOpcode: nameof(EX_ObjectConst),
            ReceiverEdge: nameof(EX_Context.ObjectExpression),
            ObjectName: resolvedObject.Name.Text,
            ObjectPath: resolvedObject.GetPathName(),
            ClassPath: receiverClass.GetPathName(),
            ExportType: loadedObject.ExportType);
    }

    private static void VerifyRawDeclaration(
        DefaultFileProvider provider,
        BlueprintFunctionDeclaration declaration)
    {
        if (!provider.TryGetGameFile(declaration.PackagePath, out var file) ||
            provider.LoadPackage(file) is not Package package)
        {
            throw new InvalidDataException(
                $"Call-target declaration package is missing: {declaration.PackagePath}");
        }

        var exportIndex = declaration.PackageExportIndex - 1;
        if (exportIndex < 0 || exportIndex >= package.ExportMap.Length)
        {
            throw new InvalidDataException(
                $"Call-target declaration export is absent: {declaration.PackageExportIndex}");
        }

        var export = package.ExportMap[exportIndex];
        var ownerPath = export.OuterIndex?.ResolvedObject?.GetPathName();
        if (export.ClassName != "Function" ||
            export.ObjectName.Text != declaration.ObjectName ||
            ownerPath != declaration.OwnerPath ||
            ((IPackage)package).GetExport(exportIndex) is not UFunction function ||
            function.GetPathName() != declaration.ObjectPath)
        {
            throw new InvalidDataException(
                $"Call-target declaration export changed: {declaration.ObjectPath}");
        }
    }

    private static void FindCall(
        KismetExpression expression,
        KismetExpression? parent,
        string edge,
        BlueprintRecordedCall expected,
        List<RawCallMatch> matches,
        HashSet<object> visited)
    {
        if (!visited.Add(expression))
        {
            throw new InvalidDataException("Blueprint bytecode contains a shared or cyclic expression node.");
        }

        if (expression.StatementIndex == expected.StatementIndex &&
            expression.GetType().Name == expected.Opcode &&
            BlueprintCallScanner.TryReadCall(expression, out var functionName, out var callKind) &&
            functionName == expected.Call.FunctionName &&
            callKind == expected.Call.CallKind &&
            ReadArgumentCount(expression) == expected.Call.ArgumentCount)
        {
            matches.Add(new RawCallMatch(expression, parent, edge));
        }

        foreach (var child in ReadChildren(expression))
        {
            FindCall(child.Expression, expression, child.Edge, expected, matches, visited);
        }
    }

    private static int ReadArgumentCount(KismetExpression expression)
        => (expression.GetType().GetField("Parameters")?.GetValue(expression)
                as KismetExpression[] ?? [])
            .Count(parameter => parameter is not EX_EndFunctionParms);

    private static IEnumerable<RawChild> ReadChildren(KismetExpression expression)
    {
        foreach (var field in expression.GetType()
            .GetFields(BindingFlags.Public | BindingFlags.Instance)
            .OrderBy(field => field.MetadataToken))
        {
            var value = field.GetValue(expression);
            if (value is KismetExpression child)
            {
                yield return new RawChild(field.Name, child);
                continue;
            }

            if (value is not IEnumerable enumerable || value is string)
            {
                continue;
            }

            var index = 0;
            foreach (var item in enumerable)
            {
                if (item is KismetExpression itemExpression)
                {
                    yield return new RawChild($"{field.Name}[{index}]", itemExpression);
                }
                else if (item?.GetType().Namespace?.StartsWith(
                    KismetNamespacePrefix,
                    StringComparison.Ordinal) == true)
                {
                    foreach (var nestedField in item.GetType()
                        .GetFields(BindingFlags.Public | BindingFlags.Instance)
                        .OrderBy(nestedField => nestedField.MetadataToken))
                    {
                        if (nestedField.GetValue(item) is KismetExpression nestedExpression)
                        {
                            yield return new RawChild(
                                $"{field.Name}[{index}].{nestedField.Name}",
                                nestedExpression);
                        }
                    }
                }

                index++;
            }
        }
    }

    private static void VerifyTarget(
        BlueprintTracedFunctionWithSignature target,
        BlueprintFunctionDeclaration declaration)
    {
        var function = target.Function;
        if (function.PackagePath != declaration.PackagePath ||
            function.ClassPath != declaration.OwnerPath ||
            function.FunctionName != declaration.ObjectName ||
            function.FunctionPath != declaration.ObjectPath ||
            function.Flags != declaration.Flags ||
            function.BytecodeExpressionCount != declaration.BytecodeExpressionCount ||
            target.Signature.ParameterCount != declaration.Signature.ParameterCount ||
            !target.Signature.Parameters.SequenceEqual(declaration.Signature.Parameters))
        {
            throw new InvalidDataException(
                $"Traced call target does not match its declaration: {declaration.ObjectPath}");
        }
    }

    private static string ReadObjectName(string objectPath, string label)
    {
        var separator = objectPath.LastIndexOf('.');
        if (separator < 0 || separator == objectPath.Length - 1)
        {
            throw new InvalidDataException($"The {label} path has no object name: {objectPath}");
        }

        return objectPath[(separator + 1)..];
    }

    private sealed record RawCallMatch(
        KismetExpression Expression,
        KismetExpression? Parent,
        string Edge);

    private sealed record RawChild(string Edge, KismetExpression Expression);
}
