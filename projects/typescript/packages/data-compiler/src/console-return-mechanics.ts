import type { ConsoleReturnMechanics } from "@neonrewind/core";

import type {
  RentalBlueprintBodiesArtifact,
  RentalEvidenceArtifact,
} from "./rental-inputs.ts";
import {
  assertBlueprintFunction,
  assertRentalInputIdentity,
  findOne,
  findRentalBodyClass,
  findRentalEvidenceClass,
  type RentalMechanicSources,
} from "./rental-mechanic-evidence.ts";

const rentalDurationProperty = "Number of day a console is rented";
const eligibilityFunction = "Is this console ready to come back from rent";
const queueFunction = "Get Console Rent ready for return";
const rentedField = "Console Base out for Rent";
const readyField = "Console Base out Ready to Return";

export type ConsoleReturnSources = RentalMechanicSources;

export function compileConsoleReturnMechanics(
  rentalEvidence: RentalEvidenceArtifact,
  blueprintBodies: RentalBlueprintBodiesArtifact,
  sources: ConsoleReturnSources,
): ConsoleReturnMechanics {
  assertRentalInputIdentity(rentalEvidence, blueprintBodies, sources);
  const evidenceClass = findRentalEvidenceClass(rentalEvidence);
  const bodyClass = findRentalBodyClass(blueprintBodies);
  if (bodyClass.path !== evidenceClass.path) {
    throw new Error("Rental class paths differ between the two source artifacts.");
  }

  const duration = findOne(
    evidenceClass.classDefault.properties,
    (property) => property.name === rentalDurationProperty,
    `default property ${rentalDurationProperty}`,
  );
  if (
    duration.type !== "IntProperty" ||
    duration.arrayIndex !== 0 ||
    typeof duration.value !== "number" ||
    !Number.isSafeInteger(duration.value) ||
    duration.value < 1
  ) {
    throw new Error("Console rental duration is not a positive integer default.");
  }

  const rented = findField(evidenceClass, rentedField);
  const ready = findField(evidenceClass, readyField);
  if (
    rented.arrayDimension !== 1 ||
    ready.arrayDimension !== 1 ||
    rented.type !== ready.type ||
    !rented.type.startsWith("Array<Object<")
  ) {
    throw new Error("Console rental queues do not have one matching object-array type.");
  }

  assertBlueprintFunction(bodyClass, eligibilityFunction, [
    "Weather Actor ref->Days Passed - Console to Test->The Game Day It Was Rent",
    ">= Number of day a console is rented",
    "ReturnValue = false",
  ]);
  assertBlueprintFunction(bodyClass, queueFunction, [
    "Is this console ready to come back from rent(CallFunc_Array_Get_Item_1)",
    "if (!CallFunc_Is_this_console_ready_to_come_back_from_rent_ReturnValue)",
    "Console Base out Ready to Return.Add(CallFunc_Array_Get_Item_1)",
    "Console Base out for Rent.Remove(CallFunc_Array_Get_Item)",
  ]);

  return {
    artifactType: "console-return-mechanics",
    schemaVersion: 1,
    build: {
      steamAppId: rentalEvidence.build.steamAppId,
      steamBuildId: rentalEvidence.build.steamBuildId,
    },
    sources,
    scope: "console-return",
    evidenceLevel: "decompiled-blueprint",
    runtimeValidation: "not-run",
    configuration: {
      rentalDurationDays: {
        value: duration.value,
        evidence: {
          artifactType: "rental-evidence",
          classPath: evidenceClass.path,
          propertyName: duration.name,
        },
      },
    },
    eligibility: {
      missingWeatherActorResult: false,
      elapsedDays: {
        currentDay: "weather-days-passed",
        rentalStartDay: "console-rental-start-day",
        operator: "greater-than-or-equal",
        threshold: "rental-duration-days",
      },
      evidence: {
        artifactType: "rental-blueprint-bodies",
        classPath: bodyClass.path,
        functionName: eligibilityFunction,
      },
    },
    queueTransition: {
      when: "eligible",
      source: "rented",
      destination: "ready-to-return",
      removesFromSource: true,
      evidence: {
        artifactType: "rental-blueprint-bodies",
        classPath: bodyClass.path,
        functionName: queueFunction,
      },
    },
  };
}

function findField(input: ReturnType<typeof findRentalEvidenceClass>, name: string) {
  return findOne(input.fields, (field) => field.name === name, `field ${name}`);
}
