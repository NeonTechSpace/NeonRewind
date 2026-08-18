import {
  CustomerShoppingMechanicsSchema,
  type CustomerShoppingMechanics,
  type CustomerShoppingMechanicsResearch,
  type CustomerShoppingSourceIdentity,
} from "@neonretrorewind/core";

type ResearchIdentity = Extract<
  CustomerShoppingSourceIdentity,
  { readonly artifactType: "customer-shopping-mechanics-research" }
>;
type ShelfScenario = CustomerShoppingMechanics["scenarios"]["shelfRouteSelection"][number];
type ShelfScenarioInputs = ShelfScenario["inputs"];
type PickupScenario = CustomerShoppingMechanics["scenarios"]["pickupChance"][number];
type CartScenario = CustomerShoppingMechanics["scenarios"]["cartCompletion"][number];

const days = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const nonNeutralCalendarEvents = [
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
] as const;

const shelfScenarioInputs = [
  {
    id: "no-eligible-shelves",
    hasNewReleasePool: false,
    hasClearancePool: false,
    hasFavoriteGenrePool: false,
    hasGeneralPool: false,
    holdsNewRelease: false,
  },
  {
    id: "general-only",
    hasNewReleasePool: false,
    hasClearancePool: false,
    hasFavoriteGenrePool: false,
    hasGeneralPool: true,
    holdsNewRelease: false,
  },
  {
    id: "new-release-not-held",
    hasNewReleasePool: true,
    hasClearancePool: false,
    hasFavoriteGenrePool: false,
    hasGeneralPool: true,
    holdsNewRelease: false,
  },
  {
    id: "new-release-already-held",
    hasNewReleasePool: true,
    hasClearancePool: false,
    hasFavoriteGenrePool: false,
    hasGeneralPool: true,
    holdsNewRelease: true,
  },
  {
    id: "clearance-only-priority",
    hasNewReleasePool: false,
    hasClearancePool: true,
    hasFavoriteGenrePool: false,
    hasGeneralPool: true,
    holdsNewRelease: false,
  },
  {
    id: "favorite-only-priority",
    hasNewReleasePool: false,
    hasClearancePool: false,
    hasFavoriteGenrePool: true,
    hasGeneralPool: true,
    holdsNewRelease: false,
  },
  {
    id: "all-priorities-not-held",
    hasNewReleasePool: true,
    hasClearancePool: true,
    hasFavoriteGenrePool: true,
    hasGeneralPool: true,
    holdsNewRelease: false,
  },
  {
    id: "all-priorities-already-held",
    hasNewReleasePool: true,
    hasClearancePool: true,
    hasFavoriteGenrePool: true,
    hasGeneralPool: true,
    holdsNewRelease: true,
  },
] as const;

export function compileCustomerShoppingMechanics(
  research: CustomerShoppingMechanicsResearch,
  researchSource: ResearchIdentity,
): CustomerShoppingMechanics {
  assertResearch(research);

  return CustomerShoppingMechanicsSchema.assert({
    artifactType: "customer-shopping-mechanics",
    build: research.build,
    sources: {
      research: researchSource,
      evidence: research.evidence,
    },
    scope: "customer-arrival-shopping-and-rental-registration",
    evidenceLevel: "curated-static-analysis",
    runtimeValidation: research.runtimeValidation,
    rules: research.rules,
    scenarios: {
      shelfRouteSelection: compileShelfScenarios(research),
      pickupChance: compilePickupScenarios(research),
      cartCompletion: compileCartScenarios(research),
    },
    conversionBoundary: {
      recordedRentalRequires: [
        "held-cartridge",
        "go-home-inventory-handoff",
        "AI-Throw-succeeded",
        "Send-to-Rent-Storage",
        "rental-storage-recorded",
      ],
      spawnToHandoffTaskSequence:
        "not-proven-without-behavior-tree-topology",
      visitToRecordedRentalRate: "not-quantifiable-from-static-inputs",
      reasons: [
        "arrival-weight-can-exceed-documented-range",
        "clearance-weight-can-exceed-documented-range",
        "inventory-and-reservation-state-dependent",
        "movement-pickup-and-retry-frequencies-unobserved",
        "AI-Throw-can-stop-handoff",
        "behavior-tree-topology-not-extracted",
      ],
    },
    guideClaimStatus: {
      arrivalWeightRules: "eligible-with-build-limit",
      shelfSelectionRules: "eligible-with-build-limit",
      pickupChanceRules: "eligible-with-build-limit",
      conditionalCartScenarios: "eligible-with-build-limit-and-condition",
      rentalRegistrationBoundary: "eligible-with-build-limit",
      visitConversionRate: "unsupported-by-inputs",
      expectedRentalIncome: "unsupported-by-inputs",
      stockingRecommendation: "unsupported-by-inputs",
    },
  });
}

function assertResearch(research: CustomerShoppingMechanicsResearch): void {
  assertUniqueEvidenceFiles(research);
  assertArrivalSchedules(research);
  assertStorePopularityMaximum(research);
  assertPickupBands(research);
  assertCartBuckets(research);
  assertFailurePaths(research);
}

function assertUniqueEvidenceFiles(
  research: CustomerShoppingMechanicsResearch,
): void {
  const names = Object.values(research.evidence).map((source) => source.fileName);
  if (new Set(names).size !== names.length) {
    throw new Error("Customer-shopping research contains duplicate evidence filenames.");
  }
}

function assertArrivalSchedules(
  research: CustomerShoppingMechanicsResearch,
): void {
  const hour = research.rules.arrival.factors.hour;
  assertExactIntegerSet(
    hour.sharedMidnightThroughEighteen.map((entry) => entry.hour),
    range(0, 18),
    "Shared arrival hours",
  );
  assertExactStringSet(
    hour.eveningByDay.map((entry) => entry.day),
    days,
    "Evening arrival days",
  );
  for (const schedule of hour.eveningByDay) {
    assertExactIntegerSet(
      schedule.factors.map((entry) => entry.hour),
      range(19, 23),
      `Evening arrival hours for ${schedule.day}`,
    );
  }
  assertExactStringSet(
    hour.closingThresholds.map((entry) => entry.day),
    days,
    "Arrival closing-threshold days",
  );

  const events = research.rules.arrival.factors.calendarEvent.nonNeutral;
  const eventNames = events.map((entry) => entry.event);
  assertExactStringSet(
    eventNames,
    nonNeutralCalendarEvents,
    "Non-neutral arrival calendar events",
  );
  if (events.some((entry) => entry.factor <= 1)) {
    throw new Error("Non-neutral arrival calendar factors must be greater than one.");
  }
}

function assertStorePopularityMaximum(
  research: CustomerShoppingMechanicsResearch,
): void {
  const popularity = research.rules.arrival.factors.storePopularity;
  const calculated =
    popularity.base +
    popularity.standee.cap +
    popularity.snackShelf.cap +
    popularity.decoration.cap +
    popularity.posterFrame.cap +
    popularity.poweredMachineBonus * popularity.poweredMachineTypes.length;
  if (!approximatelyEqual(calculated, popularity.maximum)) {
    throw new Error("Store-popularity component caps do not produce the recorded maximum.");
  }
}

function assertPickupBands(
  research: CustomerShoppingMechanicsResearch,
): void {
  const bands = research.rules.pickup.validContextBands;
  const expected = [
    ["fewer-than-three", 0, 2],
    ["three-through-twenty", 3, 20],
    ["twenty-one-or-more", 21, null],
  ] as const;
  if (
    bands.length !== expected.length ||
    bands.some((band, index) => {
      const expectedBand = expected[index];
      return expectedBand === undefined ||
        band.id !== expectedBand[0] ||
        band.minimumPlacedShelves !== expectedBand[1] ||
        band.maximumPlacedShelves !== expectedBand[2];
    })
  ) {
    throw new Error("Pickup shelf-count bands are incomplete or no longer contiguous.");
  }
}

function assertCartBuckets(
  research: CustomerShoppingMechanicsResearch,
): void {
  const buckets = research.rules.cartContinuation.buckets;
  const expected = [
    [1, 0, 5],
    [2, 6, 11],
    [3, 12, 29],
    [4, 30, null],
  ] as const;
  if (
    buckets.length !== expected.length ||
    buckets.some((bucket, index) => {
      const expectedBucket = expected[index];
      return expectedBucket === undefined ||
        bucket.bucket !== expectedBucket[0] ||
        bucket.minimumPlacedShelves !== expectedBucket[1] ||
        bucket.maximumPlacedShelves !== expectedBucket[2];
    })
  ) {
    throw new Error("Cart-size shelf buckets are incomplete or no longer contiguous.");
  }

  for (const bucket of buckets) {
    const minimums = bucket.minimumPickDistribution.map(
      (entry) => entry.minimumPick,
    );
    if (new Set(minimums).size !== minimums.length) {
      throw new Error(`Cart bucket ${bucket.bucket} repeats a minimum-pick value.`);
    }
    assertProbabilityTotal(
      bucket.minimumPickDistribution.map((entry) => entry.probability),
      `Cart bucket ${bucket.bucket} minimum-pick distribution`,
    );
  }
}

function assertFailurePaths(
  research: CustomerShoppingMechanicsResearch,
): void {
  const stages = new Set(research.rules.failures.map((failure) => failure.stage));
  const required = [
    "shelf-selection",
    "movement",
    "product-selection",
    "pickup-gate",
    "shelf-retries",
    "rental-handoff",
  ] as const;
  if (required.some((stage) => !stages.has(stage))) {
    throw new Error("Customer-shopping research omits a required failure stage.");
  }
}

function compileShelfScenarios(
  research: CustomerShoppingMechanicsResearch,
): readonly ShelfScenario[] {
  return shelfScenarioInputs.map((scenario): ShelfScenario => {
    const inputs: ShelfScenarioInputs = {
      hasNewReleasePool: scenario.hasNewReleasePool,
      hasClearancePool: scenario.hasClearancePool,
      hasFavoriteGenrePool: scenario.hasFavoriteGenrePool,
      hasGeneralPool: scenario.hasGeneralPool,
      holdsNewRelease: scenario.holdsNewRelease,
      newReleaseSaleBonus: 0,
      clearanceSaleBonus: 0,
    };
    return {
      id: scenario.id,
      inputs,
      selectedBy: calculateShelfRouteOutcomes(research, inputs),
    };
  });
}

function calculateShelfRouteOutcomes(
  research: CustomerShoppingMechanicsResearch,
  inputs: ShelfScenarioInputs,
): ShelfScenario["selectedBy"] {
  if (
    !inputs.hasGeneralPool &&
    (inputs.hasNewReleasePool ||
      inputs.hasClearancePool ||
      inputs.hasFavoriteGenrePool)
  ) {
    throw new Error("A priority shelf pool must also belong to the general pool.");
  }

  const rules = research.rules.shelfSelection;
  const newRelease = inputs.hasNewReleasePool
    ? clampProbability(
        (inputs.holdsNewRelease
          ? rules.newRelease.baseChanceWithHeldNewRelease
          : rules.newRelease.baseChanceWithoutHeldNewRelease) +
          inputs.newReleaseSaleBonus,
      )
    : 0;
  let remaining = 1 - newRelease;

  const clearanceWeight =
    rules.clearance.baseChance + inputs.clearanceSaleBonus;
  if (clearanceWeight > 1) {
    throw new Error(
      "A clearance shelf scenario exceeds RandomBoolWithWeight's documented range.",
    );
  }
  const clearance = inputs.hasClearancePool
    ? remaining * clearanceWeight
    : 0;
  remaining -= clearance;

  const favoriteGenre = inputs.hasFavoriteGenrePool
    ? remaining * rules.favoriteGenre.chance
    : 0;
  remaining -= favoriteGenre;

  const general = inputs.hasGeneralPool ? remaining : 0;
  const noValidShelf = inputs.hasGeneralPool ? 0 : remaining;
  const probabilities = [
    newRelease,
    clearance,
    favoriteGenre,
    general,
    noValidShelf,
  ].map(normalizeProbability);
  assertProbabilityTotal(probabilities, "Shelf route scenario");

  return {
    newRelease: probabilities[0] ?? 0,
    clearance: probabilities[1] ?? 0,
    favoriteGenre: probabilities[2] ?? 0,
    general: probabilities[3] ?? 0,
    noValidShelf: probabilities[4] ?? 0,
    probabilityTotal: 1,
  };
}

function compilePickupScenarios(
  research: CustomerShoppingMechanicsResearch,
): readonly PickupScenario[] {
  return research.rules.pickup.validContextBands.flatMap((band) =>
    [false, true].flatMap((isNewRelease) =>
      [false, true].map((isFavoriteGenre): PickupScenario => ({
        band: band.id,
        isNewRelease,
        isFavoriteGenre,
        chance: normalizeProbability(
          clampProbability(
            band.baseChance +
              (isNewRelease ? band.newReleaseBonus : 0) +
              (isFavoriteGenre ? band.favoriteGenreBonus : 0),
          ),
        ),
        condition: "valid-context-and-selected-product",
      })),
    ),
  );
}

function compileCartScenarios(
  research: CustomerShoppingMechanicsResearch,
): readonly CartScenario[] {
  return research.rules.cartContinuation.buckets.map((bucket): CartScenario => {
    const probabilities = new Map<number, number>();
    for (const minimum of bucket.minimumPickDistribution) {
      const conditional = compileFinalCountForMinimum(minimum.minimumPick);
      for (const [products, probability] of conditional) {
        probabilities.set(
          products,
          (probabilities.get(products) ?? 0) +
            minimum.probability * probability,
        );
      }
    }

    const finalProductCount = range(1, 4).map((products) => ({
      products,
      probability: normalizeProbability(probabilities.get(products) ?? 0),
    }));
    assertProbabilityTotal(
      finalProductCount.map((entry) => entry.probability),
      `Cart bucket ${bucket.bucket} final-product distribution`,
    );
    const expectedProducts = normalizeProbability(
      finalProductCount.reduce(
        (total, entry) => total + entry.products * entry.probability,
        0,
      ),
    );

    return {
      bucket: bucket.bucket,
      placedShelfRange: {
        minimum: bucket.minimumPlacedShelves,
        maximum: bucket.maximumPlacedShelves,
      },
      initialHeldProducts: 0,
      finalProductCount,
      expectedProducts,
      probabilityTotal: 1,
      condition:
        "start-empty-and-complete-enough-successful-pickups-before-task-failure",
    };
  });
}

function compileFinalCountForMinimum(
  minimumPick: number,
): ReadonlyMap<number, number> {
  const probabilities = new Map<number, number>();
  let continuing = 1;
  const possibleTargets = 5 - minimumPick;

  for (const heldCount of range(1, 4)) {
    const stopChance = heldCount === 4
      ? 1
      : heldCount < minimumPick
        ? 0
        : (heldCount - minimumPick + 1) / possibleTargets;
    probabilities.set(heldCount, continuing * stopChance);
    continuing *= 1 - stopChance;
  }

  if (!approximatelyEqual(continuing, 0)) {
    throw new Error("Cart completion still has probability mass after four products.");
  }
  return probabilities;
}

function assertExactIntegerSet(
  actual: readonly number[],
  expected: readonly number[],
  label: string,
): void {
  if (
    actual.length !== expected.length ||
    expected.some((value) => !actual.includes(value)) ||
    new Set(actual).size !== actual.length
  ) {
    throw new Error(`${label} are incomplete or duplicated.`);
  }
}

function assertExactStringSet(
  actual: readonly string[],
  expected: readonly string[],
  label: string,
): void {
  if (
    actual.length !== expected.length ||
    expected.some((value) => !actual.includes(value)) ||
    new Set(actual).size !== actual.length
  ) {
    throw new Error(`${label} are incomplete or duplicated.`);
  }
}

function assertProbabilityTotal(
  probabilities: readonly number[],
  label: string,
): void {
  const total = probabilities.reduce((sum, value) => sum + value, 0);
  if (!approximatelyEqual(total, 1)) {
    throw new Error(`${label} does not total one.`);
  }
}

function clampProbability(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalizeProbability(value: number): number {
  return Number(value.toPrecision(15));
}

function approximatelyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-12;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
