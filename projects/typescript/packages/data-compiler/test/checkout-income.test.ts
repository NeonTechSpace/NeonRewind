import assert from "node:assert/strict";
import test from "node:test";

import {
  CheckoutIncomeSchema,
  type CheckoutIncomeResearch,
} from "@neonretrorewind/core";

import { assertCheckoutIncomeEvidenceFiles } from "../src/checkout-income-cli.ts";
import { compileCheckoutIncome } from "../src/checkout-income.ts";

const researchSource = {
  fileName: "checkout-income-research.json",
  sha256: "a".repeat(64),
  sizeBytes: 1_000,
  artifactType: "checkout-income-research" as const,
};

test("compiles checkout prices, tender odds, and completed income rules", () => {
  const income = compileCheckoutIncome(createResearch(), researchSource);

  assert.equal(CheckoutIncomeSchema.allows(income), true);
  assert.deepEqual(income.cartridgeRentalPricing.new, {
    priceUnits: 2.25,
    pricePennies: 225,
  });
  assert.deepEqual(income.cartridgeRentalPricing.holographicSurcharge, {
    priceUnits: 0.5,
    pricePennies: 50,
  });
  assert.equal(income.tender.exactPaymentProbability, 0.2);
  assert.deepEqual(income.tender.roundUpOutcomes, [
    { denominationPennies: 100, probability: 0.2 },
    { denominationPennies: 500, probability: 0.3 },
    { denominationPennies: 2_000, probability: 0.3 },
  ]);
  assert.deepEqual(income.cartridgeRentalPricing.basePricePriority, [
    "new",
    "special-genre",
    "old",
    "default",
  ]);
  assert.equal(income.cartridgeRentalPricing.specialGenre.displayLabel, "unresolved");
  assert.deepEqual(
    income.returnedCash.denominationsPennies,
    [1, 5, 10, 100, 500, 2_000],
  );
  assert.equal(
    income.income.completedTransactionNetChange,
    "customer-tender-minus-actual-payback",
  );
  assert.equal(income.income.exactChangeNetRevenue, "bill");
  assert.equal(income.income.excessChangeAccepted, true);
  assert.equal(
    income.guideClaimStatus.profitRecommendation,
    "unsupported-by-inputs",
  );
});

test("rejects duplicate evidence filenames", () => {
  const research = createResearch();
  research.evidence.cashFlow = { ...research.evidence.pricing };

  assert.throws(
    () => compileCheckoutIncome(research, researchSource),
    /duplicate evidence filenames/u,
  );
});

test("rejects a certain branch before the rounded-payment fallback", () => {
  const research = createResearch();
  research.tender.roundUp.decisions[0]!.conditionalSelectionProbability = 1;

  assert.throws(
    () => compileCheckoutIncome(research, researchSource),
    /must end in one certain fallback/u,
  );
});

test("rejects an incomplete rounded-payment fallback", () => {
  const research = createResearch();
  research.tender.roundUp.decisions.at(-1)!.conditionalSelectionProbability = 0.9;

  assert.throws(
    () => compileCheckoutIncome(research, researchSource),
    /must end in one certain fallback/u,
  );
});

test("rejects a rounded tender denomination unavailable as returned cash", () => {
  const research = createResearch();
  research.returnedCash.denominationsPennies = [1, 5, 10, 100, 500];

  assert.throws(
    () => compileCheckoutIncome(research, researchSource),
    /must be available as returned cash/u,
  );
});

test("rejects duplicate returned-cash denominations", () => {
  const research = createResearch();
  research.returnedCash.denominationsPennies.push(100);

  assert.throws(
    () => compileCheckoutIncome(research, researchSource),
    /Returned-cash denominations contain duplicates/u,
  );
});

test("rejects changed checkout finalization order", () => {
  const research = createResearch();
  research.finalization.closeContinuation = [
    "reset-checkout-values",
    "clear-returned-cash-actors",
    "refresh-display",
    "broadcast-transaction-ended",
  ];

  assert.throws(
    () => compileCheckoutIncome(research, researchSource),
    /finalization steps or their order changed/u,
  );
});

test("rejects an exact evidence file from another build", () => {
  const research = createResearch();
  const identity = research.evidence.pricing;
  const cashFlowIdentity = research.evidence.cashFlow;

  assert.throws(
    () => assertCheckoutIncomeEvidenceFiles(
      research.build,
      { pricing: identity, cashFlow: research.evidence.cashFlow },
      [
        {
          path: `evidence/${identity.fileName}`,
          bytes: new Uint8Array(identity.sizeBytes),
          sha256: identity.sha256,
          value: {
            artifactType: identity.artifactType,
            build: { steamAppId: "123", steamBuildId: "999" },
          },
        },
        {
          path: `evidence/${cashFlowIdentity.fileName}`,
          bytes: new Uint8Array(cashFlowIdentity.sizeBytes),
          sha256: cashFlowIdentity.sha256,
          value: {
            artifactType: cashFlowIdentity.artifactType,
            build: research.build,
          },
        },
      ],
    ),
    /evidence identity changed/u,
  );
});

function createResearch(): Mutable<CheckoutIncomeResearch> {
  return structuredClone({
    artifactType: "checkout-income-research",
    build: { steamAppId: "123", steamBuildId: "456" },
    evidence: {
      pricing: {
        fileName: "checkout-price-trace.json",
        sha256: "b".repeat(64),
        sizeBytes: 2_000,
        artifactType: "blueprint-selected-function-trace",
      },
      cashFlow: {
        fileName: "checkout-cash-trace.json",
        sha256: "c".repeat(64),
        sizeBytes: 3_000,
        artifactType: "blueprint-selected-function-trace",
      },
    },
    bill: {
      productPriceInput: "gathered-product-price",
      aggregation: "sum-every-scanned-product",
      conversion: {
        sourceCurrency: "game-price-units",
        targetCurrency: "pennies",
        multiplierToPennies: 100,
        integerConversion: "round-to-nearest",
      },
    },
    cartridgeRentalPricing: {
      applicability: "not-selling-back",
      basePricePriority: ["new", "special-genre", "old", "default"],
      newPriceUnits: 2.25,
      specialGenre: {
        rawEnumValue: 7,
        displayLabel: "unresolved",
        priceUnits: 1.75,
      },
      oldPriceUnits: 1.25,
      defaultPriceUnits: 1.5,
      holographicSurchargeUnits: 0.5,
      holographicAdjustment: "add-after-base-price",
      sellingPath: "separate-selling-price",
    },
    tender: {
      coreMoneyMutation: "credit-customer-tender",
      exactPaymentProbability: 0.2,
      roundUp: {
        method: "strict-next-multiple",
        formula: "integer-divide-plus-one-times-denomination",
        decisions: [
          { denominationPennies: 100, conditionalSelectionProbability: 0.25 },
          { denominationPennies: 500, conditionalSelectionProbability: 0.5 },
          { denominationPennies: 2_000, conditionalSelectionProbability: 1 },
        ],
      },
    },
    returnedCash: {
      denominationsPennies: [2_000, 1, 500, 5, 100, 10],
      selection: {
        fundsCheck: "negative-denomination-before-mutation",
        mutation: "debit-core-money",
        allowDebt: true,
        paybackUpdate: "add-denomination",
      },
      undo: {
        actorSelection: "latest-returned-actor-with-matching-denomination",
        mutation: "credit-core-money",
        paybackUpdate: "subtract-denomination",
      },
    },
    finalization: {
      requiredPayback: "customer-tender-minus-bill",
      closeCondition: "actual-payback-greater-than-or-equal-required-payback",
      closeContinuation: [
        "clear-returned-cash-actors",
        "reset-checkout-values",
        "refresh-display",
        "broadcast-transaction-ended",
      ],
      cleanupCoreMoneyMutation: "none",
    },
    runtimeValidation: "not-run",
  });
}

type Mutable<Value> = Value extends object
  ? { -readonly [Key in keyof Value]: Mutable<Value[Key]> }
  : Value;
