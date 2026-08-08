using System.Collections;
using System.Globalization;
using System.Reflection;
using CUE4Parse.UE4.Kismet;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Objects.UObject;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintFunctionTraceBuilder
{
    private const string KismetNamespacePrefix = "CUE4Parse.UE4.Kismet";

    public static BlueprintTracedFunction Build(
        string packagePath,
        UBlueprintGeneratedClass blueprintClass,
        UFunction function)
    {
        var bytecode = function.ScriptBytecode ??
            throw new InvalidDataException($"Blueprint function has no bytecode: {function.GetPathName()}");
        var nodes = new List<BlueprintTraceNode>();
        var visited = new HashSet<object>(ReferenceEqualityComparer.Instance);

        for (var index = 0; index < bytecode.Length; index++)
        {
            VisitExpression(bytecode[index], null, $"script[{index}]", 0, nodes, visited);
        }

        return new BlueprintTracedFunction(
            PackagePath: packagePath,
            ClassName: blueprintClass.Name,
            ClassPath: blueprintClass.GetPathName(),
            FunctionName: function.Name,
            FunctionPath: function.GetPathName(),
            Flags: function.FunctionFlags.ToString(),
            BytecodeExpressionCount: bytecode.Length,
            Nodes: nodes);
    }

    private static void VisitExpression(
        KismetExpression expression,
        int? parentNodeIndex,
        string edge,
        int depth,
        List<BlueprintTraceNode> nodes,
        HashSet<object> visited)
    {
        if (!visited.Add(expression))
        {
            throw new InvalidDataException("Blueprint bytecode contains a shared or cyclic expression node.");
        }

        var nodeIndex = nodes.Count;
        nodes.Add(CreateNode(expression, nodeIndex, parentNodeIndex, edge, depth));

        foreach (var child in ReadChildren(expression))
        {
            VisitExpression(child.Expression, nodeIndex, child.Edge, depth + 1, nodes, visited);
        }
    }

    private static IEnumerable<TraceChild> ReadChildren(KismetExpression expression)
    {
        foreach (var field in expression.GetType()
            .GetFields(BindingFlags.Public | BindingFlags.Instance)
            .OrderBy(field => field.MetadataToken))
        {
            var value = field.GetValue(expression);
            if (value is KismetExpression child)
            {
                yield return new TraceChild(field.Name, child);
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
                    yield return new TraceChild($"{field.Name}[{index}]", itemExpression);
                }
                else if (item?.GetType().Namespace?.StartsWith(
                    KismetNamespacePrefix,
                    StringComparison.Ordinal) == true)
                {
                    foreach (var nested in ReadNestedChildren(item, field.Name, index))
                    {
                        yield return nested;
                    }
                }

                index++;
            }
        }
    }

    private static IEnumerable<TraceChild> ReadNestedChildren(object value, string edge, int index)
    {
        foreach (var field in value.GetType()
            .GetFields(BindingFlags.Public | BindingFlags.Instance)
            .OrderBy(field => field.MetadataToken))
        {
            if (field.GetValue(value) is KismetExpression expression)
            {
                yield return new TraceChild($"{edge}[{index}].{field.Name}", expression);
            }
        }
    }

    private static BlueprintTraceNode CreateNode(
        KismetExpression expression,
        int nodeIndex,
        int? parentNodeIndex,
        string edge,
        int depth)
    {
        var call = CreateCall(expression);
        var jump = CreateJump(expression);
        var literal = CreateLiteral(expression);

        return new BlueprintTraceNode(
            NodeIndex: nodeIndex,
            ParentNodeIndex: parentNodeIndex,
            Edge: edge,
            Depth: depth,
            StatementIndex: expression.StatementIndex,
            Opcode: expression.GetType().Name,
            Kind: Classify(expression, call, jump, literal),
            Call: call,
            Jump: jump,
            Literal: literal);
    }

    private static BlueprintTraceCall? CreateCall(KismetExpression expression)
    {
        if (!BlueprintCallScanner.TryReadCall(expression, out var functionName, out var callKind))
        {
            return null;
        }

        var parameters = expression.GetType().GetField("Parameters")?.GetValue(expression)
            as KismetExpression[] ?? [];
        var arguments = parameters
            .Where(parameter => parameter is not EX_EndFunctionParms)
            .ToArray();
        var integers = arguments
            .Select((argument, position) => new { argument, position })
            .Where(value => TryReadInteger(value.argument, out _))
            .Select(value =>
            {
                _ = TryReadInteger(value.argument, out var integer);
                return new BlueprintTraceIntegerArgument(
                    value.position,
                    integer.ToString(CultureInfo.InvariantCulture));
            })
            .ToArray();

        return new BlueprintTraceCall(callKind, functionName, arguments.Length, integers);
    }

    private static BlueprintTraceJump? CreateJump(KismetExpression expression)
        => expression switch
        {
            EX_JumpIfNot jump => StaticJump("conditional-false", "codeOffset", jump.CodeOffset),
            EX_Jump jump => StaticJump("unconditional", "codeOffset", jump.CodeOffset),
            EX_ComputedJump => new BlueprintTraceJump("computed", []),
            EX_PushExecutionFlow flow => StaticJump("push-flow", "pushingAddress", flow.PushingAddress),
            EX_PopExecutionFlowIfNot => new BlueprintTraceJump("pop-flow-if-false", []),
            EX_PopExecutionFlow => new BlueprintTraceJump("pop-flow", []),
            EX_SwitchValue switch_ => new BlueprintTraceJump(
                "switch",
                new[]
                {
                    new BlueprintTraceJumpTarget("endGotoOffset", switch_.EndGotoOffset),
                }.Concat(switch_.Cases.Select((case_, index) =>
                    new BlueprintTraceJumpTarget($"cases[{index}].nextOffset", case_.NextOffset)))
                .ToArray()),
            _ => null,
        };

    private static BlueprintTraceJump StaticJump(string kind, string edge, long offset)
        => new(kind, [new BlueprintTraceJumpTarget(edge, offset)]);

    private static BlueprintTraceLiteral? CreateLiteral(KismetExpression expression)
    {
        if (TryReadInteger(expression, out var integer))
        {
            return new BlueprintTraceLiteral(
                "integer",
                integer.ToString(CultureInfo.InvariantCulture));
        }

        return expression switch
        {
            EX_FloatConst value => NumberLiteral(value.Value),
            EX_DoubleConst value => NumberLiteral(value.Value),
            EX_StringConst value => new BlueprintTraceLiteral("string", value.Value),
            EX_UnicodeStringConst value => new BlueprintTraceLiteral("string", value.Value),
            EX_NameConst value => new BlueprintTraceLiteral("name", value.Value.Text),
            _ when expression.GetType().Name == "EX_True" => new BlueprintTraceLiteral("boolean", "true"),
            _ when expression.GetType().Name == "EX_False" => new BlueprintTraceLiteral("boolean", "false"),
            _ when expression.GetType().Name is "EX_Nothing" or "EX_NoObject" =>
                new BlueprintTraceLiteral("null", "null"),
            _ => null,
        };
    }

    private static BlueprintTraceLiteral NumberLiteral<T>(T value) where T : IFormattable
        => new("number", value.ToString(null, CultureInfo.InvariantCulture));

    private static bool TryReadInteger(KismetExpression expression, out long value)
    {
        switch (expression)
        {
            case EX_IntConst integer:
                value = integer.Value;
                return true;
            case EX_Int64Const integer:
                value = integer.Value;
                return true;
            case EX_IntConstByte integer:
                value = integer.Value;
                return true;
            case EX_ByteConst integer:
                value = integer.Value;
                return true;
            default:
                if (expression.GetType().Name == "EX_IntZero")
                {
                    value = 0;
                    return true;
                }

                if (expression.GetType().Name == "EX_IntOne")
                {
                    value = 1;
                    return true;
                }

                value = 0;
                return false;
        }
    }

    private static string Classify(
        KismetExpression expression,
        BlueprintTraceCall? call,
        BlueprintTraceJump? jump,
        BlueprintTraceLiteral? literal)
    {
        if (call is not null)
        {
            return "call";
        }

        if (jump is not null)
        {
            return "branch";
        }

        if (literal is not null)
        {
            return "literal";
        }

        if (expression is EX_Return)
        {
            return "return";
        }

        var opcode = expression.GetType().Name;
        if (opcode.StartsWith("EX_Let", StringComparison.Ordinal))
        {
            return "assignment";
        }

        if (opcode.EndsWith("Variable", StringComparison.Ordinal))
        {
            return "variable";
        }

        if (opcode.Contains("Context", StringComparison.Ordinal))
        {
            return "context";
        }

        return "operation";
    }

    private sealed record TraceChild(string Edge, KismetExpression Expression);
}
