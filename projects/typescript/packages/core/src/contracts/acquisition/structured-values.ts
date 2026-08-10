import type { StructuredValuesContract } from "../generated/acquisition/structured-values.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";

export const StructuredValuesJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:acquisition:structured-values",
  "title": "NeonRetroRewind structured values",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "artifactType",
    "build",
    "structuredIndex",
    "mappings",
    "engine",
    "extractor",
    "totals",
    "dataTables",
    "stringTables",
    "failures",
    "failureTypes"
  ],
  "properties": {
    "artifactType": {
      "const": "structured-values"
    },
    "build": {
      "$ref": "#/$defs/buildReference"
    },
    "structuredIndex": {
      "$ref": "#/$defs/structuredIndexIdentity"
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
    "dataTables": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/dataTable"
      }
    },
    "stringTables": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/stringTable"
      }
    },
    "failures": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/failure"
      }
    },
    "failureTypes": {
      "$ref": "#/$defs/counts"
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
    "structuredIndexIdentity": {
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
          "type": "string",
          "minLength": 1
        },
        "cue4ParseVersion": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "totals": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "candidatePackageCount",
        "extractedPackageCount",
        "failedPackageCount",
        "dataTableCount",
        "dataTableRowCount",
        "dataTableRowPropertyCount",
        "stringTableCount",
        "stringTableEntryCount",
        "stringTableMetadataCount"
      ],
      "properties": {
        "candidatePackageCount": {
          "$ref": "#/$defs/nonNegativeInteger"
        },
        "extractedPackageCount": {
          "$ref": "#/$defs/nonNegativeInteger"
        },
        "failedPackageCount": {
          "$ref": "#/$defs/nonNegativeInteger"
        },
        "dataTableCount": {
          "$ref": "#/$defs/nonNegativeInteger"
        },
        "dataTableRowCount": {
          "$ref": "#/$defs/nonNegativeInteger"
        },
        "dataTableRowPropertyCount": {
          "$ref": "#/$defs/nonNegativeInteger"
        },
        "stringTableCount": {
          "$ref": "#/$defs/nonNegativeInteger"
        },
        "stringTableEntryCount": {
          "$ref": "#/$defs/nonNegativeInteger"
        },
        "stringTableMetadataCount": {
          "$ref": "#/$defs/nonNegativeInteger"
        }
      }
    },
    "dataTable": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "path",
        "name",
        "type",
        "rowStruct",
        "rows"
      ],
      "properties": {
        "path": {
          "$ref": "#/$defs/packagePath"
        },
        "name": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "type": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "rowStruct": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1
        },
        "rows": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/dataTableRow"
          }
        }
      }
    },
    "dataTableRow": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "key",
        "values"
      ],
      "properties": {
        "key": {
          "type": "string"
        },
        "values": {
          "type": "object",
          "additionalProperties": true
        }
      }
    },
    "stringTable": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "path",
        "name",
        "type",
        "namespace",
        "entries"
      ],
      "properties": {
        "path": {
          "$ref": "#/$defs/packagePath"
        },
        "name": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "type": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "namespace": {
          "type": "string"
        },
        "entries": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/stringTableEntry"
          }
        }
      }
    },
    "stringTableEntry": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "key",
        "value",
        "metadata"
      ],
      "properties": {
        "key": {
          "type": "string"
        },
        "value": {
          "type": "string"
        },
        "metadata": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/stringTableMetadata"
          }
        }
      }
    },
    "stringTableMetadata": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "value"
      ],
      "properties": {
        "name": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "value": {
          "type": "string"
        }
      }
    },
    "failure": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "path",
        "errorType"
      ],
      "properties": {
        "path": {
          "$ref": "#/$defs/packagePath"
        },
        "errorType": {
          "$ref": "#/$defs/nonEmptyString"
        }
      }
    },
    "counts": {
      "type": "array",
      "uniqueItems": true,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "name",
          "count"
        ],
        "properties": {
          "name": {
            "$ref": "#/$defs/nonEmptyString"
          },
          "count": {
            "type": "integer",
            "minimum": 1
          }
        }
      }
    },
    "packagePath": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[^\\\\]+\\.(uasset|umap)$"
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

export const StructuredValuesSchema = defineArtifactSchema<StructuredValuesContract>(StructuredValuesJsonSchema);
export type StructuredValues = typeof StructuredValuesSchema.infer;
