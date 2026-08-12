import { type } from "arktype";

const $definitionBuild = type({
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();
const $definitionSha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const $definitionSourceIdentity = type({
  fileName: type("string")
    .matching(new RegExp("^[^/\\\\]+\\.json$"))
    .atLeastLength(1),
  sha256: $definitionSha256,
  sizeBytes: type("number.integer").atLeast(1),
  artifactType: type.enumerated("rental-evidence", "rental-blueprint-bodies"),
  "+": "reject",
}).readonly();
const $definitionSources = type({
  rentalEvidence: type.and(
    $definitionSourceIdentity,
    type({ "artifactType?": type.unit("rental-evidence") }).readonly(),
  ),
  rentalBlueprintBodies: type.and(
    $definitionSourceIdentity,
    type({ "artifactType?": type.unit("rental-blueprint-bodies") }).readonly(),
  ),
  "+": "reject",
}).readonly();
const $definitionNonEmptyString = type("string").atLeastLength(1);
const $definitionDefaultEvidence = type({
  artifactType: type.unit("rental-evidence"),
  classPath: $definitionNonEmptyString,
  propertyName: $definitionNonEmptyString,
  "+": "reject",
}).readonly();
const $definitionConfiguration = type({
  rentalDurationDays: type({
    value: type("number.integer").atLeast(1),
    evidence: $definitionDefaultEvidence,
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();
const $definitionFunctionEvidence = type({
  artifactType: type.unit("rental-blueprint-bodies"),
  classPath: $definitionNonEmptyString,
  functionName: $definitionNonEmptyString,
  "+": "reject",
}).readonly();
const $definitionEligibility = type({
  missingWeatherActorResult: type.unit(false),
  elapsedDays: type({
    currentDay: type.unit("weather-days-passed"),
    rentalStartDay: type.unit("console-rental-start-day"),
    operator: type.unit("greater-than-or-equal"),
    threshold: type.unit("rental-duration-days"),
    "+": "reject",
  }).readonly(),
  evidence: $definitionFunctionEvidence,
  "+": "reject",
}).readonly();
const $definitionQueueTransition = type({
  when: type.unit("eligible"),
  source: type.unit("rented"),
  destination: type.unit("ready-to-return"),
  removesFromSource: type.unit(true),
  evidence: $definitionFunctionEvidence,
  "+": "reject",
}).readonly();

export const ConsoleReturnMechanicsSchema = type({
  artifactType: type.unit("console-return-mechanics"),
  build: $definitionBuild,
  sources: $definitionSources,
  scope: type.unit("console-return"),
  evidenceLevel: type.unit("decompiled-blueprint"),
  runtimeValidation: type.unit("not-run"),
  configuration: $definitionConfiguration,
  eligibility: $definitionEligibility,
  queueTransition: $definitionQueueTransition,
  "+": "reject",
}).readonly();
export type ConsoleReturnMechanics = typeof ConsoleReturnMechanicsSchema.infer;

type RentalSourceIdentity =
  ConsoleReturnMechanics["sources"][keyof ConsoleReturnMechanics["sources"]];
export type RentalArtifactIdentity<
  ArtifactType extends RentalSourceIdentity["artifactType"] =
    RentalSourceIdentity["artifactType"],
> = Extract<RentalSourceIdentity, { artifactType: ArtifactType }>;
export type DefaultPropertyEvidence =
  ConsoleReturnMechanics["configuration"]["rentalDurationDays"]["evidence"];
export type BlueprintFunctionEvidence =
  ConsoleReturnMechanics["eligibility"]["evidence"];
