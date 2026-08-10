export {
  BlueprintCallCandidateTraceJsonSchema,
  BlueprintCallCandidateTraceSchema,
  type BlueprintCallCandidateTrace,
} from "./contracts/acquisition/blueprint-call-candidate-trace.ts";
export {
  BlueprintCallTargetTraceJsonSchema,
  BlueprintCallTargetTraceSchema,
  type BlueprintCallTargetTrace,
} from "./contracts/acquisition/blueprint-call-target-trace.ts";
export {
  BlueprintCallSitesJsonSchema,
  BlueprintCallSitesSchema,
  type BlueprintCallSites,
} from "./contracts/acquisition/blueprint-call-sites.ts";
export {
  BlueprintCallerBodiesJsonSchema,
  BlueprintCallerBodiesSchema,
  type BlueprintCallerBodies,
} from "./contracts/acquisition/blueprint-caller-bodies.ts";
export {
  BlueprintFunctionDeclarationsJsonSchema,
  BlueprintFunctionDeclarationsSchema,
  type BlueprintFunctionDeclarations,
} from "./contracts/acquisition/blueprint-function-declarations.ts";
export {
  BlueprintFunctionTraceJsonSchema,
  BlueprintFunctionTraceSchema,
  type BlueprintFunctionTrace,
} from "./contracts/acquisition/blueprint-function-trace.ts";
export {
  BlueprintPropertyReferencesJsonSchema,
  BlueprintPropertyReferencesSchema,
  type BlueprintPropertyReferences,
} from "./contracts/acquisition/blueprint-property-references.ts";
export {
  BlueprintPropertyReferenceTraceJsonSchema,
  BlueprintPropertyReferenceTraceSchema,
  type BlueprintPropertyReferenceTrace,
} from "./contracts/acquisition/blueprint-property-reference-trace.ts";
export {
  BuildManifestJsonSchema,
  BuildManifestSchema,
  type BuildManifest,
} from "./contracts/acquisition/build-manifest.ts";
export {
  RentalBlueprintBodiesJsonSchema,
  RentalBlueprintBodiesSchema,
  type RentalBlueprintBodies,
} from "./contracts/acquisition/rental-blueprint-bodies.ts";
export {
  RentalEvidenceJsonSchema,
  RentalEvidenceSchema,
  type RentalEvidence,
} from "./contracts/acquisition/rental-evidence.ts";
export {
  RentalFunctionTraceJsonSchema,
  RentalFunctionTraceSchema,
  type RentalFunctionTrace,
} from "./contracts/acquisition/rental-function-trace.ts";
export {
  StaticCensusJsonSchema,
  StaticCensusSchema,
  type StaticCensus,
} from "./contracts/acquisition/static-census.ts";
export {
  StructuredAssetIndexJsonSchema,
  StructuredAssetIndexSchema,
  type StructuredAssetIndex,
} from "./contracts/acquisition/structured-asset-index.ts";
export {
  StructuredValuesJsonSchema,
  StructuredValuesSchema,
  type StructuredValues,
} from "./contracts/acquisition/structured-values.ts";
export {
  UnlockableEvidenceJsonSchema,
  UnlockableEvidenceSchema,
  type UnlockableEvidence,
} from "./contracts/acquisition/unlockable-evidence.ts";
export {
  UnlockableFunctionTraceJsonSchema,
  UnlockableFunctionTraceSchema,
  type UnlockableFunctionTrace,
} from "./contracts/acquisition/unlockable-function-trace.ts";
export {
  UnlockableImplementationSitesJsonSchema,
  UnlockableImplementationSitesSchema,
  type UnlockableImplementationSites,
} from "./contracts/acquisition/unlockable-implementation-sites.ts";
export {
  UnlockableManagerTraceJsonSchema,
  UnlockableManagerTraceSchema,
  type UnlockableManagerTrace,
} from "./contracts/acquisition/unlockable-manager-trace.ts";

export {
  ConsoleReturnMechanicsJsonSchema,
  ConsoleReturnMechanicsSchema,
  type BlueprintFunctionEvidence,
  type ConsoleReturnMechanics,
  type DefaultPropertyEvidence,
  type RentalArtifactIdentity,
} from "./contracts/domain/console-return-mechanics.ts";
export {
  FilmCatalogJsonSchema,
  FilmCatalogSchema,
  filmGenres,
  type AcquisitionArtifactIdentity,
  type FilmCatalog,
  type FilmEvidence,
  type FilmGenre,
  type FilmRecord,
} from "./contracts/domain/film-catalog.ts";
export {
  MembershipFeeMechanicsJsonSchema,
  MembershipFeeMechanicsSchema,
  type ClassFieldEvidence,
  type MembershipFeeFieldDefinition,
  type MembershipFeeMechanics,
  type StructFieldEvidence,
} from "./contracts/domain/membership-fee-mechanics.ts";
export {
  MovieReturnMechanicsJsonSchema,
  MovieReturnMechanicsSchema,
  type BlueprintTraceEvidence,
  type MovieReturnArtifactIdentity,
  type MovieReturnMechanics,
  type PassedMovieReturnRuntimeValidation,
  type RentalReadinessTraceEvidence,
  type RentalSelectionTraceEvidence,
} from "./contracts/domain/movie-return-mechanics.ts";
export {
  NewReleaseUnlockMechanicsJsonSchema,
  NewReleaseUnlockMechanicsSchema,
  type NewReleaseUnlockArtifactIdentity,
  type NewReleaseUnlockMechanics,
} from "./contracts/domain/new-release-unlock-mechanics.ts";

export {
  MovieReturnObservationJsonSchema,
  MovieReturnObservationSchema,
  type CapturedMovieReferences,
  type CustomerReturnObservationEvent,
  type MovieReference,
  type MovieReturnObservation,
  type MovieReturnObservationEvent,
  type ReadinessObservationEvent,
  type SelectionObservationEvent,
} from "./contracts/runtime/movie-return-observation.ts";
export {
  MovieReturnRuntimeCollectorConfigJsonSchema,
  MovieReturnRuntimeCollectorConfigSchema,
  type MovieReturnRuntimeCollectorConfig,
} from "./contracts/runtime/movie-return-runtime-collector-config.ts";
export {
  RuntimeHostInstallationJsonSchema,
  RuntimeHostInstallationSchema,
  type RuntimeHostInstallation,
} from "./contracts/runtime/runtime-host-installation.ts";
export {
  RuntimeHostStagingJsonSchema,
  RuntimeHostStagingSchema,
  type RuntimeHostStaging,
} from "./contracts/runtime/runtime-host-staging.ts";

export {
  MovieReturnValidationJsonSchema,
  MovieReturnValidationSchema,
  type MovieReturnValidation,
  type MovieReturnValidationArtifact,
  type MovieReturnValidationIssue,
  type MovieReturnValidationIssueCode,
  type MovieReturnValidationReport,
  type ValidationSourceIdentity,
} from "./contracts/validation/movie-return-validation.ts";
