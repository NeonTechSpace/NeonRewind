using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Assets;
using CUE4Parse.UE4.Assets.Exports;
using CUE4Parse.UE4.Objects.UObject;
using CUE4Parse.UE4.Versions;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintFunctionDeclarationScanner
{
    public const string CandidateRule = "parsed-packages-with-function-exports";
    public const string DeclarationRule = "exact-raw-function-export-object-name";
    public const string InventoryRule = "all-raw-function-exports";

    public static BlueprintFunctionDeclarationScan Scan(
        StaticCensus census,
        string mappingsPath,
        string packageDirectory,
        string targetFunctionName)
        => ScanWhere(
            census,
            mappingsPath,
            packageDirectory,
            objectName => objectName == targetFunctionName);

    public static BlueprintFunctionDeclarationScan ScanAll(
        StaticCensus census,
        string mappingsPath,
        string packageDirectory)
        => ScanWhere(
            census,
            mappingsPath,
            packageDirectory,
            static _ => true);

    private static BlueprintFunctionDeclarationScan ScanWhere(
        StaticCensus census,
        string mappingsPath,
        string packageDirectory,
        Func<string, bool> includeDeclaration)
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
        var declarations = new List<BlueprintFunctionDeclaration>();
        var failures = new List<BlueprintCallSiteFailure>();
        var rawFunctionExportCount = 0;

        foreach (var candidate in candidates)
        {
            try
            {
                if (!provider.TryGetGameFile(candidate.Path, out var file))
                {
                    throw new InvalidDataException("Candidate package is missing from the mounted provider.");
                }

                if (provider.LoadPackage(file) is not Package package)
                {
                    throw new InvalidDataException("Candidate package has no legacy raw export map.");
                }

                var packageScan = ScanPackage(
                    candidate.Path,
                    package,
                    includeDeclaration);
                rawFunctionExportCount += packageScan.RawFunctionExportCount;
                declarations.AddRange(packageScan.Declarations);
            }
            catch (Exception exception) when (exception is not OutOfMemoryException)
            {
                failures.Add(new BlueprintCallSiteFailure(candidate.Path, exception.GetType().Name));
            }
        }

        return new BlueprintFunctionDeclarationScan(
            CandidatePackageCount: candidates.Length,
            ScannedPackageCount: candidates.Length - failures.Count,
            RawFunctionExportCount: rawFunctionExportCount,
            Declarations: declarations
                .OrderBy(declaration => declaration.PackagePath, StringComparer.Ordinal)
                .ThenBy(declaration => declaration.PackageExportIndex)
                .ToArray(),
            Failures: failures
                .OrderBy(failure => failure.PackagePath, StringComparer.Ordinal)
                .ToArray());
    }

    private static BlueprintFunctionDeclarationPackageScan ScanPackage(
        string packagePath,
        Package package,
        Func<string, bool> includeDeclaration)
    {
        var declarations = new List<BlueprintFunctionDeclaration>();
        var rawFunctionExportCount = 0;
        for (var index = 0; index < package.ExportMap.Length; index++)
        {
            var export = package.ExportMap[index];
            if (export.ClassName != "Function")
            {
                continue;
            }

            rawFunctionExportCount++;
            if (!includeDeclaration(export.ObjectName.Text))
            {
                continue;
            }

            if (((IPackage)package).GetExport(index) is not UFunction function ||
                function.Name != export.ObjectName.Text)
            {
                throw new InvalidDataException(
                    $"Raw function declaration did not load as UFunction: {packagePath} export {index + 1}");
            }

            var owner = export.OuterIndex?.ResolvedObject ??
                throw new InvalidDataException(
                    $"Function declaration has no resolved owner: {function.GetPathName()}");
            var ownerObject = owner.Load() ??
                throw new InvalidDataException(
                    $"Function declaration owner did not load: {function.GetPathName()}");
            var functionPath = function.GetPathName();
            declarations.Add(new BlueprintFunctionDeclaration(
                PackagePath: packagePath,
                PackageExportIndex: index + 1,
                ObjectName: export.ObjectName.Text,
                ObjectPath: functionPath,
                OwnerPath: owner.GetPathName(),
                OwnerExportType: ownerObject.ExportType,
                Flags: function.FunctionFlags.ToString(),
                BytecodeExpressionCount: function.ScriptBytecode?.Length,
                Signature: BlueprintFunctionSignatureReader.Read(function),
                OwnerLinkage: ReadOwnerLinkage(ownerObject, functionPath, export.ObjectName.Text)));
        }

        return new BlueprintFunctionDeclarationPackageScan(
            rawFunctionExportCount,
            declarations);
    }

    private static BlueprintFunctionOwnerLinkage ReadOwnerLinkage(
        UObject owner,
        string functionPath,
        string targetFunctionName)
    {
        var ownerStruct = owner as UStruct;
        var ownerClass = owner as UClass;
        return new BlueprintFunctionOwnerLinkage(
            FuncMapContainsDeclaration: ownerClass is null
                ? null
                : ownerClass.FuncMap.Any(pair =>
                    pair.Key.Text == targetFunctionName &&
                    pair.Value.ResolvedObject?.GetPathName() == functionPath),
            ChildrenContainsDeclaration: ownerStruct is null
                ? null
                : ownerStruct.Children.Any(child =>
                    child.ResolvedObject?.GetPathName() == functionPath),
            SuperclassPath: ResolvePath(ownerClass?.SuperStruct),
            InterfacePaths: ownerClass?.Interfaces
                .Select(interface_ => ResolvePath(interface_.Class))
                .Where(path => path is not null)
                .Cast<string>()
                .Order(StringComparer.Ordinal)
                .ToArray() ?? []);
    }

    private static string? ResolvePath(FPackageIndex? packageIndex)
        => packageIndex is null || packageIndex.IsNull
            ? null
            : packageIndex.ResolvedObject?.GetPathName() ?? packageIndex.Name;

    internal sealed record BlueprintFunctionDeclarationScan(
        int CandidatePackageCount,
        int ScannedPackageCount,
        int RawFunctionExportCount,
        IReadOnlyList<BlueprintFunctionDeclaration> Declarations,
        IReadOnlyList<BlueprintCallSiteFailure> Failures);

    private sealed record BlueprintFunctionDeclarationPackageScan(
        int RawFunctionExportCount,
        IReadOnlyList<BlueprintFunctionDeclaration> Declarations);
}
