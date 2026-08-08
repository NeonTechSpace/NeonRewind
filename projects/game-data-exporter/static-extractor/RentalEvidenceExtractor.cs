using System.Globalization;
using System.Text.Json;
using CUE4Parse.UE4.Assets.Exports;
using CUE4Parse.UE4.Assets.Objects;
using CUE4Parse.UE4.Assets.Objects.Properties;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Objects.UObject;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using NewtonsoftJsonSerializer = Newtonsoft.Json.JsonSerializer;

namespace NeonRewind.StaticExtractor;

internal static class RentalEvidenceExtractor
{
    private static readonly NewtonsoftJsonSerializer ValueSerializer = NewtonsoftJsonSerializer.Create(
        new JsonSerializerSettings
        {
            Culture = CultureInfo.InvariantCulture,
            FloatFormatHandling = FloatFormatHandling.String,
        });

    public static BlueprintClassEvidence ExtractBlueprintClass(UBlueprintGeneratedClass blueprintClass)
    {
        if (!blueprintClass.ClassDefaultObject.TryLoad(out UObject? classDefault) || classDefault is null)
        {
            throw new InvalidDataException($"Could not load the class default object for {blueprintClass.Name}.");
        }

        var properties = ExtractProperties(classDefault.Properties);
        return new BlueprintClassEvidence(
            Name: blueprintClass.Name,
            Path: blueprintClass.GetPathName(),
            SuperclassPath: ResolvePath(blueprintClass.SuperStruct),
            Functions: blueprintClass.FuncMap.Keys
                .Select(name => name.Text)
                .OrderBy(name => name, StringComparer.Ordinal)
                .ToArray(),
            Fields: ExtractFields(blueprintClass.ChildProperties),
            ClassDefault: new ClassDefaultEvidence(
                Name: classDefault.Name,
                Path: classDefault.GetPathName(),
                Properties: properties,
                References: ExtractReferences(classDefault.Properties)));
    }

    public static UserDefinedStructEvidence ExtractUserDefinedStruct(UUserDefinedStruct userDefinedStruct)
        => new(
            Name: userDefinedStruct.Name,
            Path: userDefinedStruct.GetPathName(),
            SuperStructPath: ResolvePath(userDefinedStruct.SuperStruct),
            Fields: ExtractFields(userDefinedStruct.ChildProperties),
            Defaults: ExtractProperties(userDefinedStruct.DefaultProperties ?? []),
            References: ExtractReferences(userDefinedStruct.DefaultProperties ?? []));

    private static IReadOnlyList<FieldEvidence> ExtractFields(IEnumerable<FField> fields)
        => fields
            .Select(field => new FieldEvidence(
                Name: field.Name.Text,
                Type: ReadFieldType(field),
                ArrayDimension: field is FProperty property ? property.ArrayDim : 1))
            .OrderBy(field => field.Name, StringComparer.Ordinal)
            .ThenBy(field => field.Type, StringComparer.Ordinal)
            .ToArray();

    private static string ReadFieldType(FField? field)
    {
        if (field is null)
        {
            return "unknown";
        }

        var type = field switch
        {
            FArrayProperty value => $"Array<{ReadFieldType(value.Inner)}>",
            FMapProperty value => $"Map<{ReadFieldType(value.KeyProp)}, {ReadFieldType(value.ValueProp)}>",
            FSetProperty value => $"Set<{ReadFieldType(value.ElementProp)}>",
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
            _ => ReadSimpleFieldType(field),
        };

        return type;
    }

    private static string ReadSimpleFieldType(FField field)
    {
        const string suffix = "Property";
        var type = field.GetType().Name;
        if (type.StartsWith('F') && type.EndsWith(suffix, StringComparison.Ordinal))
        {
            return type[1..^suffix.Length];
        }

        return type;
    }

    private static IReadOnlyList<DefaultPropertyEvidence> ExtractProperties(IEnumerable<FPropertyTag> tags)
        => tags
            .Select(tag => new DefaultPropertyEvidence(
                Name: tag.Name.Text,
                Type: tag.PropertyType.Text,
                ArrayIndex: tag.ArrayIndex,
                Value: NormalizeValue(tag.Tag?.GenericValue)))
            .OrderBy(property => property.Name, StringComparer.Ordinal)
            .ThenBy(property => property.ArrayIndex)
            .ToArray();

    private static JsonElement NormalizeValue(object? value)
    {
        var token = value is null ? JValue.CreateNull() : JToken.FromObject(value, ValueSerializer);
        var canonical = Canonicalize(token);
        using var document = JsonDocument.Parse(canonical.ToString(Formatting.None));
        return document.RootElement.Clone();
    }

    private static JToken Canonicalize(JToken token)
        => token switch
        {
            JObject value => new JObject(value.Properties()
                .OrderBy(property => property.Name, StringComparer.Ordinal)
                .Select(property => new JProperty(property.Name, Canonicalize(property.Value)))),
            JArray value => new JArray(value.Select(Canonicalize)),
            _ => token.DeepClone(),
        };

    private static IReadOnlyList<ObjectReferenceEvidence> ExtractReferences(IEnumerable<FPropertyTag> tags)
    {
        var references = new List<ObjectReferenceEvidence>();
        foreach (var tag in tags)
        {
            CollectReferences(tag.Tag, tag.Name.Text, references);
        }

        return references
            .Distinct()
            .OrderBy(reference => reference.PropertyPath, StringComparer.Ordinal)
            .ThenBy(reference => reference.Kind, StringComparer.Ordinal)
            .ThenBy(reference => reference.ObjectPath, StringComparer.Ordinal)
            .ToArray();
    }

    private static void CollectReferences(
        FPropertyTagType? value,
        string propertyPath,
        ICollection<ObjectReferenceEvidence> references)
    {
        if (value is null)
        {
            return;
        }

        CollectReferences(value.GenericValue, propertyPath, references);
    }

    private static void CollectReferences(
        object? value,
        string propertyPath,
        ICollection<ObjectReferenceEvidence> references)
    {
        switch (value)
        {
            case null:
                return;
            case FPackageIndex packageIndex:
                AddPackageIndex(packageIndex, propertyPath, "hard", references);
                return;
            case FSoftObjectPath softPath when !softPath.AssetPathName.IsNone:
                var path = softPath.AssetPathName.Text;
                if (!string.IsNullOrEmpty(softPath.SubPathString))
                {
                    path += $":{softPath.SubPathString}";
                }

                references.Add(new ObjectReferenceEvidence(propertyPath, "soft", path));
                return;
            case FScriptInterface scriptInterface:
                AddPackageIndex(scriptInterface.Object, propertyPath, "interface", references);
                return;
            case FScriptDelegate scriptDelegate:
                AddPackageIndex(scriptDelegate.Object, propertyPath, "delegate", references);
                return;
            case FMulticastScriptDelegate multicast:
                for (var index = 0; index < multicast.InvocationList.Length; index++)
                {
                    CollectReferences(multicast.InvocationList[index], $"{propertyPath}[{index}]", references);
                }

                return;
            case UScriptArray array:
                for (var index = 0; index < array.Properties.Count; index++)
                {
                    CollectReferences(array.Properties[index], $"{propertyPath}[{index}]", references);
                }

                return;
            case UScriptSet set:
                for (var index = 0; index < set.Properties.Count; index++)
                {
                    CollectReferences(set.Properties[index], $"{propertyPath}[{index}]", references);
                }

                return;
            case UScriptMap map:
                var itemIndex = 0;
                foreach (var pair in map.Properties.OrderBy(
                    pair => NormalizeValue(pair.Key.GenericValue).GetRawText(),
                    StringComparer.Ordinal))
                {
                    CollectReferences(pair.Key, $"{propertyPath}[{itemIndex}].key", references);
                    CollectReferences(pair.Value, $"{propertyPath}[{itemIndex}].value", references);
                    itemIndex++;
                }

                return;
            case FScriptStruct scriptStruct when scriptStruct.StructType is FStructFallback fallback:
                foreach (var tag in fallback.Properties)
                {
                    CollectReferences(tag.Tag, $"{propertyPath}.{tag.Name.Text}", references);
                }

                return;
            case FPropertyTagType propertyValue:
                CollectReferences(propertyValue.GenericValue, propertyPath, references);
                return;
        }
    }

    private static void AddPackageIndex(
        FPackageIndex? packageIndex,
        string propertyPath,
        string kind,
        ICollection<ObjectReferenceEvidence> references)
    {
        if (packageIndex is null || packageIndex.IsNull)
        {
            return;
        }

        var path = packageIndex.ResolvedObject?.GetPathName() ?? packageIndex.Name;
        if (!string.IsNullOrWhiteSpace(path))
        {
            references.Add(new ObjectReferenceEvidence(propertyPath, kind, path));
        }
    }

    private static string? ResolvePath(FPackageIndex? packageIndex)
        => packageIndex is null || packageIndex.IsNull
            ? null
            : packageIndex.ResolvedObject?.GetPathName() ?? packageIndex.Name;
}
