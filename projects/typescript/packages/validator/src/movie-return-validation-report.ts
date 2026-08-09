import type { MovieReturnValidationReport } from "./movie-return-observation.ts";

export interface ValidationSourceIdentity<
  ArtifactType extends
    | "movie-return-runtime-observation"
    | "movie-return-mechanics",
> {
  readonly fileName: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly artifactType: ArtifactType;
}

export interface MovieReturnValidationArtifact {
  readonly artifactType: "movie-return-runtime-validation";
  readonly build: {
    readonly steamAppId: string;
    readonly steamBuildId: string;
  };
  readonly validator: {
    readonly name: "@neonretrorewind/validator";
    readonly version: "0.0.0";
  };
  readonly sources: {
    readonly observation: ValidationSourceIdentity<"movie-return-runtime-observation">;
    readonly mechanics: ValidationSourceIdentity<"movie-return-mechanics">;
  };
  readonly validation: MovieReturnValidationReport;
}
