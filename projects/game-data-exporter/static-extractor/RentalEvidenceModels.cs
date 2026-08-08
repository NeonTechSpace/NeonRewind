using System.Text.Json;

namespace NeonRewind.StaticExtractor;

internal sealed record RentalEvidence(
    string ArtifactType,
    int SchemaVersion,
    CensusBuildReference Build,
    RentalEvidenceInput StaticCensus,
    MappingIdentity Mappings,
    EngineIdentity Engine,
    ExtractorIdentity Extractor,
    RentalEvidenceTotals Totals,
    IReadOnlyList<RentalPackageEvidence> Packages);

internal sealed record RentalEvidenceInput(
    string FileName,
    long SizeBytes,
    string Sha256,
    int SchemaVersion);

internal sealed record RentalEvidenceTotals(
    int PackageCount,
    int BlueprintClassCount,
    int UserDefinedStructCount,
    int FunctionCount,
    int FieldCount,
    int DefaultPropertyCount,
    int ReferenceCount);

internal sealed record RentalPackageEvidence(
    string Path,
    IReadOnlyList<BlueprintClassEvidence> BlueprintClasses,
    IReadOnlyList<UserDefinedStructEvidence> UserDefinedStructs);

internal sealed record BlueprintClassEvidence(
    string Name,
    string Path,
    string? SuperclassPath,
    IReadOnlyList<string> Functions,
    IReadOnlyList<FieldEvidence> Fields,
    ClassDefaultEvidence ClassDefault);

internal sealed record UserDefinedStructEvidence(
    string Name,
    string Path,
    string? SuperStructPath,
    IReadOnlyList<FieldEvidence> Fields,
    IReadOnlyList<DefaultPropertyEvidence> Defaults,
    IReadOnlyList<ObjectReferenceEvidence> References);

internal sealed record FieldEvidence(
    string Name,
    string Type,
    int ArrayDimension);

internal sealed record ClassDefaultEvidence(
    string Name,
    string Path,
    IReadOnlyList<DefaultPropertyEvidence> Properties,
    IReadOnlyList<ObjectReferenceEvidence> References);

internal sealed record DefaultPropertyEvidence(
    string Name,
    string Type,
    int ArrayIndex,
    JsonElement Value);

internal sealed record ObjectReferenceEvidence(
    string PropertyPath,
    string Kind,
    string ObjectPath);
