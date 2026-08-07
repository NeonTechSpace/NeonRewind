using System.Text.Json;

namespace NeonRewind.StaticExtractor;

internal sealed record StructuredValues(
    string ArtifactType,
    int SchemaVersion,
    CensusBuildReference Build,
    StructuredValuesInput StructuredIndex,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    StructuredValuesTotals Totals,
    IReadOnlyList<DataTableValues> DataTables,
    IReadOnlyList<StringTableValues> StringTables,
    IReadOnlyList<StructuredValuesFailure> Failures,
    IReadOnlyList<CensusCount> FailureTypes);

internal sealed record StructuredValuesInput(
    string FileName,
    long SizeBytes,
    string Sha256,
    int SchemaVersion);

internal sealed record StructuredValuesTotals(
    int CandidatePackageCount,
    int ExtractedPackageCount,
    int FailedPackageCount,
    int DataTableCount,
    int DataTableRowCount,
    int DataTableRowPropertyCount,
    int StringTableCount,
    int StringTableEntryCount,
    int StringTableMetadataCount);

internal sealed record DataTableValues(
    string Path,
    string Name,
    string Type,
    string? RowStruct,
    IReadOnlyList<DataTableRow> Rows);

internal sealed record DataTableRow(
    string Key,
    JsonElement Values);

internal sealed record StringTableValues(
    string Path,
    string Name,
    string Type,
    string Namespace,
    IReadOnlyList<StringTableEntry> Entries);

internal sealed record StringTableEntry(
    string Key,
    string Value,
    IReadOnlyList<StringTableMetadata> Metadata);

internal sealed record StringTableMetadata(
    string Name,
    string Value);

internal sealed record StructuredValuesFailure(
    string Path,
    string ErrorType);
