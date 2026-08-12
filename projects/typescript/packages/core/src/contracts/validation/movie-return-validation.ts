import { type } from "arktype";

const $definitionBuild = type({
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();
const $definitionFileName = type("string")
  .matching(new RegExp("^[^/\\\\]+$"))
  .atLeastLength(1)
  .atMostLength(255);
const $definitionSizeBytes = type("number.integer").atLeast(1);
const $definitionSha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const $definitionObservationIdentity = type({
  fileName: $definitionFileName,
  sizeBytes: $definitionSizeBytes,
  sha256: $definitionSha256,
  artifactType: type.unit("movie-return-runtime-observation"),
  "+": "reject",
}).readonly();
const $definitionMechanicsIdentity = type({
  fileName: type.unit("movie-return-mechanics.json"),
  sizeBytes: $definitionSizeBytes,
  sha256: $definitionSha256,
  artifactType: type.unit("movie-return-mechanics"),
  "+": "reject",
}).readonly();
const $definitionIssue = type({
  kind: type.enumerated("incomplete", "mismatch"),
  code: type.enumerated(
    "run-not-complete",
    "complete-run-missing-event",
    "invalid-run-time-range",
    "event-sequence-changed",
    "event-time-before-run",
    "event-time-after-run",
    "event-time-moved-backward",
    "capture-truncated",
    "capture-count-mismatch",
    "readiness-source-empty",
    "readiness-source-not-cleared",
    "readiness-destination-mismatch",
    "selection-result-count-exceeded",
    "selection-result-duplicate",
    "selection-found-result-mismatch",
    "selection-outside-ready-queue",
    "customer-selection-outside-ready-queue",
    "customer-ready-queue-mismatch",
    "customer-inventory-mismatch",
  ),
  sequence: type.or(
    type("number.integer").atLeast(1).atMost(256),
    type("null"),
  ),
  message: type("string").atLeastLength(1).atMostLength(500),
  "+": "reject",
}).readonly();
const $definitionValidation = type({
  outcome: type.enumerated("passed", "incomplete", "mismatch"),
  checkedEventCount: type("number.integer").atLeast(0).atMost(256),
  issues: $definitionIssue.array().readonly().atMostLength(8192),
  "+": "reject",
}).readonly();

export const MovieReturnValidationSchema = type({
  artifactType: type.unit("movie-return-runtime-validation"),
  build: $definitionBuild,
  validator: type({
    name: type.unit("@neonretrorewind/validator"),
    version: type.unit("0.0.0"),
    "+": "reject",
  }).readonly(),
  sources: type({
    observation: $definitionObservationIdentity,
    mechanics: $definitionMechanicsIdentity,
    "+": "reject",
  }).readonly(),
  validation: $definitionValidation,
  "+": "reject",
}).readonly();
export type MovieReturnValidation = typeof MovieReturnValidationSchema.infer;

export type MovieReturnValidationArtifact = MovieReturnValidation;
export type MovieReturnValidationReport = MovieReturnValidation["validation"];
export type MovieReturnValidationIssue =
  MovieReturnValidationReport["issues"][number];
export type MovieReturnValidationIssueCode = MovieReturnValidationIssue["code"];
type ValidationSource =
  MovieReturnValidation["sources"][keyof MovieReturnValidation["sources"]];
export type ValidationSourceIdentity<
  ArtifactType extends ValidationSource["artifactType"],
> = Extract<ValidationSource, { artifactType: ArtifactType }>;
