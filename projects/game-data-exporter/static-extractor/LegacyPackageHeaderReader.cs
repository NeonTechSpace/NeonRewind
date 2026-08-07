using CUE4Parse.FileProvider;
using CUE4Parse.FileProvider.Objects;
using CUE4Parse.MappingsProvider;
using CUE4Parse.UE4.Assets;
using CUE4Parse.UE4.Assets.Exports;
using CUE4Parse.UE4.Assets.Readers;
using CUE4Parse.UE4.Objects.UObject;

namespace NeonRewind.StaticExtractor;

internal sealed record LegacyPackageHeader(
    int ImportCount,
    int ExportCount,
    IReadOnlyList<string> ExportClassNames);

internal static class LegacyPackageHeaderReader
{
    private const string UnresolvedClassName = "<unresolved>";

    public static LegacyPackageHeader Read(GameFile file)
    {
        using var rawArchive = file.CreateReader();
        rawArchive.Versions = (CUE4Parse.UE4.Versions.VersionContainer)rawArchive.Versions.Clone();

        var summary = new FPackageFileSummary(rawArchive);
        var headerPackage = new HeaderPackage(file.PathWithoutExtension, summary);

        rawArchive.Position = summary.NameOffset;
        headerPackage.NameMap = rawArchive.ReadArray(
            summary.NameCount,
            () => new FNameEntrySerialized(rawArchive));

        var assetArchive = new FAssetArchive(rawArchive, headerPackage);
        assetArchive.SeekAbsolute(summary.ImportOffset, SeekOrigin.Begin);
        var imports = assetArchive.ReadArray(
            summary.ImportCount,
            () => new FObjectImport(assetArchive));

        assetArchive.SeekAbsolute(summary.ExportOffset, SeekOrigin.Begin);
        var exports = assetArchive.ReadArray(
            summary.ExportCount,
            () => new FObjectExport(assetArchive));

        var classNames = exports
            .Select(export => ResolveClassName(export.ClassIndex, imports, exports))
            .ToArray();

        return new LegacyPackageHeader(imports.Length, exports.Length, classNames);
    }

    private static string ResolveClassName(
        FPackageIndex classIndex,
        IReadOnlyList<FObjectImport> imports,
        IReadOnlyList<FObjectExport> exports)
    {
        if (classIndex.IsImport && -classIndex.Index - 1 < imports.Count)
        {
            return imports[-classIndex.Index - 1].ObjectName.Text;
        }

        if (classIndex.IsExport && classIndex.Index - 1 < exports.Count)
        {
            return exports[classIndex.Index - 1].ObjectName.Text;
        }

        return UnresolvedClassName;
    }

    private sealed class HeaderPackage(string name, FPackageFileSummary summary) : IPackage
    {
        public string Name { get; set; } = name;
        public IFileProvider? Provider => null;
        public TypeMappings? Mappings => null;
        public FPackageFileSummary Summary { get; } = summary;
        public FNameEntrySerialized[] NameMap { get; set; } = [];
        public int ImportMapLength => Summary.ImportCount;
        public int ExportMapLength => Summary.ExportCount;
        public Lazy<UObject>[] ExportsLazy { get; } = [];
        public bool IsFullyLoaded => false;
        public bool CanDeserialize => false;

        public bool HasFlags(EPackageFlags flags) => Summary.PackageFlags.HasFlag(flags);

        public int GetExportIndex(
            string name,
            StringComparison comparisonType = StringComparison.Ordinal) => -1;

        public ResolvedObject? ResolvePackageIndex(FPackageIndex? index) => null;
    }
}
