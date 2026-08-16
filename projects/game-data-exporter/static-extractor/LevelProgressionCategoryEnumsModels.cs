namespace NeonRetroRewind.StaticExtractor;

internal sealed record LevelProgressionCategoryEnumsEvidence(
    string ArtifactType,
    CensusBuildReference Build,
    GameplayUnlockEnumInput StaticCensus,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    TargetProfileIdentity TargetProfile,
    ExtractorIdentity Extractor,
    LevelProgressionCategoryEnums Categories);

internal sealed record LevelProgressionCategoryEnums(
    ExtractedUserDefinedEnum Movie,
    ExtractedUserDefinedEnum Game);
