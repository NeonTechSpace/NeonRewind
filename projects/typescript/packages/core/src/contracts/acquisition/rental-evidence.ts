import type { RentalEvidenceContract } from "../generated/acquisition/rental-evidence.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";

export const RentalEvidenceJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:acquisition:rental-evidence",
  "title": "NeonRetroRewind rental evidence",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "artifactType",
    "build",
    "staticCensus",
    "mappings",
    "engine",
    "extractor",
    "totals",
    "packages"
  ],
  "properties": {
    "artifactType": {
      "const": "rental-evidence"
    },
    "build": {
      "$ref": "#/$defs/buildReference"
    },
    "staticCensus": {
      "$ref": "#/$defs/staticCensusIdentity"
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
    "packages": {
      "type": "array",
      "minItems": 6,
      "maxItems": 6,
      "items": {
        "$ref": "#/$defs/package"
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
    "staticCensusIdentity": {
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
        "blueprintClassCount",
        "userDefinedStructCount",
        "functionCount",
        "fieldCount",
        "defaultPropertyCount",
        "referenceCount"
      ],
      "properties": {
        "packageCount": {
          "const": 6
        },
        "blueprintClassCount": {
          "const": 4
        },
        "userDefinedStructCount": {
          "const": 2
        },
        "functionCount": {
          "$ref": "#/$defs/nonNegativeInteger"
        },
        "fieldCount": {
          "$ref": "#/$defs/nonNegativeInteger"
        },
        "defaultPropertyCount": {
          "$ref": "#/$defs/nonNegativeInteger"
        },
        "referenceCount": {
          "$ref": "#/$defs/nonNegativeInteger"
        }
      }
    },
    "package": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "path",
        "blueprintClasses",
        "userDefinedStructs"
      ],
      "properties": {
        "path": {
          "enum": [
            "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleReturn.uasset",
            "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleExampleFeeRecord.uasset",
            "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExamplePayment.uasset",
            "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleFeeRecord.uasset",
            "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.uasset",
            "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueStruct.uasset"
          ]
        },
        "blueprintClasses": {
          "type": "array",
          "maxItems": 1,
          "items": {
            "$ref": "#/$defs/blueprintClass"
          }
        },
        "userDefinedStructs": {
          "type": "array",
          "maxItems": 1,
          "items": {
            "$ref": "#/$defs/userDefinedStruct"
          }
        }
      }
    },
    "blueprintClass": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "path",
        "superclassPath",
        "functions",
        "fields",
        "classDefault"
      ],
      "properties": {
        "name": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "path": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "superclassPath": {
          "$ref": "#/$defs/nullableString"
        },
        "functions": {
          "$ref": "#/$defs/stringArray"
        },
        "fields": {
          "$ref": "#/$defs/fields"
        },
        "classDefault": {
          "$ref": "#/$defs/classDefault"
        }
      }
    },
    "userDefinedStruct": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "path",
        "superStructPath",
        "fields",
        "defaults",
        "references"
      ],
      "properties": {
        "name": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "path": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "superStructPath": {
          "$ref": "#/$defs/nullableString"
        },
        "fields": {
          "$ref": "#/$defs/fields"
        },
        "defaults": {
          "$ref": "#/$defs/defaults"
        },
        "references": {
          "$ref": "#/$defs/references"
        }
      }
    },
    "classDefault": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "path",
        "properties",
        "references"
      ],
      "properties": {
        "name": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "path": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "properties": {
          "$ref": "#/$defs/defaults"
        },
        "references": {
          "$ref": "#/$defs/references"
        }
      }
    },
    "fields": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "name",
          "type",
          "arrayDimension"
        ],
        "properties": {
          "name": {
            "$ref": "#/$defs/nonEmptyString"
          },
          "type": {
            "$ref": "#/$defs/nonEmptyString"
          },
          "arrayDimension": {
            "type": "integer",
            "minimum": 1
          }
        }
      }
    },
    "defaults": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "name",
          "type",
          "arrayIndex",
          "value"
        ],
        "properties": {
          "name": {
            "$ref": "#/$defs/nonEmptyString"
          },
          "type": {
            "$ref": "#/$defs/nonEmptyString"
          },
          "arrayIndex": {
            "type": "integer",
            "minimum": 0
          },
          "value": true
        }
      }
    },
    "references": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "propertyPath",
          "kind",
          "objectPath"
        ],
        "properties": {
          "propertyPath": {
            "$ref": "#/$defs/nonEmptyString"
          },
          "kind": {
            "enum": [
              "delegate",
              "hard",
              "interface",
              "soft"
            ]
          },
          "objectPath": {
            "$ref": "#/$defs/nonEmptyString"
          }
        }
      }
    },
    "stringArray": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/nonEmptyString"
      }
    },
    "nullableString": {
      "type": [
        "string",
        "null"
      ],
      "minLength": 1
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
    },
    "nonNegativeInteger": {
      "type": "integer",
      "minimum": 0
    }
  }
} as const;

export const RentalEvidenceSchema = defineArtifactSchema<RentalEvidenceContract>(RentalEvidenceJsonSchema);
export type RentalEvidence = typeof RentalEvidenceSchema.infer;
