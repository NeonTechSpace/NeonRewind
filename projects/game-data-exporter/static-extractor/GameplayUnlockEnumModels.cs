namespace NeonRetroRewind.StaticExtractor;

internal sealed record GameplayUnlockEnumEvidence(
    string ArtifactType,
    CensusBuildReference Build,
    GameplayUnlockEnumInput StaticCensus,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    GameplayUnlockEnumSource Source,
    GameplayUnlockEnumTotals Totals,
    IReadOnlyList<GameplayUnlockEnumerator> Enumerators);

internal sealed record GameplayUnlockEnumInput(
    string FileName,
    long SizeBytes,
    string Sha256);

internal sealed record GameplayUnlockEnumSource(
    string PackagePath,
    string ObjectPath,
    string EnumName,
    string CppForm,
    string UnderlyingType);

internal sealed record GameplayUnlockEnumTotals(int EnumeratorCount);

internal sealed record GameplayUnlockEnumerator(
    long Value,
    string InternalName,
    string DisplayName);
