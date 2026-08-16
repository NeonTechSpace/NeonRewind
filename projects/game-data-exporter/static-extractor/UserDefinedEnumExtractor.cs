using CUE4Parse.FileProvider;
using CUE4Parse.UE4.Assets.Objects.Properties;
using CUE4Parse.UE4.Objects.Engine;

namespace NeonRetroRewind.StaticExtractor;

internal static class UserDefinedEnumExtractor
{
    public static ExtractedUserDefinedEnum Extract(
        DefaultFileProvider provider,
        UserDefinedEnumTarget target,
        string label)
    {
        if (!provider.TryGetGameFile(target.PackagePath, out var file))
        {
            throw new InvalidDataException($"{label} package is missing from the mounted provider.");
        }

        var enums = provider.LoadPackage(file).GetExports().OfType<UUserDefinedEnum>().ToArray();
        if (enums is not [{ } source] ||
            source.Name != target.EnumName ||
            source.GetPathName() != target.ObjectPath)
        {
            throw new InvalidDataException($"{label} package no longer contains its exact enum export.");
        }

        var displayNameTags = source.Properties
            .Where(tag => tag.Name.Text == "DisplayNameMap")
            .ToArray();
        if (displayNameTags is not [{ Tag: MapProperty displayNameProperty }])
        {
            throw new InvalidDataException($"{label} has no exact display-name map.");
        }

        var displayNameMap = displayNameProperty.Value ??
            throw new InvalidDataException($"{label} display-name map has no value.");
        var displayNames = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var pair in displayNameMap.Properties)
        {
            if (pair.Key is not NameProperty key || pair.Value is not TextProperty value)
            {
                throw new InvalidDataException($"{label} display-name map changed type.");
            }

            var internalName = key.Value.Text;
            var displayName = value.Value?.Text;
            if (string.IsNullOrWhiteSpace(internalName) ||
                string.IsNullOrWhiteSpace(displayName) ||
                !displayNames.TryAdd(internalName, displayName))
            {
                throw new InvalidDataException($"{label} display-name map is incomplete or duplicated.");
            }
        }

        var names = source.Names.OrderBy(pair => pair.Item2).ToArray();
        if (names.Length < 2 ||
            names[^1].Item2 != names.Length - 1 ||
            !names[^1].Item1.Text.EndsWith("_MAX", StringComparison.Ordinal))
        {
            throw new InvalidDataException($"{label} no longer has one terminal maximum entry.");
        }

        var enumerators = names[..^1].Select((pair, index) =>
        {
            var internalName = pair.Item1.Text;
            var separatorIndex = internalName.IndexOf("::", StringComparison.Ordinal);
            var authoredName = separatorIndex < 0 ? string.Empty : internalName[(separatorIndex + 2)..];
            if (pair.Item2 != index ||
                !internalName.StartsWith(target.InternalNamePrefix, StringComparison.Ordinal) ||
                !displayNames.Remove(authoredName, out var displayName))
            {
                throw new InvalidDataException($"{label} values or display names changed.");
            }

            return new GameplayUnlockEnumerator(pair.Item2, internalName, displayName);
        }).ToArray();

        if (displayNames.Count != 0)
        {
            throw new InvalidDataException($"{label} display-name map contains unknown entries.");
        }

        return new ExtractedUserDefinedEnum(
            new GameplayUnlockEnumSource(
                target.PackagePath,
                source.GetPathName(),
                source.Name,
                source.CppForm.ToString(),
                source.UnderlyingType.ToString()),
            new GameplayUnlockEnumTotals(enumerators.Length),
            enumerators);
    }
}

internal sealed record ExtractedUserDefinedEnum(
    GameplayUnlockEnumSource Source,
    GameplayUnlockEnumTotals Totals,
    IReadOnlyList<GameplayUnlockEnumerator> Enumerators);
