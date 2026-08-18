import type { CustomerShoppingMechanicsResearch } from "@neonretrorewind/core";

const evidenceIdentity = <
  const ArtifactType extends
    | "blueprint-selected-function-trace"
    | "blueprint-call-sites"
    | "level-progression-category-enums"
    | "private-blueprint-class-default-probe",
>(
  fileName: string,
  sha256Character: string,
  sizeBytes: number,
  artifactType: ArtifactType,
) => ({
  fileName,
  sha256: sha256Character.repeat(64),
  sizeBytes,
  artifactType,
});

export function createCustomerShoppingResearch(): Mutable<CustomerShoppingMechanicsResearch> {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ] as const;

  return structuredClone({
    artifactType: "customer-shopping-mechanics-research",
    build: { steamAppId: "123", steamBuildId: "456" },
    evidence: {
      demandEntry: evidenceIdentity(
        "demand-entry.json",
        "a",
        101,
        "blueprint-selected-function-trace",
      ),
      dayCalendarEnums: evidenceIdentity(
        "day-calendar.json",
        "b",
        102,
        "level-progression-category-enums",
      ),
      dayWeatherEnums: evidenceIdentity(
        "day-weather.json",
        "c",
        103,
        "level-progression-category-enums",
      ),
      productSelection: evidenceIdentity(
        "product-selection.json",
        "d",
        104,
        "blueprint-selected-function-trace",
      ),
      rentalHandoff: evidenceIdentity(
        "rental-handoff.json",
        "e",
        105,
        "blueprint-selected-function-trace",
      ),
      rentalHandoffCallSites: evidenceIdentity(
        "rental-handoff-call-sites.json",
        "f",
        106,
        "blueprint-call-sites",
      ),
      shelfEnums: evidenceIdentity(
        "shelf-enums.json",
        "1",
        107,
        "level-progression-category-enums",
      ),
      taskEnums: evidenceIdentity(
        "task-enums.json",
        "2",
        108,
        "level-progression-category-enums",
      ),
      customerDefaults: evidenceIdentity(
        "customer-defaults.json",
        "3",
        109,
        "private-blueprint-class-default-probe",
      ),
      shelfDefaults: evidenceIdentity(
        "shelf-defaults.json",
        "4",
        110,
        "private-blueprint-class-default-probe",
      ),
    },
    rules: {
      arrival: {
        timer: {
          intervalSeconds: 1,
          looping: true,
          maximumOncePerFrame: false,
          initialDelaySeconds: 0,
          initialDelayVarianceSeconds: 0,
        },
        gates: {
          openSignRequired: true,
          developerNoSpawnFlagMustBeFalse: true,
        },
        attemptWeight: {
          operation: "multiply-all-factors",
          factors: [
            "hour",
            "current-customers",
            "placed-shelves",
            "store-popularity",
            "weather",
            "calendar-event",
            "weekday",
            "active-sale-ad",
          ],
          randomFunction: "RandomBoolWithWeight",
          documentedMinimum: 0,
          documentedMaximum: 1,
          outOfRangeInterpretation: "weight-not-exact-probability",
        },
        factors: {
          weekday: {
            notSet: 0,
            sunday: 1,
            monday: 1,
            tuesday: 1,
            wednesday: 1,
            thursday: 1,
            friday: 5,
            saturday: 5,
          },
          weather: {
            notSet: 1,
            sunny: 1,
            cloud: 1,
            rain: 1.85,
            storm: 1.8,
            fog: 1.1,
            heatWave: 1,
            snowStorm: 1.8,
          },
          hour: {
            sharedMidnightThroughEighteen: Array.from(
              { length: 19 },
              (_, hour) => ({ hour, factor: hour < 7 ? 0 : 1 }),
            ),
            eveningByDay: days.map((day) => ({
              day,
              factors: Array.from({ length: 5 }, (_, index) => ({
                hour: index + 19,
                factor: 1,
              })),
            })),
            closingThresholds: days.map((day) => ({ day, thresholdHour: 23 })),
            cutoffMinute: 10,
            aboveThresholdRule: "zero-when-minute-greater-than-cutoff",
          },
          currentCustomers: {
            zero: 1500,
            one: 15,
            twoThroughThree: 5,
            fourThroughSix: 0.5,
            sevenThroughTen: {
              smallStore: 0.23,
              expandedStore: 0.68,
              expandedMinimumExpansionCount: 2,
            },
            smallStoreAboveTen: 0,
            expandedElevenThroughSeventeen: 0.33,
            expandedEighteenThroughTwentyFive: 0.05,
            expandedAboveTwentyFive: 0,
          },
          placedShelves: {
            fewerThanFour: 0.25,
            formulaFromFour:
              "map-clamped-(count-minus-three)-divided-by-twenty",
            inputMinimum: 0,
            inputMaximum: 1,
            outputMinimum: 0.25,
            outputMaximum: 1,
            maximumReachedAtCount: 23,
          },
          storePopularity: {
            base: 0.1,
            standee: { increment: 0.005, cap: 0.025 },
            snackShelf: { increment: 0.0025, cap: 0.01 },
            decoration: { increment: 0.0025, cap: 0.05 },
            posterFrame: { increment: 0.0025, cap: 0.075 },
            poweredMachineBonus: 0.005,
            poweredMachineTypes: ["slush", "popcorn", "cotton-candy"],
            maximum: 0.275,
          },
          calendarEvent: {
            minimumEffectiveFactor: 1,
            belowMinimumRule: "raise-to-one",
            unlistedEffectiveFactor: 1,
            nonNeutral: [
              "new-release-film",
              "romance",
              "horror",
              "holiday",
              "fall-halloween",
              "fall-harvest",
              "winter-xmas-holidays",
              "winter-santa-visiting",
              "winter-valentine-day",
              "winter-friday-13th",
              "spring-friday-13th",
              "summer-friday-13th",
              "spring-spring-break",
              "spring-flowers-festival",
              "spring-movie-star",
              "spring-medieval-fair",
              "summer-circus",
              "summer-film-noir",
              "summer-western-ferstival",
              "summer-store-birthday",
            ].map((event) => ({
              event,
              authoredLabel: event,
              factor: 1.1,
            })),
          },
          activeSaleAd: {
            applicableType: 1,
            formula: "one-plus-returned-bonus",
            otherwise: 1,
          },
        },
        spawn: {
          class: "AI_Client_Character_C",
          behaviorTree: "AI_Base_BehaviorTree",
          location: "navigable",
          firstCustomerCanUseNonRandomSpawner: true,
          laterCustomersUseRandomSpawner: true,
        },
        favoriteGenre: {
          source: "unlocked-movie-genres",
          excludesRawGenreZero: true,
          adultRawGenre: 16,
          adultIncludedWhenRequestsEnabled: true,
          baseWeight: 1,
          calendarBonusFormula:
            "one-plus-candidate-count-times-bonus-percent-divided-by-one-hundred-times-one-point-five",
          output: "Favorite Film Genre",
        },
      },
      shelfSelection: {
        exclusions: [
          "empty",
          "ai-pickup-disabled",
          "display-type",
          "already-visited",
        ],
        priority: ["new-release", "clearance", "favorite-genre", "general"],
        probabilisticDraw: "fresh-weighted-random-draw-per-priority-branch",
        newRelease: {
          baseChanceWithoutHeldNewRelease: 0.85,
          baseChanceWithHeldNewRelease: 0.05,
          saleBonus: "add-sidewalk-sign-new-release-bonus",
          clamp: "zero-through-one",
          choice: "closest",
          requiresReservation: true,
        },
        clearance: {
          baseChance: 0.1,
          saleBonus: "add-sidewalk-sign-clearance-bonus",
          explicitClamp: false,
          documentedWeightRange: "zero-through-one",
          outOfRangeInterpretation: "weight-not-exact-probability",
          choice: "random",
          requiresReservation: true,
        },
        favoriteGenre: {
          chance: 0.9,
          choice: "closest",
          requiresReservation: true,
        },
        general: {
          closestChance: 0.6,
          otherChoice: "random",
          preferReservablePool: true,
        },
        reservation: {
          action: "AI Reserve it",
          blackboardKey: "ShelfUsing",
          successfulMoveAddsVisitedShelf: true,
        },
        retry: {
          sameShelfLimit: 5,
          newShelfFailureWhenCounterGreaterThan: 3,
          failureFlag: "bMainPickUpTask_Failed",
        },
        noTarget: {
          result: "null",
          log: "No shelf is valid.",
          allShelvesEmptyHelperScope:
            "non-reserved-nonempty-console-rent-only",
          helperDoesNotProveFilmShelvesEmpty: true,
        },
      },
      productSelection: {
        source: "Shelve_Container_C contents",
        requiredClass: "Cartridge_Base_C",
        exclusions: ["scanner-error-reserved", "sku-already-held"],
        candidatePools: [
          "all-available",
          "favorite-genre",
          "new-release",
          "favorite-and-new-release",
        ],
        favoriteAndNewRelease: {
          preferredPoolChance: 0.75,
          fallbackPool: "favorite-genre",
        },
        newRelease: {
          preferredPoolChance: 0.75,
          fallbackPool: "all-available",
        },
        favoriteOnlyFallback: "favorite-genre",
        finalFallback: "all-available",
        noCandidateResult: "failure-with-null-cartridge-and-container",
        interactionTask: "Pick up a film",
      },
      pickup: {
        shelfNumberMeaning: "total-placed-shelf-count",
        validContextBands: [
          {
            id: "fewer-than-three",
            minimumPlacedShelves: 0,
            maximumPlacedShelves: 2,
            baseChance: 1,
            newReleaseBonus: 0,
            favoriteGenreBonus: 0,
            clamp: "zero-through-one",
          },
          {
            id: "three-through-twenty",
            minimumPlacedShelves: 3,
            maximumPlacedShelves: 20,
            baseChance: 0.6,
            newReleaseBonus: 0.2,
            favoriteGenreBonus: 0.3,
            clamp: "zero-through-one",
          },
          {
            id: "twenty-one-or-more",
            minimumPlacedShelves: 21,
            maximumPlacedShelves: null,
            baseChance: 0.75,
            newReleaseBonus: 0.2,
            favoriteGenreBonus: 0.2,
            clamp: "zero-through-one",
          },
        ],
        invalidContextChance: 0.5,
        failureResult: "move-away-and-finish",
        successPath: [
          "AI Pick UP",
          "Add Product To Basket",
          "Add Object To Inventory",
          "empty-shelf-container",
        ],
        heldInventory: "Holding Objects in Hands",
      },
      cartContinuation: {
        entryWeight: 1,
        buckets: [
          {
            bucket: 1,
            minimumPlacedShelves: 0,
            maximumPlacedShelves: 5,
            minimumPickDistribution: [{ minimumPick: 1, probability: 1 }],
          },
          {
            bucket: 2,
            minimumPlacedShelves: 6,
            maximumPlacedShelves: 11,
            minimumPickDistribution: [
              { minimumPick: 1, probability: 0.8 },
              { minimumPick: 2, probability: 0.2 },
            ],
          },
          {
            bucket: 3,
            minimumPlacedShelves: 12,
            maximumPlacedShelves: 29,
            minimumPickDistribution: [
              { minimumPick: 1, probability: 0.5 },
              { minimumPick: 2, probability: 0.5 },
            ],
          },
          {
            bucket: 4,
            minimumPlacedShelves: 30,
            maximumPlacedShelves: null,
            minimumPickDistribution: [
              { minimumPick: 1, probability: 0.12 },
              { minimumPick: 2, probability: 0.48 },
              { minimumPick: 3, probability: 0.4 },
            ],
          },
        ],
        targetDraw: {
          lowerBound: "current-minimum-pick",
          upperBound: 4,
          inclusive: true,
          distribution: "uniform-integer",
          redraw: "after-each-cartridge-added",
          finishCondition: "held-count-greater-than-or-equal-new-target",
        },
        completionCleanup: [
          "clear-focus",
          "release-shelf-reservation",
          "clear-ShelfUsing",
          "unsubscribe-inventory-event",
        ],
      },
      failures: [
        {
          stage: "shelf-selection",
          condition: "no-valid-shelf",
          result: "no-target",
          frequency: "runtime-dependent",
        },
        {
          stage: "movement",
          condition: "movement-failed",
          result: "retry-or-fail",
          frequency: "runtime-dependent",
        },
        {
          stage: "product-selection",
          condition: "no-valid-cartridge",
          result: "null-selection",
          frequency: "runtime-dependent",
        },
        {
          stage: "pickup-gate",
          condition: "weighted-random-failed",
          result: "move-away-and-finish",
          frequency: "runtime-dependent",
        },
        {
          stage: "shelf-retries",
          condition: "new-shelf-counter-greater-than-three",
          result: "set-failure-flag-and-cancel",
          frequency: "runtime-dependent",
        },
        {
          stage: "rental-handoff",
          condition: "AI-Throw-failed",
          result: "stop-current-invocation",
          frequency: "runtime-dependent",
        },
      ],
      rentalHandoff: {
        ordinaryCaller:
          "BTTask_GoBackHome_C.ExecuteUbergraph_BTTask_GoBackHome",
        callerStatementIndex: 622,
        completeCallSiteCount: 6,
        function: "Sent On To Rent All Objects In Inventory",
        itemOrder: "index-zero-until-empty",
        perAdditionalItemDelaySeconds: 0.02,
        cartridgePath: [
          "AI Throw",
          "Send to Rent Storage",
          "Add Product to Rent List",
          "increment-exact-sku-rental-count",
        ],
        membershipSource: "client-membership-number",
        selectionOrPickupRecordsRental: false,
        registrationBoundary: "successful-go-home-inventory-handoff",
        throwFailure: "print-failure-and-stop-current-invocation",
        behaviorTreeTopology: "not-extracted",
      },
    },
    runtimeValidation: "not-run",
  });
}

export const customerShoppingResearchSource = {
  fileName: "customer-shopping-mechanics-research.json",
  sha256: "5".repeat(64),
  sizeBytes: 1_000,
  artifactType: "customer-shopping-mechanics-research" as const,
};

type Mutable<Value> = Value extends object
  ? { -readonly [Key in keyof Value]: Mutable<Value[Key]> }
  : Value;
