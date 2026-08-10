import type { MovieReturnValidationContract } from "../generated/validation/movie-return-validation.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";

export const MovieReturnValidationJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:validation:movie-return-validation",
  "title": "NeonRetroRewind movie-return runtime validation",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "artifactType",
    "build",
    "validator",
    "sources",
    "validation"
  ],
  "properties": {
    "artifactType": {
      "const": "movie-return-runtime-validation"
    },
    "build": {
      "$ref": "#/$defs/build"
    },
    "validator": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "version"
      ],
      "properties": {
        "name": {
          "const": "@neonretrorewind/validator"
        },
        "version": {
          "const": "0.0.0"
        }
      }
    },
    "sources": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "observation",
        "mechanics"
      ],
      "properties": {
        "observation": {
          "$ref": "#/$defs/observationIdentity"
        },
        "mechanics": {
          "$ref": "#/$defs/mechanicsIdentity"
        }
      }
    },
    "validation": {
      "$ref": "#/$defs/validation"
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
    "observationIdentity": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "fileName",
        "sizeBytes",
        "sha256",
        "artifactType"
      ],
      "properties": {
        "fileName": {
          "$ref": "#/$defs/fileName"
        },
        "sizeBytes": {
          "$ref": "#/$defs/sizeBytes"
        },
        "sha256": {
          "$ref": "#/$defs/sha256"
        },
        "artifactType": {
          "const": "movie-return-runtime-observation"
        }
      }
    },
    "mechanicsIdentity": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "fileName",
        "sizeBytes",
        "sha256",
        "artifactType"
      ],
      "properties": {
        "fileName": {
          "const": "movie-return-mechanics.json"
        },
        "sizeBytes": {
          "$ref": "#/$defs/sizeBytes"
        },
        "sha256": {
          "$ref": "#/$defs/sha256"
        },
        "artifactType": {
          "const": "movie-return-mechanics"
        }
      }
    },
    "validation": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "outcome",
        "checkedEventCount",
        "issues"
      ],
      "properties": {
        "outcome": {
          "enum": [
            "passed",
            "incomplete",
            "mismatch"
          ]
        },
        "checkedEventCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 256
        },
        "issues": {
          "type": "array",
          "maxItems": 8192,
          "items": {
            "$ref": "#/$defs/issue"
          }
        }
      }
    },
    "issue": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "kind",
        "code",
        "sequence",
        "message"
      ],
      "properties": {
        "kind": {
          "enum": [
            "incomplete",
            "mismatch"
          ]
        },
        "code": {
          "enum": [
            "run-not-complete",
            "complete-run-missing-event",
            "invalid-run-time-range",
            "event-sequence-changed",
            "event-time-before-run",
            "event-time-after-run",
            "event-time-moved-backward",
            "capture-truncated",
            "capture-count-mismatch",
            "readiness-source-empty",
            "readiness-source-not-cleared",
            "readiness-destination-mismatch",
            "selection-result-count-exceeded",
            "selection-result-duplicate",
            "selection-found-result-mismatch",
            "selection-outside-ready-queue",
            "customer-selection-outside-ready-queue",
            "customer-ready-queue-mismatch",
            "customer-inventory-mismatch"
          ]
        },
        "sequence": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 1,
          "maximum": 256
        },
        "message": {
          "type": "string",
          "minLength": 1,
          "maxLength": 500
        }
      }
    },
    "fileName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 255,
      "pattern": "^[^/\\\\]+$"
    },
    "sizeBytes": {
      "type": "integer",
      "minimum": 1
    },
    "sha256": {
      "type": "string",
      "pattern": "^[0-9a-f]{64}$"
    }
  }
} as const;

export const MovieReturnValidationSchema = defineArtifactSchema<MovieReturnValidationContract>(MovieReturnValidationJsonSchema);
export type MovieReturnValidation = typeof MovieReturnValidationSchema.infer;

export type MovieReturnValidationArtifact = MovieReturnValidation;
export type MovieReturnValidationReport = MovieReturnValidation["validation"];
export type MovieReturnValidationIssue = MovieReturnValidationReport["issues"][number];
export type MovieReturnValidationIssueCode = MovieReturnValidationIssue["code"];
type ValidationSource =
  MovieReturnValidation["sources"][keyof MovieReturnValidation["sources"]];
export type ValidationSourceIdentity<
  ArtifactType extends ValidationSource["artifactType"],
> = Extract<ValidationSource, { artifactType: ArtifactType }>;
