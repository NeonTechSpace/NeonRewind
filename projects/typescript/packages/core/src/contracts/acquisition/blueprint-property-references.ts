import type { BlueprintPropertyReferencesContract } from "../generated/acquisition/blueprint-property-references.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";

export const BlueprintPropertyReferencesJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:acquisition:blueprint-property-references",
  "title": "NeonRetroRewind Blueprint property references",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "artifactType",
    "build",
    "staticCensus",
    "mappings",
    "engine",
    "extractor",
    "target",
    "candidateRule",
    "referenceRule",
    "coverage",
    "totals",
    "references",
    "failures"
  ],
  "properties": {
    "artifactType": {
      "const": "blueprint-property-references"
    },
    "build": {
      "$ref": "#/$defs/buildReference"
    },
    "staticCensus": {
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
    "target": {
      "$ref": "#/$defs/target"
    },
    "candidateRule": {
      "const": "parsed-packages-with-function-exports"
    },
    "referenceRule": {
      "const": "exact-kismet-property-pointer-name"
    },
    "coverage": {
      "enum": [
        "complete",
        "partial"
      ]
    },
    "totals": {
      "$ref": "#/$defs/totals"
    },
    "references": {
      "type": "array",
      "uniqueItems": true,
      "items": {
        "$ref": "#/$defs/reference"
      }
    },
    "failures": {
      "type": "array",
      "uniqueItems": true,
      "items": {
        "$ref": "#/$defs/failure"
      }
    }
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "coverage": {
            "const": "complete"
          }
        },
        "required": [
          "coverage"
        ]
      },
      "then": {
        "properties": {
          "totals": {
            "properties": {
              "failedPackageCount": {
                "const": 0
              }
            }
          },
          "failures": {
            "maxItems": 0
          }
        }
      },
      "else": {
        "properties": {
          "totals": {
            "properties": {
              "failedPackageCount": {
                "minimum": 1
              }
            }
          },
          "failures": {
            "minItems": 1
          }
        }
      }
    }
  ],
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
    "target": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "propertyName"
      ],
      "properties": {
        "propertyName": {
          "type": "string",
          "minLength": 1,
          "maxLength": 256,
          "pattern": "^[^\\u0000-\\u001f\\u007f-\\u009f]+$"
        }
      }
    },
    "totals": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "candidatePackageCount",
        "scannedPackageCount",
        "failedPackageCount",
        "classCount",
        "functionCount",
        "referenceCount",
        "readCount",
        "writeCount",
        "metadataCount"
      ],
      "properties": {
        "candidatePackageCount": {
          "type": "integer",
          "minimum": 1
        },
        "scannedPackageCount": {
          "type": "integer",
          "minimum": 0
        },
        "failedPackageCount": {
          "type": "integer",
          "minimum": 0
        },
        "classCount": {
          "type": "integer",
          "minimum": 0
        },
        "functionCount": {
          "type": "integer",
          "minimum": 0
        },
        "referenceCount": {
          "type": "integer",
          "minimum": 0
        },
        "readCount": {
          "type": "integer",
          "minimum": 0
        },
        "writeCount": {
          "type": "integer",
          "minimum": 0
        },
        "metadataCount": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "reference": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "packagePath",
        "className",
        "classPath",
        "functionName",
        "functionPath",
        "access",
        "opcode",
        "pointerField",
        "statementIndex"
      ],
      "properties": {
        "packagePath": {
          "type": "string",
          "minLength": 1,
          "pattern": "\\.uasset$"
        },
        "className": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "classPath": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "functionName": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "functionPath": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "access": {
          "enum": [
            "read",
            "write",
            "metadata"
          ]
        },
        "opcode": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "pointerField": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "statementIndex": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "failure": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "packagePath",
        "errorType"
      ],
      "properties": {
        "packagePath": {
          "type": "string",
          "minLength": 1,
          "pattern": "\\.uasset$"
        },
        "errorType": {
          "type": "string",
          "minLength": 1,
          "pattern": "^[A-Za-z][A-Za-z0-9._+`]*$"
        }
      }
    },
    "sha256": {
      "type": "string",
      "pattern": "^[0-9a-f]{64}$"
    },
    "fileName": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[^/\\\\]+$"
    },
    "nonEmptyString": {
      "type": "string",
      "minLength": 1
    }
  }
} as const;

export const BlueprintPropertyReferencesSchema = defineArtifactSchema<BlueprintPropertyReferencesContract>(BlueprintPropertyReferencesJsonSchema);
export type BlueprintPropertyReferences = typeof BlueprintPropertyReferencesSchema.infer;
