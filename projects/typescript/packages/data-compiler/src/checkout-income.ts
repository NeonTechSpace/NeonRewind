import {
  CheckoutIncomeSchema,
  type CheckoutIncome,
  type CheckoutIncomeResearch,
  type CheckoutIncomeSourceIdentity,
} from "@neonretrorewind/core";

export function compileCheckoutIncome(
  research: CheckoutIncomeResearch,
  researchSource: Extract<
    CheckoutIncomeSourceIdentity,
    { readonly artifactType: "checkout-income-research" }
  >,
): CheckoutIncome {
  assertResearch(research);

  const multiplier = research.bill.conversion.multiplierToPennies;
  const tenderOutcomes = compileTenderOutcomes(research);

  return CheckoutIncomeSchema.assert({
    artifactType: "checkout-income",
    build: research.build,
    sources: {
      research: researchSource,
      evidence: research.evidence,
    },
    scope: "checkout-bill-tender-returned-cash-and-completion",
    evidenceLevel: "curated-static-analysis",
    runtimeValidation: research.runtimeValidation,
    bill: research.bill,
    cartridgeRentalPricing: {
      applicability: research.cartridgeRentalPricing.applicability,
      basePricePriority: research.cartridgeRentalPricing.basePricePriority,
      new: compilePrice(research.cartridgeRentalPricing.newPriceUnits, multiplier),
      specialGenre: {
        rawEnumValue: research.cartridgeRentalPricing.specialGenre.rawEnumValue,
        displayLabel: research.cartridgeRentalPricing.specialGenre.displayLabel,
        price: compilePrice(
          research.cartridgeRentalPricing.specialGenre.priceUnits,
          multiplier,
        ),
      },
      old: compilePrice(research.cartridgeRentalPricing.oldPriceUnits, multiplier),
      default: compilePrice(
        research.cartridgeRentalPricing.defaultPriceUnits,
        multiplier,
      ),
      holographicSurcharge: compilePrice(
        research.cartridgeRentalPricing.holographicSurchargeUnits,
        multiplier,
      ),
      holographicAdjustment:
        research.cartridgeRentalPricing.holographicAdjustment,
      sellingPath: research.cartridgeRentalPricing.sellingPath,
    },
    tender: {
      coreMoneyMutation: research.tender.coreMoneyMutation,
      rounding: research.tender.roundUp.method,
      roundingFormula: research.tender.roundUp.formula,
      exactPaymentProbability: research.tender.exactPaymentProbability,
      roundUpOutcomes: tenderOutcomes,
      probabilityTotal: 1,
    },
    returnedCash: {
      ...research.returnedCash,
      denominationsPennies: [...research.returnedCash.denominationsPennies].sort(
        (left, right) => left - right,
      ),
    },
    finalization: research.finalization,
    income: {
      completedTransactionNetChange: "customer-tender-minus-actual-payback",
      exactChangeNetRevenue: "bill",
      excessChangeNetRevenue: "less-than-bill",
      excessChangeAccepted: true,
      excessChangeCanReduceCoreMoneyBelowZero: true,
    },
    guideClaimStatus: {
      billFormation: "eligible-with-build-limit",
      tenderDistribution: "eligible-with-build-limit",
      transactionIncome: "eligible-with-build-limit",
      specialGenreLabel: "unsupported-by-inputs",
      runtimePresentation: "conditional-until-runtime-validation",
      profitRecommendation: "unsupported-by-inputs",
      profitRecommendationLimit: "inputs-do-not-cover-demand-or-rental-frequency",
    },
  });
}

function assertResearch(research: CheckoutIncomeResearch): void {
  const evidenceNames = Object.values(research.evidence).map(
    (source) => source.fileName,
  );
  if (new Set(evidenceNames).size !== evidenceNames.length) {
    throw new Error("Checkout-income research contains duplicate evidence filenames.");
  }

  const decisions = research.tender.roundUp.decisions;
  if (research.tender.exactPaymentProbability >= 1) {
    throw new Error("Exact tender probability leaves no rounded-payment route.");
  }
  for (const [index, decision] of decisions.entries()) {
    const isLast = index === decisions.length - 1;
    if (
      decision.conditionalSelectionProbability <= 0 ||
      (isLast
        ? decision.conditionalSelectionProbability !== 1
        : decision.conditionalSelectionProbability >= 1)
    ) {
      throw new Error(
        "Rounded-payment decisions must end in one certain fallback after conditional branches.",
      );
    }
  }

  const tenderDenominations = decisions.map(
    (decision) => decision.denominationPennies,
  );
  if (new Set(tenderDenominations).size !== tenderDenominations.length) {
    throw new Error("Rounded-payment decisions contain duplicate denominations.");
  }

  const returnedDenominations = research.returnedCash.denominationsPennies;
  if (new Set(returnedDenominations).size !== returnedDenominations.length) {
    throw new Error("Returned-cash denominations contain duplicates.");
  }
  const returnedDenominationSet = new Set(returnedDenominations);
  if (
    tenderDenominations.some(
      (denomination) => !returnedDenominationSet.has(denomination),
    )
  ) {
    throw new Error(
      "Every rounded tender denomination must be available as returned cash.",
    );
  }

  const requiredFinalizationSteps = [
    "clear-returned-cash-actors",
    "reset-checkout-values",
    "refresh-display",
    "broadcast-transaction-ended",
  ] as const;
  if (
    research.finalization.closeContinuation.length !==
      requiredFinalizationSteps.length ||
    !requiredFinalizationSteps.every(
      (step, index) => research.finalization.closeContinuation[index] === step,
    )
  ) {
    throw new Error("Checkout finalization steps or their order changed.");
  }
}

function compilePrice(value: number, multiplier: number) {
  return {
    priceUnits: value,
    pricePennies: Math.round(value * multiplier),
  };
}

function compileTenderOutcomes(research: CheckoutIncomeResearch) {
  const outcomes: Array<{
    denominationPennies: number;
    probability: number;
  }> = [];
  let remainingProbability = 1 - research.tender.exactPaymentProbability;

  for (const decision of research.tender.roundUp.decisions) {
    const outcomeProbability =
      remainingProbability * decision.conditionalSelectionProbability;
    outcomes.push({
      denominationPennies: decision.denominationPennies,
      probability: normalizeProbability(outcomeProbability),
    });
    remainingProbability *= 1 - decision.conditionalSelectionProbability;
  }

  const probabilityTotal =
    research.tender.exactPaymentProbability +
    outcomes.reduce(
      (total, outcome) => total + outcome.probability,
      0,
    );
  if (
    Math.abs(probabilityTotal - 1) > 1e-12 ||
    Math.abs(remainingProbability) > 1e-12
  ) {
    throw new Error("Checkout tender probabilities do not total one.");
  }

  return outcomes;
}

function normalizeProbability(value: number): number {
  return Number(value.toPrecision(15));
}
