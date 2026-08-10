import type { BlueprintCallerBodiesContract } from "../generated/acquisition/blueprint-caller-bodies.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";

export const BlueprintCallerBodiesJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:acquisition:blueprint-caller-bodies",
  "title": "NeonRetroRewind Blueprint caller bodies",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "artifactType",
    "build",
    "callSites",
    "mappings",
    "engine",
    "extractor",
    "target",
    "totals",
    "functions"
  ],
  "properties": {
    "artifactType": {
      "const": "blueprint-caller-bodies"
    },
    "build": {
      "$ref": "#/$defs/buildReference"
    },
    "callSites": {
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
    "totals": {
      "$ref": "#/$defs/totals"
    },
    "functions": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": {
        "$ref": "#/$defs/function"
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
    "target": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "functionName"
      ],
      "properties": {
        "functionName": {
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
        "packageCount",
        "classCount",
        "functionCount",
        "callSiteCount",
        "pseudoCodeCharacterCount"
      ],
      "properties": {
        "packageCount": {
          "type": "integer",
          "minimum": 1
        },
        "classCount": {
          "type": "integer",
          "minimum": 1
        },
        "functionCount": {
          "type": "integer",
          "minimum": 1
        },
        "callSiteCount": {
          "type": "integer",
          "minimum": 1
        },
        "pseudoCodeCharacterCount": {
          "type": "integer",
          "minimum": 1
        }
      }
    },
    "function": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "packagePath",
        "className",
        "classPath",
        "functionName",
        "functionPath",
        "flags",
        "bytecodeExpressionCount",
        "calls",
        "pseudoCode"
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
        "flags": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "bytecodeExpressionCount": {
          "type": "integer",
          "minimum": 1
        },
        "calls": {
          "type": "array",
          "minItems": 1,
          "uniqueItems": true,
          "items": {
            "$ref": "#/$defs/call"
          }
        },
        "pseudoCode": {
          "$ref": "#/$defs/nonEmptyString"
        }
      }
    },
    "call": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "callKind",
        "statementIndex"
      ],
      "properties": {
        "callKind": {
          "enum": [
            "virtual",
            "local-virtual",
            "final",
            "local-final"
          ]
        },
        "statementIndex": {
          "type": "integer",
          "minimum": 0
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

export const BlueprintCallerBodiesSchema = defineArtifactSchema<BlueprintCallerBodiesContract>(BlueprintCallerBodiesJsonSchema);
export type BlueprintCallerBodies = typeof BlueprintCallerBodiesSchema.infer;
