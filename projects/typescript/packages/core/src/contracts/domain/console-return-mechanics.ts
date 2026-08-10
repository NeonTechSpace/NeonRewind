import type { ConsoleReturnMechanicsContract } from "../generated/domain/console-return-mechanics.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";

export const ConsoleReturnMechanicsJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:domain:console-return-mechanics",
  "title": "NeonRetroRewind console return mechanics",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "artifactType",
    "build",
    "sources",
    "scope",
    "evidenceLevel",
    "runtimeValidation",
    "configuration",
    "eligibility",
    "queueTransition"
  ],
  "properties": {
    "artifactType": {
      "const": "console-return-mechanics"
    },
    "build": {
      "$ref": "#/$defs/build"
    },
    "sources": {
      "$ref": "#/$defs/sources"
    },
    "scope": {
      "const": "console-return"
    },
    "evidenceLevel": {
      "const": "decompiled-blueprint"
    },
    "runtimeValidation": {
      "const": "not-run"
    },
    "configuration": {
      "$ref": "#/$defs/configuration"
    },
    "eligibility": {
      "$ref": "#/$defs/eligibility"
    },
    "queueTransition": {
      "$ref": "#/$defs/queueTransition"
    }
  },
  "$defs": {
    "build": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "steamAppId",
        "steamBuildId"
      ],
      "properties": {
        "steamAppId": {
          "type": "string",
          "pattern": "^[0-9]+$"
        },
        "steamBuildId": {
          "type": "string",
          "pattern": "^[0-9]+$"
        }
      }
    },
    "sources": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "rentalEvidence",
        "rentalBlueprintBodies"
      ],
      "properties": {
        "rentalEvidence": {
          "allOf": [
            {
              "$ref": "#/$defs/sourceIdentity"
            },
            {
              "properties": {
                "artifactType": {
                  "const": "rental-evidence"
                }
              }
            }
          ]
        },
        "rentalBlueprintBodies": {
          "allOf": [
            {
              "$ref": "#/$defs/sourceIdentity"
            },
            {
              "properties": {
                "artifactType": {
                  "const": "rental-blueprint-bodies"
                }
              }
            }
          ]
        }
      }
    },
    "sourceIdentity": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "fileName",
        "sha256",
        "sizeBytes",
        "artifactType"
      ],
      "properties": {
        "fileName": {
          "type": "string",
          "minLength": 1,
          "pattern": "^[^/\\\\]+\\.json$"
        },
        "sha256": {
          "$ref": "#/$defs/sha256"
        },
        "sizeBytes": {
          "type": "integer",
          "minimum": 1
        },
        "artifactType": {
          "enum": [
            "rental-evidence",
            "rental-blueprint-bodies"
          ]
        }
      }
    },
    "configuration": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "rentalDurationDays"
      ],
      "properties": {
        "rentalDurationDays": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "value",
            "evidence"
          ],
          "properties": {
            "value": {
              "type": "integer",
              "minimum": 1
            },
            "evidence": {
              "$ref": "#/$defs/defaultEvidence"
            }
          }
        }
      }
    },
    "eligibility": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "missingWeatherActorResult",
        "elapsedDays",
        "evidence"
      ],
      "properties": {
        "missingWeatherActorResult": {
          "const": false
        },
        "elapsedDays": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "currentDay",
            "rentalStartDay",
            "operator",
            "threshold"
          ],
          "properties": {
            "currentDay": {
              "const": "weather-days-passed"
            },
            "rentalStartDay": {
              "const": "console-rental-start-day"
            },
            "operator": {
              "const": "greater-than-or-equal"
            },
            "threshold": {
              "const": "rental-duration-days"
            }
          }
        },
        "evidence": {
          "$ref": "#/$defs/functionEvidence"
        }
      }
    },
    "queueTransition": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "when",
        "source",
        "destination",
        "removesFromSource",
        "evidence"
      ],
      "properties": {
        "when": {
          "const": "eligible"
        },
        "source": {
          "const": "rented"
        },
        "destination": {
          "const": "ready-to-return"
        },
        "removesFromSource": {
          "const": true
        },
        "evidence": {
          "$ref": "#/$defs/functionEvidence"
        }
      }
    },
    "defaultEvidence": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "artifactType",
        "classPath",
        "propertyName"
      ],
      "properties": {
        "artifactType": {
          "const": "rental-evidence"
        },
        "classPath": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "propertyName": {
          "$ref": "#/$defs/nonEmptyString"
        }
      }
    },
    "functionEvidence": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "artifactType",
        "classPath",
        "functionName"
      ],
      "properties": {
        "artifactType": {
          "const": "rental-blueprint-bodies"
        },
        "classPath": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "functionName": {
          "$ref": "#/$defs/nonEmptyString"
        }
      }
    },
    "sha256": {
      "type": "string",
      "pattern": "^[0-9a-f]{64}$"
    },
    "nonEmptyString": {
      "type": "string",
      "minLength": 1
    }
  }
} as const;

export const ConsoleReturnMechanicsSchema = defineArtifactSchema<ConsoleReturnMechanicsContract>(ConsoleReturnMechanicsJsonSchema);
export type ConsoleReturnMechanics = typeof ConsoleReturnMechanicsSchema.infer;

type RentalSourceIdentity =
  ConsoleReturnMechanics["sources"][keyof ConsoleReturnMechanics["sources"]];
export type RentalArtifactIdentity<
  ArtifactType extends RentalSourceIdentity["artifactType"] =
    RentalSourceIdentity["artifactType"],
> = Extract<RentalSourceIdentity, { artifactType: ArtifactType }>;
export type DefaultPropertyEvidence =
  ConsoleReturnMechanics["configuration"]["rentalDurationDays"]["evidence"];
export type BlueprintFunctionEvidence =
  ConsoleReturnMechanics["eligibility"]["evidence"];
