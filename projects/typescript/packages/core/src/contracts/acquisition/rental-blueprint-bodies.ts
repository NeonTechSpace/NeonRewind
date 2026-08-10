import type { RentalBlueprintBodiesContract } from "../generated/acquisition/rental-blueprint-bodies.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";

export const RentalBlueprintBodiesJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:acquisition:rental-blueprint-bodies",
  "title": "NeonRetroRewind rental Blueprint bodies",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "artifactType",
    "build",
    "rentalEvidence",
    "mappings",
    "engine",
    "extractor",
    "totals",
    "classes"
  ],
  "properties": {
    "artifactType": {
      "const": "rental-blueprint-bodies"
    },
    "build": {
      "$ref": "#/$defs/buildReference"
    },
    "rentalEvidence": {
      "$ref": "#/$defs/inputIdentity"
    },
    "mappings": {
      "$ref": "#/$defs/mappingIdentity"
    },
    "engine": {
      "$ref": "#/$defs/engineIdentity"
    },
    "extractor": {
      "$ref": "#/$defs/extractorIdentity"
    },
    "totals": {
      "$ref": "#/$defs/totals"
    },
    "classes": {
      "type": "array",
      "minItems": 4,
      "maxItems": 4,
      "items": {
        "$ref": "#/$defs/blueprintClass"
      }
    }
  },
  "$defs": {
    "buildReference": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "manifestSha256",
        "steamAppId",
        "steamBuildId"
      ],
      "properties": {
        "manifestSha256": {
          "$ref": "#/$defs/sha256"
        },
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
    "inputIdentity": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "fileName",
        "sizeBytes",
        "sha256"
      ],
      "properties": {
        "fileName": {
          "allOf": [
            {
              "$ref": "#/$defs/fileName"
            },
            {
              "pattern": "\\.json$"
            }
          ]
        },
        "sizeBytes": {
          "type": "integer",
          "minimum": 1
        },
        "sha256": {
          "$ref": "#/$defs/sha256"
        }
      }
    },
    "mappingIdentity": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "fileName",
        "sizeBytes",
        "sha256",
        "formatVersion"
      ],
      "properties": {
        "fileName": {
          "allOf": [
            {
              "$ref": "#/$defs/fileName"
            },
            {
              "pattern": "\\.usmap$"
            }
          ]
        },
        "sizeBytes": {
          "type": "integer",
          "minimum": 16
        },
        "sha256": {
          "$ref": "#/$defs/sha256"
        },
        "formatVersion": {
          "const": 4
        }
      }
    },
    "engineIdentity": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "version",
        "cue4ParseProfile",
        "source",
        "confidence"
      ],
      "properties": {
        "version": {
          "const": "5.4"
        },
        "cue4ParseProfile": {
          "const": "GAME_UE5_4"
        },
        "source": {
          "const": "configured"
        },
        "confidence": {
          "const": "probable"
        }
      }
    },
    "extractorIdentity": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "version",
        "cue4ParseVersion"
      ],
      "properties": {
        "name": {
          "const": "NeonRetroRewind.StaticExtractor"
        },
        "version": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "cue4ParseVersion": {
          "$ref": "#/$defs/nonEmptyString"
        }
      }
    },
    "totals": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "packageCount",
        "classCount",
        "functionCount",
        "bytecodeExpressionCount",
        "pseudoCodeCharacterCount"
      ],
      "properties": {
        "packageCount": {
          "const": 4
        },
        "classCount": {
          "const": 4
        },
        "functionCount": {
          "type": "integer",
          "minimum": 1
        },
        "bytecodeExpressionCount": {
          "type": "integer",
          "minimum": 1
        },
        "pseudoCodeCharacterCount": {
          "type": "integer",
          "minimum": 1
        }
      }
    },
    "blueprintClass": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "packagePath",
        "name",
        "path",
        "functions",
        "pseudoCode"
      ],
      "properties": {
        "packagePath": {
          "enum": [
            "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleReturn.uasset",
            "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleExampleFeeRecord.uasset",
            "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExamplePayment.uasset",
            "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.uasset"
          ]
        },
        "name": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "path": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "functions": {
          "type": "array",
          "minItems": 1,
          "items": {
            "$ref": "#/$defs/function"
          }
        },
        "pseudoCode": {
          "$ref": "#/$defs/nonEmptyString"
        }
      }
    },
    "function": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "path",
        "flags",
        "bytecodeExpressionCount"
      ],
      "properties": {
        "name": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "path": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "flags": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "bytecodeExpressionCount": {
          "type": "integer",
          "minimum": 1
        }
      }
    },
    "fileName": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[^/\\\\]+$"
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

export const RentalBlueprintBodiesSchema = defineArtifactSchema<RentalBlueprintBodiesContract>(RentalBlueprintBodiesJsonSchema);
export type RentalBlueprintBodies = typeof RentalBlueprintBodiesSchema.infer;
