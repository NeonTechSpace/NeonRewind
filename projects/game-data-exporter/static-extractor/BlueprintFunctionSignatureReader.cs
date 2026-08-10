using CUE4Parse.UE4.Assets.Objects.Properties;
using CUE4Parse.UE4.Objects.UObject;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintFunctionSignatureReader
{
    public static BlueprintFunctionSignature Read(UFunction function)
    {
        var parameters = function.ChildProperties
            .OfType<FProperty>()
            .Where(property => property.PropertyFlags.HasFlag(EPropertyFlags.Parm))
            .Select((property, position) => new BlueprintFunctionParameter(
                Position: position,
                Name: property.Name.Text,
                Type: BlueprintFieldTypeReader.Read(property),
                ArrayDimension: property.ArrayDim,
                Flags: property.PropertyFlags.ToString()))
            .ToArray();

        return new BlueprintFunctionSignature(parameters.Length, parameters);
    }
}

internal sealed record BlueprintFunctionSignature(
    int ParameterCount,
    IReadOnlyList<BlueprintFunctionParameter> Parameters);

internal sealed record BlueprintFunctionParameter(
    int Position,
    string Name,
    string Type,
    int ArrayDimension,
    string Flags);
