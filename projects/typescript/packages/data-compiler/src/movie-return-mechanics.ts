import type {
  MovieReturnArtifactIdentity,
  MovieReturnMechanics,
} from "@neonrewind/core";

import type {
  BlueprintCallerBodiesArtifact,
  BlueprintCallSitesArtifact,
} from "./blueprint-caller-inputs.ts";
import type {
  BlueprintFunctionTraceArtifact,
  RentalFunctionTraceArtifact,
} from "./blueprint-trace-inputs.ts";
import {
  assertMovieCustomerTrace,
  customerCallerClassName,
  customerCallerFunctionName,
} from "./movie-customer-trace.ts";
import { assertMovieRentalTrace } from "./movie-rental-trace.ts";
import type {
  RentalBlueprintBodiesArtifact,
  RentalEvidenceArtifact,
} from "./rental-inputs.ts";
import {
  assertRentalInputIdentity,
  findOne,
  findRentalEvidenceClass,
  type RentalMechanicSources,
} from "./rental-mechanic-evidence.ts";

const rentedFieldName = "Cartridge Base out for Rent";
const readyFieldName = "Cartridge Base out Ready to Return";
const firstProbabilityName = "Weight Chance of Returning at least one Cartridge";
const additionalProbabilityName = "Weight Chance of Returning more Cartridge";

export interface MovieReturnSources extends RentalMechanicSources {
  readonly blueprintCallSites: MovieReturnArtifactIdentity<"blueprint-call-sites">;
  readonly blueprintCallerBodies: MovieReturnArtifactIdentity<"blueprint-caller-bodies">;
  readonly blueprintFunctionTrace: MovieReturnArtifactIdentity<"blueprint-function-trace">;
  readonly rentalFunctionTrace: MovieReturnArtifactIdentity<"rental-function-trace">;
}

export function compileMovieReturnMechanics(
  rentalEvidence: RentalEvidenceArtifact,
  blueprintBodies: RentalBlueprintBodiesArtifact,
  callSites: BlueprintCallSitesArtifact,
  callerBodies: BlueprintCallerBodiesArtifact,
  functionTrace: BlueprintFunctionTraceArtifact,
  rentalFunctionTrace: RentalFunctionTraceArtifact,
  sources: MovieReturnSources,
): MovieReturnMechanics {
  assertRentalInputIdentity(rentalEvidence, blueprintBodies, sources);
  const evidenceClass = findRentalEvidenceClass(rentalEvidence);

  const rentedField = findQueueField(evidenceClass, rentedFieldName);
  const readyField = findQueueField(evidenceClass, readyFieldName);
  if (rentedField.type !== readyField.type) {
    throw new Error("Movie rental queues do not have one matching object-array type.");
  }
  const firstProbability = findProbabilityDefault(evidenceClass, firstProbabilityName);
  const additionalProbability = findProbabilityDefault(
    evidenceClass,
    additionalProbabilityName,
  );

  const rentalTraceEvidence = assertMovieRentalTrace(
    rentalEvidence,
    rentalFunctionTrace,
    sources,
  );
  const customerTraceEvidence = assertMovieCustomerTrace(
    rentalEvidence,
    callSites,
    callerBodies,
    functionTrace,
    sources,
  );

  return {
    artifactType: "movie-return-mechanics",
    schemaVersion: 4,
    build: {
      steamAppId: rentalEvidence.build.steamAppId,
      steamBuildId: rentalEvidence.build.steamBuildId,
    },
    sources,
    scope: "movie-return-readiness-and-selection",
    evidenceLevel: "decompiled-blueprint",
    runtimeValidation: "not-run",
    readiness: {
      trigger: "new-day-event",
      source: {
        queue: "rented",
        evidence: createFieldEvidence(evidenceClass.path, rentedField.name),
      },
      destination: {
        queue: "ready-to-return",
        evidence: createFieldEvidence(evidenceClass.path, readyField.name),
      },
      transfer: "append-all",
      clearsSource: true,
      evidence: rentalTraceEvidence.readiness,
    },
    selection: {
      callerSearch: {
        coverage: "all-parsed-blueprint-function-packages",
        candidatePackageCount: callSites.totals.candidatePackageCount,
        scannedPackageCount: callSites.totals.scannedPackageCount,
        failedPackageCount: 0,
        callerFound: true,
        callSiteCount: 2,
      },
      candidateQueue: "ready-to-return",
      maximumUniqueMovies: 4,
      firstAttempt: {
        defaultProbability: {
          value: firstProbability.value,
          evidence: createDefaultEvidence(evidenceClass.path, firstProbability.name),
        },
        override: {
          whenQueue: "rented",
          minimumLength: 3,
          probability: 0.95,
        },
      },
      additionalAttemptProbability: {
        value: additionalProbability.value,
        evidence: createDefaultEvidence(evidenceClass.path, additionalProbability.name),
      },
      randomDecision: "weighted-boolean-per-attempt",
      candidateChoice: "uniform-random",
      deduplication: "add-unique",
      outcomes: {
        weightedFailureWithNoSelection: "not-found-empty",
        weightedFailureWithSelection: "found-selected",
        missingCandidate: "not-found-empty",
      },
      evidence: rentalTraceEvidence.selection,
      customerFlow: {
        callerClass: customerCallerClassName,
        callerFunction: customerCallerFunctionName,
        productPriority: "ready-console-before-movies",
        movieSelectionWhen: "no-ready-console-found",
        selectorCallCount: 2,
        selectorNotFound: "return-without-product",
        selectedMovies: {
          iteration: "all-returned-movies",
          destination: "customer-inventory",
          removesFromCandidateQueue: true,
        },
        evidence: customerTraceEvidence,
      },
    },
  };
}

function findQueueField(
  input: ReturnType<typeof findRentalEvidenceClass>,
  name: string,
) {
  const field = findOne(input.fields, (candidate) => candidate.name === name, `field ${name}`);
  if (field.arrayDimension !== 1 || !field.type.startsWith("Array<Object<")) {
    throw new Error(`Movie queue ${name} is not a one-dimensional object array.`);
  }
  return field;
}

function findProbabilityDefault(
  input: ReturnType<typeof findRentalEvidenceClass>,
  name: string,
) {
  const property = findOne(
    input.classDefault.properties,
    (candidate) => candidate.name === name,
    `default property ${name}`,
  );
  if (
    property.type !== "FloatProperty" ||
    property.arrayIndex !== 0 ||
    typeof property.value !== "number" ||
    !Number.isFinite(property.value) ||
    property.value < 0 ||
    property.value > 1
  ) {
    throw new Error(`Movie return probability ${name} is not a number from zero to one.`);
  }
  return { name: property.name, value: property.value };
}

function createFieldEvidence(classPath: string, fieldName: string) {
  return { artifactType: "rental-evidence" as const, classPath, fieldName };
}

function createDefaultEvidence(classPath: string, propertyName: string) {
  return { artifactType: "rental-evidence" as const, classPath, propertyName };
}
