import type { UnlockableEvidenceContract } from "../generated/acquisition/unlockable-evidence.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";

export const UnlockableEvidenceJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:acquisition:unlockable-evidence",
  "title": "NeonRetroRewind unlockable-system evidence",
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
      "const": "unlockable-evidence"
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
      "minItems": 4,
      "maxItems": 4,
      "prefixItems": [
        {
          "allOf": [
            {
              "$ref": "#/$defs/package"
            },
            {
              "properties": {
                "path": {
                  "const": "ExampleGame/Content/ExampleProject/core/blueprint/research/BP_ExampleItem.uasset"
                },
                "blueprintClasses": {
                  "minItems": 1
                },
                "userDefinedStructs": {
                  "maxItems": 0
                }
              }
            }
          ]
        },
        {
          "allOf": [
            {
              "$ref": "#/$defs/package"
            },
            {
              "properties": {
                "path": {
                  "const": "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockFunctions.uasset"
                },
                "blueprintClasses": {
                  "minItems": 1
                },
                "userDefinedStructs": {
                  "maxItems": 0
                }
              }
            }
          ]
        },
        {
          "allOf": [
            {
              "$ref": "#/$defs/package"
            },
            {
              "properties": {
                "path": {
                  "const": "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.uasset"
                },
                "blueprintClasses": {
                  "minItems": 1
                },
                "userDefinedStructs": {
                  "maxItems": 0
                }
              }
            }
          ]
        },
        {
          "allOf": [
            {
              "$ref": "#/$defs/package"
            },
            {
              "properties": {
                "path": {
                  "const": "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockState.uasset"
                },
                "blueprintClasses": {
                  "maxItems": 0
                },
                "userDefinedStructs": {
                  "minItems": 1
                }
              }
            }
          ]
        }
      ],
      "items": false
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
          "const": 4
        },
        "blueprintClassCount": {
          "const": 3
        },
        "userDefinedStructCount": {
          "const": 1
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
            "ExampleGame/Content/ExampleProject/core/blueprint/research/BP_ExampleItem.uasset",
            "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockFunctions.uasset",
            "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.uasset",
            "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockState.uasset"
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

export const UnlockableEvidenceSchema = defineArtifactSchema<UnlockableEvidenceContract>(UnlockableEvidenceJsonSchema);
export type UnlockableEvidence = typeof UnlockableEvidenceSchema.infer;
