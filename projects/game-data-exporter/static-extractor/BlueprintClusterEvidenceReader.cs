using CUE4Parse.FileProvider;
using CUE4Parse.MappingsProvider.Usmap;
using CUE4Parse.UE4.Objects.Engine;
using CUE4Parse.UE4.Versions;

namespace NeonRetroRewind.StaticExtractor;

internal static class BlueprintClusterEvidenceReader
{
    public static IReadOnlyList<BlueprintClusterPackageEvidence> Extract(
        string mappingsPath,
        string packageDirectory,
        IReadOnlyList<BlueprintClusterTarget> targets,
        string label)
    {
        var versions = new VersionContainer(EGame.GAME_UE5_4);
        using var provider = new DefaultFileProvider(
            Path.GetFullPath(packageDirectory),
            SearchOption.TopDirectoryOnly,
            versions,
            StringComparer.OrdinalIgnoreCase)
        {
            MappingsContainer = new FileUsmapTypeMappingsProvider(Path.GetFullPath(mappingsPath)),
        };

        provider.Initialize();
        provider.Mount();
        provider.PostMount();

        if (provider.MountedVfs.Count == 0 || provider.UnloadedVfs.Count > 0)
        {
            throw new InvalidDataException("Package containers did not mount completely.");
        }

        return targets.Select(target => ExtractPackage(provider, target, label)).ToArray();
    }

    public static void ValidateCensus(
        StaticCensus census,
        BuildManifest manifest,
        string manifestSha256)
    {
        if (census.ArtifactType != "static-census")
        {
            throw new InvalidDataException("Expected a static-census artifact.");
        }

        if (census.Build is null ||
            census.Totals is null ||
            census.Packages is null ||
            census.Packages.Any(package => package is null || package.ExportClasses is null))
        {
            throw new InvalidDataException("Static census is incomplete.");
        }

        if (!string.Equals(census.Build.ManifestSha256, manifestSha256, StringComparison.Ordinal) ||
            !string.Equals(census.Build.SteamAppId, manifest.Steam.AppId, StringComparison.Ordinal) ||
            !string.Equals(census.Build.SteamBuildId, manifest.Steam.BuildId, StringComparison.Ordinal))
        {
            throw new InvalidDataException("Static census does not belong to the supplied build manifest.");
        }

        if (census.Totals.FailedPackageCount != 0 || census.Packages.Any(record => record.Status != "parsed"))
        {
            throw new InvalidDataException("Static census contains package failures.");
        }
    }

    public static void ValidateTargets(
        StaticCensus census,
        IReadOnlyList<BlueprintClusterTarget> targets,
        string label)
    {
        var duplicatePackage = census.Packages
            .GroupBy(package => package.Path, StringComparer.Ordinal)
            .FirstOrDefault(group => group.Count() != 1);
        if (duplicatePackage is not null)
        {
            throw new InvalidDataException($"Static census repeats package path: {duplicatePackage.Key}");
        }

        var packages = census.Packages.ToDictionary(package => package.Path, StringComparer.Ordinal);
        foreach (var target in targets)
        {
            if (!packages.TryGetValue(target.Path, out var package))
            {
                throw new InvalidDataException(
                    $"Static census does not contain the expected {label} export: {target.Path}");
            }

            var matchingClasses = package.ExportClasses
                .Where(value => value.Name == target.ExportClass)
                .ToArray();
            if (matchingClasses.Length != 1 || matchingClasses[0].Count != 1)
            {
                throw new InvalidDataException(
                    $"Static census does not contain the expected {label} export: {target.Path}");
            }
        }
    }

    private static BlueprintClusterPackageEvidence ExtractPackage(
        DefaultFileProvider provider,
        BlueprintClusterTarget target,
        string label)
    {
        try
        {
            if (!provider.TryGetGameFile(target.Path, out var file))
            {
                throw new InvalidDataException($"{label} package is missing from the mounted provider: {target.Path}");
            }

            var exports = provider.LoadPackage(file).GetExports().ToArray();
            var blueprintClasses = exports
                .OfType<UBlueprintGeneratedClass>()
                .Select(RentalEvidenceExtractor.ExtractBlueprintClass)
                .OrderBy(value => value.Name, StringComparer.Ordinal)
                .ToArray();
            var userDefinedStructs = exports
                .OfType<UUserDefinedStruct>()
                .Select(RentalEvidenceExtractor.ExtractUserDefinedStruct)
                .OrderBy(value => value.Name, StringComparer.Ordinal)
                .ToArray();

            if (target.ExportClass == "BlueprintGeneratedClass" && blueprintClasses.Length != 1 ||
                target.ExportClass == "UserDefinedStruct" && userDefinedStructs.Length != 1)
            {
                throw new InvalidDataException($"{label} package does not contain its expected export: {target.Path}");
            }

            return new BlueprintClusterPackageEvidence(target.Path, blueprintClasses, userDefinedStructs);
        }
        catch (InvalidDataException)
        {
            throw;
        }
        catch (Exception exception) when (exception is not OutOfMemoryException)
        {
            throw new InvalidDataException(
                $"Could not parse {label.ToLowerInvariant()} package {target.Path} ({exception.GetType().Name}).",
                exception);
        }
    }
}

internal sealed record BlueprintClusterTarget(string Path, string ExportClass);

internal sealed record BlueprintClusterPackageEvidence(
    string Path,
    IReadOnlyList<BlueprintClassEvidence> BlueprintClasses,
    IReadOnlyList<UserDefinedStructEvidence> UserDefinedStructs);
