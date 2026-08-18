import assert from "node:assert/strict";
import test from "node:test";

import { CustomerShoppingMechanicsSchema } from "@neonretrorewind/core";

import { assertCustomerShoppingEvidenceFiles } from "../src/customer-shopping-mechanics-cli.ts";
import { compileCustomerShoppingMechanics } from "../src/customer-shopping-mechanics.ts";
import {
  createCustomerShoppingResearch,
  customerShoppingResearchSource,
} from "./customer-shopping-fixtures.ts";

test("compiles exact shopping rules and conditional conversion scenarios", () => {
  const mechanics = compileCustomerShoppingMechanics(
    createCustomerShoppingResearch(),
    customerShoppingResearchSource,
  );

  assert.equal(CustomerShoppingMechanicsSchema.allows(mechanics), true);
  assert.equal(mechanics.rules.arrival.timer.intervalSeconds, 1);
  assert.equal(
    mechanics.rules.arrival.attemptWeight.outOfRangeInterpretation,
    "weight-not-exact-probability",
  );
  assert.equal(
    mechanics.rules.arrival.favoriteGenre.calendarBonusFormula,
    "one-plus-candidate-count-times-bonus-percent-divided-by-one-hundred-times-one-point-five",
  );
  assert.equal(mechanics.rules.shelfSelection.clearance.explicitClamp, false);
  assert.equal(
    mechanics.rules.shelfSelection.clearance.outOfRangeInterpretation,
    "weight-not-exact-probability",
  );
  assert.equal(
    mechanics.conversionBoundary.visitToRecordedRentalRate,
    "not-quantifiable-from-static-inputs",
  );
  assert.deepEqual(mechanics.conversionBoundary.recordedRentalRequires, [
    "held-cartridge",
    "go-home-inventory-handoff",
    "AI-Throw-succeeded",
    "Send-to-Rent-Storage",
    "rental-storage-recorded",
  ]);
  assert.equal(
    mechanics.conversionBoundary.spawnToHandoffTaskSequence,
    "not-proven-without-behavior-tree-topology",
  );

  const allNotHeld = mechanics.scenarios.shelfRouteSelection.find(
    (scenario) => scenario.id === "all-priorities-not-held",
  );
  assert.deepEqual(allNotHeld?.selectedBy, {
    newRelease: 0.85,
    clearance: 0.015,
    favoriteGenre: 0.1215,
    general: 0.0135,
    noValidShelf: 0,
    probabilityTotal: 1,
  });

  const allAlreadyHeld = mechanics.scenarios.shelfRouteSelection.find(
    (scenario) => scenario.id === "all-priorities-already-held",
  );
  assert.deepEqual(allAlreadyHeld?.selectedBy, {
    newRelease: 0.05,
    clearance: 0.095,
    favoriteGenre: 0.7695,
    general: 0.0855,
    noValidShelf: 0,
    probabilityTotal: 1,
  });

  const mediumFavoriteNew = mechanics.scenarios.pickupChance.find(
    (scenario) =>
      scenario.band === "three-through-twenty" &&
      scenario.isNewRelease &&
      scenario.isFavoriteGenre,
  );
  assert.equal(mediumFavoriteNew?.chance, 1);

  const bucketOne = mechanics.scenarios.cartCompletion.find(
    (scenario) => scenario.bucket === 1,
  );
  assert.equal(
    mechanics.rules.cartContinuation.targetDraw.distribution,
    "uniform-integer",
  );
  assert.deepEqual(bucketOne?.finalProductCount, [
    { products: 1, probability: 0.25 },
    { products: 2, probability: 0.375 },
    { products: 3, probability: 0.28125 },
    { products: 4, probability: 0.09375 },
  ]);
  assert.equal(bucketOne?.expectedProducts, 2.21875);

  const bucketFour = mechanics.scenarios.cartCompletion.find(
    (scenario) => scenario.bucket === 4,
  );
  assert.deepEqual(bucketFour?.finalProductCount, [
    { products: 1, probability: 0.03 },
    { products: 2, probability: 0.205 },
    { products: 3, probability: 0.447083333333333 },
    { products: 4, probability: 0.317916666666667 },
  ]);
  assert.equal(bucketFour?.expectedProducts, 3.05291666666667);
  assert.equal(
    bucketFour?.condition,
    "start-empty-and-complete-enough-successful-pickups-before-task-failure",
  );
  assert.equal(bucketFour?.initialHeldProducts, 0);
});

test("rejects duplicate evidence filenames", () => {
  const research = createCustomerShoppingResearch();
  research.evidence.shelfDefaults.fileName =
    research.evidence.customerDefaults.fileName;

  assert.throws(
    () => compileCustomerShoppingMechanics(research, customerShoppingResearchSource),
    /duplicate evidence filenames/u,
  );
});

test("rejects an incomplete minimum-pick distribution", () => {
  const research = createCustomerShoppingResearch();
  research.rules.cartContinuation.buckets[1]!.minimumPickDistribution[0]!.probability =
    0.7;

  assert.throws(
    () => compileCustomerShoppingMechanics(research, customerShoppingResearchSource),
    /minimum-pick distribution does not total one/u,
  );
});

test("rejects an incomplete non-neutral calendar-event list", () => {
  const research = createCustomerShoppingResearch();
  research.rules.arrival.factors.calendarEvent.nonNeutral.pop();

  assert.throws(
    () => compileCustomerShoppingMechanics(research, customerShoppingResearchSource),
    /Non-neutral arrival calendar events are incomplete/u,
  );
});

test("rejects an exact evidence file from another build", () => {
  const research = createCustomerShoppingResearch();
  const files = Object.values(research.evidence).map((identity, index) => ({
    path: `evidence/${identity.fileName}`,
    bytes: new Uint8Array(identity.sizeBytes),
    sha256: identity.sha256,
    value: {
      artifactType: identity.artifactType,
      build: index === 0
        ? { steamAppId: "123", steamBuildId: "999" }
        : research.build,
    },
  }));

  assert.throws(
    () => assertCustomerShoppingEvidenceFiles(
      research.build,
      research.evidence,
      files,
    ),
    /evidence identity changed/u,
  );
});
