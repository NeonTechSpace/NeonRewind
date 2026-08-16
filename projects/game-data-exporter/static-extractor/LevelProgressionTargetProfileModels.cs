using System.Text.Json;

namespace NeonRetroRewind.StaticExtractor;

internal sealed record LevelProgressionTargetProfile(
    string ProfileType,
    TargetProfileBuild Build,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    GameplayUnlockEnumTarget GameplayUnlockEnum,
    JsonElement XpTable,
    JsonElement Traces);

internal sealed record TargetProfileBuild(
    string ManifestSha256,
    string SteamAppId,
    string SteamBuildId);

internal sealed record GameplayUnlockEnumTarget(
    string PackagePath,
    string ObjectPath,
    string EnumName,
    string InternalNamePrefix);

internal sealed record TargetProfileIdentity(
    string FileName,
    long SizeBytes,
    string Sha256,
    string ProfileType);
