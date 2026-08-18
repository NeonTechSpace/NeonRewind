export { assertArtifactContract } from "./assert-artifact-contract.ts";

export {
  LevelProgressionTargetProfileSchema,
  type LevelProgressionTargetProfile,
} from "./contracts/config/level-progression-target-profile.ts";
export {
  MarketEvidenceTargetProfileSchema,
  type MarketEvidenceTargetProfile,
} from "./contracts/config/market-evidence-target-profile.ts";

export {
  BlueprintCallCandidateTraceSchema,
  type BlueprintCallCandidateTrace,
} from "./contracts/acquisition/blueprint-call-candidate-trace.ts";
export {
  BlueprintCallTargetTraceSchema,
  type BlueprintCallTargetTrace,
} from "./contracts/acquisition/blueprint-call-target-trace.ts";
export {
  BlueprintCallSitesSchema,
  type BlueprintCallSites,
} from "./contracts/acquisition/blueprint-call-sites.ts";
export {
  BlueprintCallerBodiesSchema,
  type BlueprintCallerBodies,
} from "./contracts/acquisition/blueprint-caller-bodies.ts";
export {
  BlueprintFunctionDeclarationsSchema,
  type BlueprintFunctionDeclarations,
} from "./contracts/acquisition/blueprint-function-declarations.ts";
export {
  BlueprintFunctionInventorySchema,
  type BlueprintFunctionInventory,
} from "./contracts/acquisition/blueprint-function-inventory.ts";
export {
  BlueprintFunctionTraceSchema,
  type BlueprintFunctionTrace,
} from "./contracts/acquisition/blueprint-function-trace.ts";
export {
  BlueprintPropertyReferencesSchema,
  type BlueprintPropertyReferences,
} from "./contracts/acquisition/blueprint-property-references.ts";
export {
  BlueprintPropertyReferenceTraceSchema,
  type BlueprintPropertyReferenceTrace,
} from "./contracts/acquisition/blueprint-property-reference-trace.ts";
export {
  BlueprintSelectedFunctionTraceSchema,
  type BlueprintSelectedFunctionTrace,
} from "./contracts/acquisition/blueprint-selected-function-trace.ts";
export {
  BuildManifestSchema,
  type BuildManifest,
} from "./contracts/acquisition/build-manifest.ts";
export {
  GameplayUnlockEnumSchema,
  type GameplayUnlockEnum,
} from "./contracts/acquisition/gameplay-unlock-enum.ts";
export {
  LevelProgressionCategoryEnumsSchema,
  type LevelProgressionCategoryEnums,
} from "./contracts/acquisition/level-progression-category-enums.ts";
export {
  MarketEvidenceSchema,
  type MarketEvidence,
} from "./contracts/acquisition/market-evidence.ts";
export {
  RentalBlueprintBodiesSchema,
  type RentalBlueprintBodies,
} from "./contracts/acquisition/rental-blueprint-bodies.ts";
export {
  RentalEvidenceSchema,
  type RentalEvidence,
} from "./contracts/acquisition/rental-evidence.ts";
export {
  RentalFunctionTraceSchema,
  type RentalFunctionTrace,
} from "./contracts/acquisition/rental-function-trace.ts";
export {
  StaticCensusSchema,
  type StaticCensus,
} from "./contracts/acquisition/static-census.ts";
export {
  StatisticEvidenceSchema,
  type StatisticEvidence,
} from "./contracts/acquisition/statistic-evidence.ts";
export {
  StructuredAssetIndexSchema,
  type StructuredAssetIndex,
} from "./contracts/acquisition/structured-asset-index.ts";
export {
  StructuredValuesSchema,
  type StructuredValues,
} from "./contracts/acquisition/structured-values.ts";
export {
  UnlockableEvidenceSchema,
  type UnlockableEvidence,
} from "./contracts/acquisition/unlockable-evidence.ts";
export {
  UnlockableFunctionTraceSchema,
  type UnlockableFunctionTrace,
} from "./contracts/acquisition/unlockable-function-trace.ts";
export {
  UnlockableImplementationSitesSchema,
  type UnlockableImplementationSites,
} from "./contracts/acquisition/unlockable-implementation-sites.ts";
export {
  UnlockableManagerTraceSchema,
  type UnlockableManagerTrace,
} from "./contracts/acquisition/unlockable-manager-trace.ts";

export {
  ConsoleReturnMechanicsSchema,
  type BlueprintFunctionEvidence,
  type ConsoleReturnMechanics,
  type DefaultPropertyEvidence,
  type RentalArtifactIdentity,
} from "./contracts/domain/console-return-mechanics.ts";
export {
  CheckoutIncomeResearchSchema,
  CheckoutIncomeSchema,
  type CheckoutIncome,
  type CheckoutIncomeResearch,
  type CheckoutIncomeSourceIdentity,
} from "./contracts/domain/checkout-income.ts";
export {
  CustomerShoppingMechanicsResearchSchema,
  CustomerShoppingMechanicsSchema,
  type CustomerShoppingEvidenceIdentity,
  type CustomerShoppingMechanics,
  type CustomerShoppingMechanicsResearch,
  type CustomerShoppingSourceIdentity,
} from "./contracts/domain/customer-shopping-mechanics.ts";
export {
  FilmCatalogSchema,
  filmGenres,
  type AcquisitionArtifactIdentity,
  type FilmCatalog,
  type FilmEvidence,
  type FilmGenre,
  type FilmRecord,
} from "./contracts/domain/film-catalog.ts";
export {
  MembershipFeeMechanicsSchema,
  type ClassFieldEvidence,
  type MembershipFeeFieldDefinition,
  type MembershipFeeMechanics,
  type StructFieldEvidence,
} from "./contracts/domain/membership-fee-mechanics.ts";
export {
  LevelProgressionSchema,
  type LevelProgression,
  type LevelProgressionArtifactIdentity,
  type LevelProgressionThreshold,
} from "./contracts/domain/level-progression.ts";
export {
  MovieReturnMechanicsSchema,
  type BlueprintTraceEvidence,
  type MovieReturnArtifactIdentity,
  type MovieReturnMechanics,
  type PassedMovieReturnRuntimeValidation,
  type RentalReadinessTraceEvidence,
  type RentalSelectionTraceEvidence,
} from "./contracts/domain/movie-return-mechanics.ts";
export {
  NewReleaseMechanicsSchema,
  type NewReleaseArtifactIdentity,
  type NewReleaseMechanics,
} from "./contracts/domain/new-release-mechanics.ts";
export {
  MarketMechanicsResearchSchema,
  MarketMechanicsSchema,
  type MarketMechanics,
  type MarketMechanicsResearch,
  type MarketMechanicsSourceIdentity,
} from "./contracts/domain/market-mechanics.ts";
export {
  MarketGuideFindingsSchema,
  type MarketGuideFindings,
  type MarketGuideFindingsSourceIdentity,
} from "./contracts/domain/market-guide-findings.ts";
export {
  MarketValueAnalysisSchema,
  type MarketValueAnalysis,
  type MarketValueSourceIdentity,
} from "./contracts/domain/market-value-analysis.ts";
export {
  MarketRentalEconomicsResearchSchema,
  MarketRentalEconomicsSchema,
  type MarketRentalEconomics,
  type MarketRentalEconomicsEvidenceIdentity,
  type MarketRentalEconomicsResearch,
  type MarketRentalEconomicsSourceIdentity,
} from "./contracts/domain/market-rental-economics.ts";

export {
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
  MovieReturnRuntimeCollectorConfigSchema,
  type MovieReturnRuntimeCollectorConfig,
} from "./contracts/runtime/movie-return-runtime-collector-config.ts";
export {
  RuntimeHostInstallationSchema,
  type RuntimeHostInstallation,
} from "./contracts/runtime/runtime-host-installation.ts";
export {
  RuntimeHostStagingSchema,
  type RuntimeHostStaging,
} from "./contracts/runtime/runtime-host-staging.ts";

export {
  MovieReturnValidationSchema,
  type MovieReturnValidation,
  type MovieReturnValidationArtifact,
  type MovieReturnValidationIssue,
  type MovieReturnValidationIssueCode,
  type MovieReturnValidationReport,
  type ValidationSourceIdentity,
} from "./contracts/validation/movie-return-validation.ts";
