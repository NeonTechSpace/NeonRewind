namespace NeonRewind.StaticExtractor;

internal sealed record StructuredAssetIndex(
    string ArtifactType,
    int SchemaVersion,
    CensusBuildReference Build,
    StructuredIndexInput StaticCensus,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    StructuredIndexTotals Totals,
    IReadOnlyList<StructuredPackageRecord> Packages,
    IReadOnlyList<CensusCount> FailureTypes);

internal sealed record StructuredIndexInput(
    string FileName,
    long SizeBytes,
    string Sha256,
    int SchemaVersion);

internal sealed record MappingIdentity(
    string FileName,
    long SizeBytes,
    string Sha256,
    int FormatVersion);

internal sealed record StructuredIndexTotals(
    int CandidatePackageCount,
    int ParsedPackageCount,
    int FailedPackageCount,
    int ExportCount,
    int ExportPropertyCount,
    int DataAssetCount,
    int DataTableCount,
    int DataTableRowCount,
    int DataTableRowPropertyCount,
    int StringTableCount,
    int StringTableEntryCount);

internal sealed record StructuredPackageRecord(
    string Path,
    string Status,
    IReadOnlyList<string> CandidateClasses,
    int? ExportCount,
    int? ExportPropertyCount,
    IReadOnlyList<StructuredAssetRecord> Assets,
    string? ErrorType);

internal sealed record StructuredAssetRecord(
    string Name,
    string Type,
    string Kind,
    int ExportPropertyCount,
    int? EntryCount,
    int? EntryPropertyCount,
    string? RowStruct);
