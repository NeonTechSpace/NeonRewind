using System.Collections;
using System.Reflection;
using CUE4Parse.UE4.Kismet;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Objects.UObject;

namespace NeonRewind.StaticExtractor;

internal static class BlueprintCallScanner
{
    private const string KismetNamespacePrefix = "CUE4Parse.UE4.Kismet";

    public static IReadOnlyList<BlueprintCallSite> ScanClass(
        string packagePath,
        UBlueprintGeneratedClass blueprintClass,
        string targetFunctionName,
        out int functionCount)
    {
        var callSites = new List<BlueprintCallSite>();
        var functions = blueprintClass.FuncMap
            .Select(pair => LoadFunction(pair.Key.Text, pair.Value))
            .OrderBy(function => function.Name, StringComparer.Ordinal)
            .ToArray();
        functionCount = functions.Length;

        foreach (var function in functions)
        {
            if (function.ScriptBytecode is null)
            {
                continue;
            }

            var visited = new HashSet<object>(ReferenceEqualityComparer.Instance);
            foreach (var expression in function.ScriptBytecode)
            {
                VisitValue(
                    expression,
                    visited,
                    callExpression =>
                    {
                        if (!TryReadCall(callExpression, out var calledName, out var callKind) ||
                            !string.Equals(calledName, targetFunctionName, StringComparison.Ordinal))
                        {
                            return;
                        }

                        if (callExpression.StatementIndex < 0)
                        {
                            throw new InvalidDataException("Blueprint call has no statement index.");
                        }

                        callSites.Add(new BlueprintCallSite(
                            PackagePath: packagePath,
                            ClassName: blueprintClass.Name,
                            ClassPath: blueprintClass.GetPathName(),
                            FunctionName: function.Name,
                            FunctionPath: function.GetPathName(),
                            CallKind: callKind,
                            StatementIndex: callExpression.StatementIndex));
                    });
            }
        }

        return callSites;
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

    private static void VisitValue(
        object? value,
        HashSet<object> visited,
        Action<KismetExpression> visitExpression)
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
            visitExpression(expression);
        }
        else if (value is IEnumerable enumerable)
        {
            foreach (var item in enumerable)
            {
                if (item?.GetType().Namespace?.StartsWith(KismetNamespacePrefix, StringComparison.Ordinal) == true)
                {
                    VisitValue(item, visited, visitExpression);
                }
            }

            return;
        }
        else if (type.Namespace?.StartsWith(KismetNamespacePrefix, StringComparison.Ordinal) != true)
        {
            return;
        }

        foreach (var field in type.GetFields(BindingFlags.Public | BindingFlags.Instance))
        {
            var fieldValue = field.GetValue(value);
            if (fieldValue is KismetExpression ||
                fieldValue is IEnumerable ||
                fieldValue?.GetType().Namespace?.StartsWith(KismetNamespacePrefix, StringComparison.Ordinal) == true)
            {
                VisitValue(fieldValue, visited, visitExpression);
            }
        }
    }

    private static bool TryReadCall(
        KismetExpression expression,
        out string calledFunctionName,
        out string callKind)
    {
        switch (expression)
        {
            case EX_LocalVirtualFunction localVirtualFunction:
                calledFunctionName = localVirtualFunction.VirtualFunctionName.Text;
                callKind = "local-virtual";
                return true;
            case EX_VirtualFunction virtualFunction:
                calledFunctionName = virtualFunction.VirtualFunctionName.Text;
                callKind = "virtual";
                return true;
            case EX_LocalFinalFunction localFinalFunction:
                calledFunctionName = localFinalFunction.StackNode.Name;
                callKind = "local-final";
                return true;
            case EX_FinalFunction finalFunction:
                calledFunctionName = finalFunction.StackNode.Name;
                callKind = "final";
                return true;
            default:
                calledFunctionName = string.Empty;
                callKind = string.Empty;
                return false;
        }
    }
}
