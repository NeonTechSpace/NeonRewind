using System.Text.Json;

namespace NeonRetroRewind.StaticExtractor;

internal sealed record LevelProgressionTargetProfile(
    string ProfileType,
    TargetProfileBuild Build,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    UserDefinedEnumTarget GameplayUnlockEnum,
    LevelProgressionCategoryEnumTargets CategoryEnums,
    JsonElement XpTable,
    JsonElement Traces);

internal sealed record TargetProfileBuild(
    string ManifestSha256,
    string SteamAppId,
    string SteamBuildId);

internal sealed record UserDefinedEnumTarget(
    string PackagePath,
    string ObjectPath,
    string EnumName,
    string InternalNamePrefix);

internal sealed record LevelProgressionCategoryEnumTargets(
    UserDefinedEnumTarget Movie,
    UserDefinedEnumTarget Game);

internal sealed record TargetProfileIdentity(
    string FileName,
    long SizeBytes,
    string Sha256,
    string ProfileType);
