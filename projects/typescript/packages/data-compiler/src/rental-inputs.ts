import type { RentalBlueprintBodies, RentalEvidence } from "@neonretrorewind/core";

export type RentalBuildReference = RentalEvidence["build"];
export type RentalMappingIdentity = RentalEvidence["mappings"];
type RentalPackage = RentalEvidence["packages"][number];
type RentalEvidenceBlueprintClass = RentalPackage["blueprintClasses"][number];
type RentalStruct = RentalPackage["userDefinedStructs"][number];
export type RentalBlueprintClassEvidence = Pick<
  RentalEvidenceBlueprintClass,
  "name" | "path" | "fields"
> & {
  readonly classDefault: Pick<
    RentalEvidenceBlueprintClass["classDefault"],
    "properties"
  >;
};
export type RentalStructEvidence = Pick<
  RentalStruct,
  "name" | "path" | "fields" | "defaults"
>;
export type RentalField = RentalBlueprintClassEvidence["fields"][number];
export type RentalDefaultProperty =
  RentalBlueprintClassEvidence["classDefault"]["properties"][number];
export type RentalEvidenceArtifact = Pick<
  RentalEvidence,
  "artifactType" | "build" | "mappings"
> & {
  readonly packages: readonly (Pick<RentalPackage, "path"> & {
    readonly blueprintClasses: readonly RentalBlueprintClassEvidence[];
    readonly userDefinedStructs: readonly RentalStructEvidence[];
  })[];
};

type RentalBlueprintBodyClass = RentalBlueprintBodies["classes"][number];
export type RentalBlueprintFunctionInput =
  RentalBlueprintBodyClass["functions"][number];
export type RentalBlueprintBodiesArtifact = Pick<
  RentalBlueprintBodies,
  "artifactType" | "build" | "mappings"
> & {
  readonly classes: readonly (Pick<
    RentalBlueprintBodyClass,
    "packagePath" | "name" | "path" | "pseudoCode"
  > & {
    readonly functions: readonly RentalBlueprintFunctionInput[];
  })[];
};
