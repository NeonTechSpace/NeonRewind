using CUE4Parse.UE4.Assets.Objects.Properties;
using CUE4Parse.UE4.Objects.UObject;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintFieldTypeReader
{
    public static string Read(FField? field)
    {
        if (field is null)
        {
            return "unknown";
        }

        return field switch
        {
            FArrayProperty value => $"Array<{Read(value.Inner)}>",
            FMapProperty value => $"Map<{Read(value.KeyProp)}, {Read(value.ValueProp)}>",
            FSetProperty value => $"Set<{Read(value.ElementProp)}>",
            FSoftClassProperty value => $"SoftClass<{ResolvePath(value.PropertyClass) ?? "unknown"}>",
            FSoftObjectProperty value => $"SoftObject<{ResolvePath(value.PropertyClass) ?? "unknown"}>",
            FClassProperty value => $"Class<{ResolvePath(value.PropertyClass) ?? "unknown"}>",
            FWeakObjectProperty value => $"WeakObject<{ResolvePath(value.PropertyClass) ?? "unknown"}>",
            FObjectProperty value => $"Object<{ResolvePath(value.PropertyClass) ?? "unknown"}>",
            FInterfaceProperty value => $"Interface<{ResolvePath(value.InterfaceClass) ?? "unknown"}>",
            FStructProperty value => $"Struct<{ResolvePath(value.Struct) ?? "unknown"}>",
            FEnumProperty value => $"Enum<{ResolvePath(value.Enum) ?? "unknown"}>",
            FByteProperty value when value.Enum is not null && !value.Enum.IsNull =>
                $"Byte<{ResolvePath(value.Enum) ?? "unknown"}>",
            _ => ReadSimpleType(field),
        };
    }

    private static string ReadSimpleType(FField field)
    {
        const string suffix = "Property";
        var type = field.GetType().Name;
        return type.StartsWith('F') && type.EndsWith(suffix, StringComparison.Ordinal)
            ? type[1..^suffix.Length]
            : type;
    }

    private static string? ResolvePath(FPackageIndex? packageIndex)
        => packageIndex is null || packageIndex.IsNull
            ? null
            : packageIndex.ResolvedObject?.GetPathName() ?? packageIndex.Name;
}
