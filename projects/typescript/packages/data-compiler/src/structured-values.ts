import type { StructuredValues } from "@neonretrorewind/core";

export type StructuredValuesArtifact = Pick<
  StructuredValues,
  "artifactType" | "dataTables"
> & {
  readonly build: Pick<StructuredValues["build"], "steamAppId" | "steamBuildId">;
};
export type StructuredDataTable = StructuredValues["dataTables"][number];
export type StructuredDataTableRow = StructuredDataTable["rows"][number];
