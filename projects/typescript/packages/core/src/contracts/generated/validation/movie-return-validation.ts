// Generated from src/contracts/validation/movie-return-validation.ts by pnpm contracts:generate. Do not edit.

export type FileName = string;
export type SizeBytes = number;
export type Sha256 = string;

export interface MovieReturnValidationContract {
  artifactType: "movie-return-runtime-validation";
  build: Build;
  validator: {
    name: "@neonretrorewind/validator";
    version: "0.0.0";
  };
  sources: {
    observation: ObservationIdentity;
    mechanics: MechanicsIdentity;
  };
  validation: Validation;
}
export interface Build {
  steamAppId: string;
  steamBuildId: string;
}
export interface ObservationIdentity {
  fileName: FileName;
  sizeBytes: SizeBytes;
  sha256: Sha256;
  artifactType: "movie-return-runtime-observation";
}
export interface MechanicsIdentity {
  fileName: "movie-return-mechanics.json";
  sizeBytes: SizeBytes;
  sha256: Sha256;
  artifactType: "movie-return-mechanics";
}
export interface Validation {
  outcome: "passed" | "incomplete" | "mismatch";
  checkedEventCount: number;
  /**
   * @maxItems 8192
   */
  issues: Issue[];
}
export interface Issue {
  kind: "incomplete" | "mismatch";
  code:
    | "run-not-complete"
    | "complete-run-missing-event"
    | "invalid-run-time-range"
    | "event-sequence-changed"
    | "event-time-before-run"
    | "event-time-after-run"
    | "event-time-moved-backward"
    | "capture-truncated"
    | "capture-count-mismatch"
    | "readiness-source-empty"
    | "readiness-source-not-cleared"
    | "readiness-destination-mismatch"
    | "selection-result-count-exceeded"
    | "selection-result-duplicate"
    | "selection-found-result-mismatch"
    | "selection-outside-ready-queue"
    | "customer-selection-outside-ready-queue"
    | "customer-ready-queue-mismatch"
    | "customer-inventory-mismatch";
  sequence: number | null;
  message: string;
}
