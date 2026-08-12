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
const $definitionClassFieldEvidence = type({
  artifactType: type.unit("rental-evidence"),
  classPath: $definitionNonEmptyString,
  fieldName: $definitionNonEmptyString,
  "+": "reject",
}).readonly();
const $definitionStorage = type({
  container: type.unit("map"),
  key: type.unit("membership-id"),
  value: type.unit("fee-record"),
  evidence: $definitionClassFieldEvidence,
  "+": "reject",
}).readonly();
const $definitionStructFieldEvidence = type({
  artifactType: type.unit("rental-evidence"),
  structPath: $definitionNonEmptyString,
  fieldName: $definitionNonEmptyString,
  "+": "reject",
}).readonly();
const $definitionFeeField = type({
  defaultValue: type.unit(0),
  evidence: $definitionStructFieldEvidence,
  "+": "reject",
}).readonly();
const $definitionFeeRecord = type({
  late: $definitionFeeField,
  broken: $definitionFeeField,
  rewind: $definitionFeeField,
  consoleLate: $definitionFeeField,
  consoleBroken: $definitionFeeField,
  "+": "reject",
}).readonly();
const $definitionFunctionEvidence = type({
  artifactType: type.unit("rental-blueprint-bodies"),
  classPath: $definitionNonEmptyString,
  functionName: $definitionNonEmptyString,
  "+": "reject",
}).readonly();
const $definitionAddition = type({
  zeroMembershipId: type.unit("no-op"),
  mapWrite: type.unit("add-or-replace"),
  fieldUpdates: type({
    late: type.unit("stored-plus-incoming"),
    broken: type.unit("stored-plus-incoming"),
    rewind: type.unit("stored-plus-incoming"),
    consoleLate: type.unit("set-zero"),
    consoleBroken: type.unit("set-zero"),
    "+": "reject",
  }).readonly(),
  evidence: $definitionFunctionEvidence,
  "+": "reject",
}).readonly();
const $definitionRemoval = type({
  zeroMembershipId: type.unit("no-op"),
  operation: type.unit("remove-entry"),
  evidence: $definitionFunctionEvidence,
  "+": "reject",
}).readonly();

export const MembershipFeeMechanicsSchema = type({
  artifactType: type.unit("membership-fee-mechanics"),
  build: $definitionBuild,
  sources: $definitionSources,
  scope: type.unit("membership-fee-record"),
  evidenceLevel: type.unit("decompiled-blueprint"),
  runtimeValidation: type.unit("not-run"),
  storage: $definitionStorage,
  feeRecord: $definitionFeeRecord,
  addition: $definitionAddition,
  removal: $definitionRemoval,
  "+": "reject",
}).readonly();
export type MembershipFeeMechanics = typeof MembershipFeeMechanicsSchema.infer;

export type ClassFieldEvidence = MembershipFeeMechanics["storage"]["evidence"];
export type StructFieldEvidence =
  MembershipFeeMechanics["feeRecord"]["late"]["evidence"];
export type MembershipFeeFieldDefinition =
  MembershipFeeMechanics["feeRecord"]["late"];
