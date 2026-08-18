import { type } from "arktype";

const sha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const nonEmptyString = type("string").atLeastLength(1);
const integer = type("number.integer");
const nonNegativeInteger = integer.atLeast(0);
const positiveInteger = integer.atLeast(1);
const nonNegativeNumber = type("number").atLeast(0);
const probability = nonNegativeNumber.atMost(1);
const nullableNonNegativeInteger = nonNegativeInteger.or(type.unit(null));

const build = type({
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();

const fileName = type("string")
  .matching(new RegExp("^[^/\\\\]+\\.json$"))
  .atLeastLength(1);

const selectedTraceIdentity = type({
  fileName,
  sha256,
  sizeBytes: positiveInteger,
  artifactType: type.unit("blueprint-selected-function-trace"),
  "+": "reject",
}).readonly();

const callSitesIdentity = type({
  fileName,
  sha256,
  sizeBytes: positiveInteger,
  artifactType: type.unit("blueprint-call-sites"),
  "+": "reject",
}).readonly();

const enumIdentity = type({
  fileName,
  sha256,
  sizeBytes: positiveInteger,
  artifactType: type.unit("level-progression-category-enums"),
  "+": "reject",
}).readonly();

const privateDefaultsIdentity = type({
  fileName,
  sha256,
  sizeBytes: positiveInteger,
  artifactType: type.unit("private-blueprint-class-default-probe"),
  "+": "reject",
}).readonly();

const researchIdentity = type({
  fileName,
  sha256,
  sizeBytes: positiveInteger,
  artifactType: type.unit("customer-shopping-mechanics-research"),
  "+": "reject",
}).readonly();

const evidence = type({
  demandEntry: selectedTraceIdentity,
  dayCalendarEnums: enumIdentity,
  dayWeatherEnums: enumIdentity,
  productSelection: selectedTraceIdentity,
  rentalHandoff: selectedTraceIdentity,
  rentalHandoffCallSites: callSitesIdentity,
  shelfEnums: enumIdentity,
  taskEnums: enumIdentity,
  customerDefaults: privateDefaultsIdentity,
  shelfDefaults: privateDefaultsIdentity,
  "+": "reject",
}).readonly();

const day = type.enumerated(
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
);

const hourFactor = type({
  hour: nonNegativeInteger.atMost(23),
  factor: nonNegativeNumber,
  "+": "reject",
}).readonly();

const eveningFactors = type({
  day,
  factors: hourFactor.array().readonly().atLeastLength(5),
  "+": "reject",
}).readonly();

const closingThreshold = type({
  day,
  thresholdHour: nonNegativeInteger.atMost(23),
  "+": "reject",
}).readonly();

const calendarFactor = type({
  event: nonEmptyString,
  authoredLabel: nonEmptyString,
  factor: nonNegativeNumber,
  "+": "reject",
}).readonly();

const arrival = type({
  timer: type({
    intervalSeconds: type.unit(1),
    looping: type.unit(true),
    maximumOncePerFrame: type.unit(false),
    initialDelaySeconds: type.unit(0),
    initialDelayVarianceSeconds: type.unit(0),
    "+": "reject",
  }).readonly(),
  gates: type({
    openSignRequired: type.unit(true),
    developerNoSpawnFlagMustBeFalse: type.unit(true),
    "+": "reject",
  }).readonly(),
  attemptWeight: type({
    operation: type.unit("multiply-all-factors"),
    factors: type([
      type.unit("hour"),
      type.unit("current-customers"),
      type.unit("placed-shelves"),
      type.unit("store-popularity"),
      type.unit("weather"),
      type.unit("calendar-event"),
      type.unit("weekday"),
      type.unit("active-sale-ad"),
    ]).readonly(),
    randomFunction: type.unit("RandomBoolWithWeight"),
    documentedMinimum: type.unit(0),
    documentedMaximum: type.unit(1),
    outOfRangeInterpretation: type.unit("weight-not-exact-probability"),
    "+": "reject",
  }).readonly(),
  factors: type({
    weekday: type({
      notSet: type.unit(0),
      sunday: type.unit(1),
      monday: type.unit(1),
      tuesday: type.unit(1),
      wednesday: type.unit(1),
      thursday: type.unit(1),
      friday: type.unit(5),
      saturday: type.unit(5),
      "+": "reject",
    }).readonly(),
    weather: type({
      notSet: type.unit(1),
      sunny: type.unit(1),
      cloud: type.unit(1),
      rain: type.unit(1.85),
      storm: type.unit(1.8),
      fog: type.unit(1.1),
      heatWave: type.unit(1),
      snowStorm: type.unit(1.8),
      "+": "reject",
    }).readonly(),
    hour: type({
      sharedMidnightThroughEighteen: hourFactor.array().readonly().atLeastLength(19),
      eveningByDay: eveningFactors.array().readonly().atLeastLength(7),
      closingThresholds: closingThreshold.array().readonly().atLeastLength(7),
      cutoffMinute: type.unit(10),
      aboveThresholdRule: type.unit("zero-when-minute-greater-than-cutoff"),
      "+": "reject",
    }).readonly(),
    currentCustomers: type({
      zero: type.unit(1500),
      one: type.unit(15),
      twoThroughThree: type.unit(5),
      fourThroughSix: type.unit(0.5),
      sevenThroughTen: type({
        smallStore: type.unit(0.23),
        expandedStore: type.unit(0.68),
        expandedMinimumExpansionCount: type.unit(2),
        "+": "reject",
      }).readonly(),
      smallStoreAboveTen: type.unit(0),
      expandedElevenThroughSeventeen: type.unit(0.33),
      expandedEighteenThroughTwentyFive: type.unit(0.05),
      expandedAboveTwentyFive: type.unit(0),
      "+": "reject",
    }).readonly(),
    placedShelves: type({
      fewerThanFour: type.unit(0.25),
      formulaFromFour: type.unit("map-clamped-(count-minus-three)-divided-by-twenty"),
      inputMinimum: type.unit(0),
      inputMaximum: type.unit(1),
      outputMinimum: type.unit(0.25),
      outputMaximum: type.unit(1),
      maximumReachedAtCount: type.unit(23),
      "+": "reject",
    }).readonly(),
    storePopularity: type({
      base: type.unit(0.1),
      standee: type({ increment: type.unit(0.005), cap: type.unit(0.025), "+": "reject" }).readonly(),
      snackShelf: type({ increment: type.unit(0.0025), cap: type.unit(0.01), "+": "reject" }).readonly(),
      decoration: type({ increment: type.unit(0.0025), cap: type.unit(0.05), "+": "reject" }).readonly(),
      posterFrame: type({ increment: type.unit(0.0025), cap: type.unit(0.075), "+": "reject" }).readonly(),
      poweredMachineBonus: type.unit(0.005),
      poweredMachineTypes: type([
        type.unit("slush"),
        type.unit("popcorn"),
        type.unit("cotton-candy"),
      ]).readonly(),
      maximum: type.unit(0.275),
      "+": "reject",
    }).readonly(),
    calendarEvent: type({
      minimumEffectiveFactor: type.unit(1),
      belowMinimumRule: type.unit("raise-to-one"),
      unlistedEffectiveFactor: type.unit(1),
      nonNeutral: calendarFactor.array().readonly().atLeastLength(1),
      "+": "reject",
    }).readonly(),
    activeSaleAd: type({
      applicableType: type.unit(1),
      formula: type.unit("one-plus-returned-bonus"),
      otherwise: type.unit(1),
      "+": "reject",
    }).readonly(),
    "+": "reject",
  }).readonly(),
  spawn: type({
    class: type.unit("AI_Client_Character_C"),
    behaviorTree: type.unit("AI_Base_BehaviorTree"),
    location: type.unit("navigable"),
    firstCustomerCanUseNonRandomSpawner: type.unit(true),
    laterCustomersUseRandomSpawner: type.unit(true),
    "+": "reject",
  }).readonly(),
  favoriteGenre: type({
    source: type.unit("unlocked-movie-genres"),
    excludesRawGenreZero: type.unit(true),
    adultRawGenre: type.unit(16),
    adultIncludedWhenRequestsEnabled: type.unit(true),
    baseWeight: type.unit(1),
    calendarBonusFormula: type.unit("one-plus-candidate-count-times-bonus-percent-divided-by-one-hundred-times-one-point-five"),
    output: type.unit("Favorite Film Genre"),
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

const shelfSelection = type({
  exclusions: type([
    type.unit("empty"),
    type.unit("ai-pickup-disabled"),
    type.unit("display-type"),
    type.unit("already-visited"),
  ]).readonly(),
  priority: type([
    type.unit("new-release"),
    type.unit("clearance"),
    type.unit("favorite-genre"),
    type.unit("general"),
  ]).readonly(),
  probabilisticDraw: type.unit("fresh-weighted-random-draw-per-priority-branch"),
  newRelease: type({
    baseChanceWithoutHeldNewRelease: type.unit(0.85),
    baseChanceWithHeldNewRelease: type.unit(0.05),
    saleBonus: type.unit("add-sidewalk-sign-new-release-bonus"),
    clamp: type.unit("zero-through-one"),
    choice: type.unit("closest"),
    requiresReservation: type.unit(true),
    "+": "reject",
  }).readonly(),
  clearance: type({
    baseChance: type.unit(0.1),
    saleBonus: type.unit("add-sidewalk-sign-clearance-bonus"),
    explicitClamp: type.unit(false),
    documentedWeightRange: type.unit("zero-through-one"),
    outOfRangeInterpretation: type.unit("weight-not-exact-probability"),
    choice: type.unit("random"),
    requiresReservation: type.unit(true),
    "+": "reject",
  }).readonly(),
  favoriteGenre: type({
    chance: type.unit(0.9),
    choice: type.unit("closest"),
    requiresReservation: type.unit(true),
    "+": "reject",
  }).readonly(),
  general: type({
    closestChance: type.unit(0.6),
    otherChoice: type.unit("random"),
    preferReservablePool: type.unit(true),
    "+": "reject",
  }).readonly(),
  reservation: type({
    action: type.unit("AI Reserve it"),
    blackboardKey: type.unit("ShelfUsing"),
    successfulMoveAddsVisitedShelf: type.unit(true),
    "+": "reject",
  }).readonly(),
  retry: type({
    sameShelfLimit: type.unit(5),
    newShelfFailureWhenCounterGreaterThan: type.unit(3),
    failureFlag: type.unit("bMainPickUpTask_Failed"),
    "+": "reject",
  }).readonly(),
  noTarget: type({
    result: type.unit("null"),
    log: type.unit("No shelf is valid."),
    allShelvesEmptyHelperScope: type.unit("non-reserved-nonempty-console-rent-only"),
    helperDoesNotProveFilmShelvesEmpty: type.unit(true),
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

const productSelection = type({
  source: type.unit("Shelve_Container_C contents"),
  requiredClass: type.unit("Cartridge_Base_C"),
  exclusions: type([
    type.unit("scanner-error-reserved"),
    type.unit("sku-already-held"),
  ]).readonly(),
  candidatePools: type([
    type.unit("all-available"),
    type.unit("favorite-genre"),
    type.unit("new-release"),
    type.unit("favorite-and-new-release"),
  ]).readonly(),
  favoriteAndNewRelease: type({
    preferredPoolChance: type.unit(0.75),
    fallbackPool: type.unit("favorite-genre"),
    "+": "reject",
  }).readonly(),
  newRelease: type({
    preferredPoolChance: type.unit(0.75),
    fallbackPool: type.unit("all-available"),
    "+": "reject",
  }).readonly(),
  favoriteOnlyFallback: type.unit("favorite-genre"),
  finalFallback: type.unit("all-available"),
  noCandidateResult: type.unit("failure-with-null-cartridge-and-container"),
  interactionTask: type.unit("Pick up a film"),
  "+": "reject",
}).readonly();

const pickupBand = type({
  id: type.enumerated("fewer-than-three", "three-through-twenty", "twenty-one-or-more"),
  minimumPlacedShelves: nonNegativeInteger,
  maximumPlacedShelves: nullableNonNegativeInteger,
  baseChance: probability,
  newReleaseBonus: probability,
  favoriteGenreBonus: probability,
  clamp: type.unit("zero-through-one"),
  "+": "reject",
}).readonly();

const pickup = type({
  shelfNumberMeaning: type.unit("total-placed-shelf-count"),
  validContextBands: pickupBand.array().readonly().atLeastLength(3),
  invalidContextChance: type.unit(0.5),
  failureResult: type.unit("move-away-and-finish"),
  successPath: type([
    type.unit("AI Pick UP"),
    type.unit("Add Product To Basket"),
    type.unit("Add Object To Inventory"),
    type.unit("empty-shelf-container"),
  ]).readonly(),
  heldInventory: type.unit("Holding Objects in Hands"),
  "+": "reject",
}).readonly();

const minimumPickProbability = type({
  minimumPick: positiveInteger.atMost(3),
  probability,
  "+": "reject",
}).readonly();

const cartBucket = type({
  bucket: positiveInteger.atMost(4),
  minimumPlacedShelves: nonNegativeInteger,
  maximumPlacedShelves: nullableNonNegativeInteger,
  minimumPickDistribution: minimumPickProbability.array().readonly().atLeastLength(1),
  "+": "reject",
}).readonly();

const cartContinuation = type({
  entryWeight: type.unit(1),
  buckets: cartBucket.array().readonly().atLeastLength(4),
  targetDraw: type({
    lowerBound: type.unit("current-minimum-pick"),
    upperBound: type.unit(4),
    inclusive: type.unit(true),
    distribution: type.unit("uniform-integer"),
    redraw: type.unit("after-each-cartridge-added"),
    finishCondition: type.unit("held-count-greater-than-or-equal-new-target"),
    "+": "reject",
  }).readonly(),
  completionCleanup: type([
    type.unit("clear-focus"),
    type.unit("release-shelf-reservation"),
    type.unit("clear-ShelfUsing"),
    type.unit("unsubscribe-inventory-event"),
  ]).readonly(),
  "+": "reject",
}).readonly();

const failurePath = type({
  stage: type.enumerated(
    "shelf-selection",
    "movement",
    "product-selection",
    "pickup-gate",
    "shelf-retries",
    "rental-handoff",
  ),
  condition: nonEmptyString,
  result: nonEmptyString,
  frequency: type.unit("runtime-dependent"),
  "+": "reject",
}).readonly();

const rentalHandoff = type({
  ordinaryCaller: type.unit("BTTask_GoBackHome_C.ExecuteUbergraph_BTTask_GoBackHome"),
  callerStatementIndex: type.unit(622),
  completeCallSiteCount: type.unit(6),
  function: type.unit("Sent On To Rent All Objects In Inventory"),
  itemOrder: type.unit("index-zero-until-empty"),
  perAdditionalItemDelaySeconds: type.unit(0.02),
  cartridgePath: type([
    type.unit("AI Throw"),
    type.unit("Send to Rent Storage"),
    type.unit("Add Product to Rent List"),
    type.unit("increment-exact-sku-rental-count"),
  ]).readonly(),
  membershipSource: type.unit("client-membership-number"),
  selectionOrPickupRecordsRental: type.unit(false),
  registrationBoundary: type.unit("successful-go-home-inventory-handoff"),
  throwFailure: type.unit("print-failure-and-stop-current-invocation"),
  behaviorTreeTopology: type.unit("not-extracted"),
  "+": "reject",
}).readonly();

const rules = type({
  arrival,
  shelfSelection,
  productSelection,
  pickup,
  cartContinuation,
  failures: failurePath.array().readonly().atLeastLength(1),
  rentalHandoff,
  "+": "reject",
}).readonly();

const shelfRouteInputs = type({
  hasNewReleasePool: type("boolean"),
  hasClearancePool: type("boolean"),
  hasFavoriteGenrePool: type("boolean"),
  hasGeneralPool: type("boolean"),
  holdsNewRelease: type("boolean"),
  newReleaseSaleBonus: nonNegativeNumber,
  clearanceSaleBonus: nonNegativeNumber,
  "+": "reject",
}).readonly();

const shelfRouteOutcomes = type({
  newRelease: probability,
  clearance: probability,
  favoriteGenre: probability,
  general: probability,
  noValidShelf: probability,
  probabilityTotal: type.unit(1),
  "+": "reject",
}).readonly();

const shelfRouteScenario = type({
  id: type.enumerated(
    "no-eligible-shelves",
    "general-only",
    "new-release-not-held",
    "new-release-already-held",
    "clearance-only-priority",
    "favorite-only-priority",
    "all-priorities-not-held",
    "all-priorities-already-held",
  ),
  inputs: shelfRouteInputs,
  selectedBy: shelfRouteOutcomes,
  "+": "reject",
}).readonly();

const pickupScenario = type({
  band: pickupBand.get("id"),
  isNewRelease: type("boolean"),
  isFavoriteGenre: type("boolean"),
  chance: probability,
  condition: type.unit("valid-context-and-selected-product"),
  "+": "reject",
}).readonly();

const cartSizeProbability = type({
  products: positiveInteger.atMost(4),
  probability,
  "+": "reject",
}).readonly();

const cartScenario = type({
  bucket: positiveInteger.atMost(4),
  placedShelfRange: type({
    minimum: nonNegativeInteger,
    maximum: nullableNonNegativeInteger,
    "+": "reject",
  }).readonly(),
  initialHeldProducts: type.unit(0),
  finalProductCount: cartSizeProbability.array().readonly().atLeastLength(1),
  expectedProducts: type("number").atLeast(1).atMost(4),
  probabilityTotal: type.unit(1),
  condition: type.unit("start-empty-and-complete-enough-successful-pickups-before-task-failure"),
  "+": "reject",
}).readonly();

export const CustomerShoppingMechanicsResearchSchema = type({
  artifactType: type.unit("customer-shopping-mechanics-research"),
  build,
  evidence,
  rules,
  runtimeValidation: type.unit("not-run"),
  "+": "reject",
}).readonly();

export const CustomerShoppingMechanicsSchema = type({
  artifactType: type.unit("customer-shopping-mechanics"),
  build,
  sources: type({
    research: researchIdentity,
    evidence,
    "+": "reject",
  }).readonly(),
  scope: type.unit("customer-arrival-shopping-and-rental-registration"),
  evidenceLevel: type.unit("curated-static-analysis"),
  runtimeValidation: type.unit("not-run"),
  rules,
  scenarios: type({
    shelfRouteSelection: shelfRouteScenario.array().readonly().atLeastLength(8),
    pickupChance: pickupScenario.array().readonly().atLeastLength(12),
    cartCompletion: cartScenario.array().readonly().atLeastLength(4),
    "+": "reject",
  }).readonly(),
  conversionBoundary: type({
    recordedRentalRequires: type([
      type.unit("held-cartridge"),
      type.unit("go-home-inventory-handoff"),
      type.unit("AI-Throw-succeeded"),
      type.unit("Send-to-Rent-Storage"),
      type.unit("rental-storage-recorded"),
    ]).readonly(),
    spawnToHandoffTaskSequence: type.unit("not-proven-without-behavior-tree-topology"),
    visitToRecordedRentalRate: type.unit("not-quantifiable-from-static-inputs"),
    reasons: type([
      type.unit("arrival-weight-can-exceed-documented-range"),
      type.unit("clearance-weight-can-exceed-documented-range"),
      type.unit("inventory-and-reservation-state-dependent"),
      type.unit("movement-pickup-and-retry-frequencies-unobserved"),
      type.unit("AI-Throw-can-stop-handoff"),
      type.unit("behavior-tree-topology-not-extracted"),
    ]).readonly(),
    "+": "reject",
  }).readonly(),
  guideClaimStatus: type({
    arrivalWeightRules: type.unit("eligible-with-build-limit"),
    shelfSelectionRules: type.unit("eligible-with-build-limit"),
    pickupChanceRules: type.unit("eligible-with-build-limit"),
    conditionalCartScenarios: type.unit("eligible-with-build-limit-and-condition"),
    rentalRegistrationBoundary: type.unit("eligible-with-build-limit"),
    visitConversionRate: type.unit("unsupported-by-inputs"),
    expectedRentalIncome: type.unit("unsupported-by-inputs"),
    stockingRecommendation: type.unit("unsupported-by-inputs"),
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

export type CustomerShoppingMechanicsResearch =
  typeof CustomerShoppingMechanicsResearchSchema.infer;
export type CustomerShoppingMechanics =
  typeof CustomerShoppingMechanicsSchema.infer;
export type CustomerShoppingEvidenceIdentity =
  CustomerShoppingMechanicsResearch["evidence"][keyof CustomerShoppingMechanicsResearch["evidence"]];
export type CustomerShoppingSourceIdentity =
  CustomerShoppingMechanics["sources"]["research"] |
  CustomerShoppingEvidenceIdentity;
