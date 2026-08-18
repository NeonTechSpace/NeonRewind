import { type } from "arktype";

const sha256 = type("string").matching(new RegExp("^[0-9a-f]{64}$"));
const nonNegativeInteger = type("number.integer").atLeast(0);
const positiveInteger = type("number.integer").atLeast(1);
const probability = type("number").atLeast(0).atMost(1);
const priceUnits = type("number").atLeast(0);

const build = type({
  steamAppId: type("string").matching(new RegExp("^[0-9]+$")),
  steamBuildId: type("string").matching(new RegExp("^[0-9]+$")),
  "+": "reject",
}).readonly();

const evidenceIdentity = type({
  fileName: type("string")
    .matching(new RegExp("^[^/\\\\]+\\.json$"))
    .atLeastLength(1),
  sha256,
  sizeBytes: positiveInteger,
  artifactType: type.unit("blueprint-selected-function-trace"),
  "+": "reject",
}).readonly();

const researchIdentity = type({
  fileName: type("string")
    .matching(new RegExp("^[^/\\\\]+\\.json$"))
    .atLeastLength(1),
  sha256,
  sizeBytes: positiveInteger,
  artifactType: type.unit("checkout-income-research"),
  "+": "reject",
}).readonly();

const checkoutEvidence = type({
  pricing: evidenceIdentity,
  cashFlow: evidenceIdentity,
  "+": "reject",
}).readonly();

const price = type({
  priceUnits,
  pricePennies: nonNegativeInteger,
  "+": "reject",
}).readonly();

const tenderDecision = type({
  denominationPennies: positiveInteger,
  conditionalSelectionProbability: probability,
  "+": "reject",
}).readonly();

const roundedTenderOutcome = type({
  denominationPennies: positiveInteger,
  probability,
  "+": "reject",
}).readonly();

const basePricePriority = type([
  type.unit("new"),
  type.unit("special-genre"),
  type.unit("old"),
  type.unit("default"),
]).readonly();

const finalizationStep = type.enumerated(
  "clear-returned-cash-actors",
  "reset-checkout-values",
  "refresh-display",
  "broadcast-transaction-ended",
);

const returnedCash = type({
  denominationsPennies: positiveInteger.array().readonly().atLeastLength(1),
  selection: type({
    fundsCheck: type.unit("negative-denomination-before-mutation"),
    mutation: type.unit("debit-core-money"),
    allowDebt: type.unit(true),
    paybackUpdate: type.unit("add-denomination"),
    "+": "reject",
  }).readonly(),
  undo: type({
    actorSelection: type.unit("latest-returned-actor-with-matching-denomination"),
    mutation: type.unit("credit-core-money"),
    paybackUpdate: type.unit("subtract-denomination"),
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

const finalization = type({
  requiredPayback: type.unit("customer-tender-minus-bill"),
  closeCondition: type.unit("actual-payback-greater-than-or-equal-required-payback"),
  closeContinuation: type([
    finalizationStep,
    "...",
    finalizationStep.array(),
  ]).readonly(),
  cleanupCoreMoneyMutation: type.unit("none"),
  "+": "reject",
}).readonly();

export const CheckoutIncomeResearchSchema = type({
  artifactType: type.unit("checkout-income-research"),
  build,
  evidence: checkoutEvidence,
  bill: type({
    productPriceInput: type.unit("gathered-product-price"),
    aggregation: type.unit("sum-every-scanned-product"),
    conversion: type({
      sourceCurrency: type.unit("game-price-units"),
      targetCurrency: type.unit("pennies"),
      multiplierToPennies: positiveInteger,
      integerConversion: type.unit("round-to-nearest"),
      "+": "reject",
    }).readonly(),
    "+": "reject",
  }).readonly(),
  cartridgeRentalPricing: type({
    applicability: type.unit("not-selling-back"),
    basePricePriority,
    newPriceUnits: priceUnits,
    specialGenre: type({
      rawEnumValue: nonNegativeInteger,
      displayLabel: type.unit("unresolved"),
      priceUnits,
      "+": "reject",
    }).readonly(),
    oldPriceUnits: priceUnits,
    defaultPriceUnits: priceUnits,
    holographicSurchargeUnits: priceUnits,
    holographicAdjustment: type.unit("add-after-base-price"),
    sellingPath: type.unit("separate-selling-price"),
    "+": "reject",
  }).readonly(),
  tender: type({
    coreMoneyMutation: type.unit("credit-customer-tender"),
    exactPaymentProbability: probability,
    roundUp: type({
      method: type.unit("strict-next-multiple"),
      formula: type.unit("integer-divide-plus-one-times-denomination"),
      decisions: tenderDecision.array().readonly().atLeastLength(1),
      "+": "reject",
    }).readonly(),
    "+": "reject",
  }).readonly(),
  returnedCash,
  finalization,
  runtimeValidation: type.unit("not-run"),
  "+": "reject",
}).readonly();

export const CheckoutIncomeSchema = type({
  artifactType: type.unit("checkout-income"),
  build,
  sources: type({
    research: researchIdentity,
    evidence: checkoutEvidence,
    "+": "reject",
  }).readonly(),
  scope: type.unit("checkout-bill-tender-returned-cash-and-completion"),
  evidenceLevel: type.unit("curated-static-analysis"),
  runtimeValidation: type.unit("not-run"),
  bill: type({
    productPriceInput: type.unit("gathered-product-price"),
    aggregation: type.unit("sum-every-scanned-product"),
    conversion: type({
      sourceCurrency: type.unit("game-price-units"),
      targetCurrency: type.unit("pennies"),
      multiplierToPennies: positiveInteger,
      integerConversion: type.unit("round-to-nearest"),
      "+": "reject",
    }).readonly(),
    "+": "reject",
  }).readonly(),
  cartridgeRentalPricing: type({
    applicability: type.unit("not-selling-back"),
    basePricePriority,
    new: price,
    specialGenre: type({
      rawEnumValue: nonNegativeInteger,
      displayLabel: type.unit("unresolved"),
      price: price,
      "+": "reject",
    }).readonly(),
    old: price,
    default: price,
    holographicSurcharge: price,
    holographicAdjustment: type.unit("add-after-base-price"),
    sellingPath: type.unit("separate-selling-price"),
    "+": "reject",
  }).readonly(),
  tender: type({
    coreMoneyMutation: type.unit("credit-customer-tender"),
    rounding: type.unit("strict-next-multiple"),
    roundingFormula: type.unit("integer-divide-plus-one-times-denomination"),
    exactPaymentProbability: probability,
    roundUpOutcomes: roundedTenderOutcome.array().readonly().atLeastLength(1),
    probabilityTotal: type.unit(1),
    "+": "reject",
  }).readonly(),
  returnedCash,
  finalization,
  income: type({
    completedTransactionNetChange: type.unit("customer-tender-minus-actual-payback"),
    exactChangeNetRevenue: type.unit("bill"),
    excessChangeNetRevenue: type.unit("less-than-bill"),
    excessChangeAccepted: type.unit(true),
    excessChangeCanReduceCoreMoneyBelowZero: type.unit(true),
    "+": "reject",
  }).readonly(),
  guideClaimStatus: type({
    billFormation: type.unit("eligible-with-build-limit"),
    tenderDistribution: type.unit("eligible-with-build-limit"),
    transactionIncome: type.unit("eligible-with-build-limit"),
    specialGenreLabel: type.unit("unsupported-by-inputs"),
    runtimePresentation: type.unit("conditional-until-runtime-validation"),
    profitRecommendation: type.unit("unsupported-by-inputs"),
    profitRecommendationLimit: type.unit("inputs-do-not-cover-demand-or-rental-frequency"),
    "+": "reject",
  }).readonly(),
  "+": "reject",
}).readonly();

export type CheckoutIncomeResearch = typeof CheckoutIncomeResearchSchema.infer;
export type CheckoutIncome = typeof CheckoutIncomeSchema.infer;
export type CheckoutIncomeSourceIdentity = CheckoutIncome["sources"]["research"] |
  CheckoutIncome["sources"]["evidence"][keyof CheckoutIncome["sources"]["evidence"]];
