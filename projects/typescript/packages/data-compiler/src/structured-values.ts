export interface StructuredValuesArtifact {
  readonly artifactType: "structured-values";
  readonly schemaVersion: 1;
  readonly build: {
    readonly steamAppId: string;
    readonly steamBuildId: string;
  };
  readonly dataTables: readonly StructuredDataTable[];
}

export interface StructuredDataTable {
  readonly path: string;
  readonly name: string;
  readonly type: string;
  readonly rowStruct: string;
  readonly rows: readonly StructuredDataTableRow[];
}

export interface StructuredDataTableRow {
  readonly key: string;
  readonly values: Readonly<Record<string, unknown>>;
}
