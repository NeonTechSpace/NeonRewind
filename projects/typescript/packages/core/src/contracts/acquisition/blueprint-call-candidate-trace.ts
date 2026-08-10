import type { BlueprintCallCandidateTraceContract } from "../generated/acquisition/blueprint-call-candidate-trace.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";
import { BlueprintFunctionTraceJsonSchema } from "./blueprint-function-trace.ts";

const traceDefinitions = BlueprintFunctionTraceJsonSchema.$defs;

export const BlueprintCallCandidateTraceJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:acquisition:blueprint-call-candidate-trace",
  "title": "NeonRetroRewind Blueprint call-candidate trace",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "artifactType",
    "build",
    "sourceTrace",
    "recordedCall",
    "candidate",
    "mappings",
    "engine",
    "extractor"
  ],
  "properties": {
    "artifactType": {
      "const": "blueprint-call-candidate-trace"
    },
    "build": {
      "$ref": "#/$defs/buildReference"
    },
    "sourceTrace": {
      "$ref": "#/$defs/sourceTrace"
    },
    "recordedCall": {
      "$ref": "#/$defs/recordedCall"
    },
    "candidate": {
      "$ref": "#/$defs/candidate"
    },
    "mappings": {
      "$ref": "#/$defs/mappingIdentity"
    },
    "engine": {
      "$ref": "#/$defs/engineIdentity"
    },
    "extractor": {
      "$ref": "#/$defs/extractorIdentity"
    }
  },
  "$defs": {
    ...traceDefinitions,
    "sourceTrace": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "fileName",
        "sizeBytes",
        "sha256",
        "artifactType",
        "targetPropertyName"
      ],
      "properties": {
        "fileName": {
          "allOf": [
            { "$ref": "#/$defs/fileName" },
            { "pattern": "\\.json$" }
          ]
        },
        "sizeBytes": {
          "type": "integer",
          "minimum": 1
        },
        "sha256": {
          "$ref": "#/$defs/sha256"
        },
        "artifactType": {
          "const": "blueprint-property-reference-trace"
        },
        "targetPropertyName": {
          "$ref": "#/$defs/nonEmptyString"
        }
      }
    },
    "recordedCall": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "callerFunctionPath",
        "statementIndex",
        "opcode",
        "call"
      ],
      "properties": {
        "callerFunctionPath": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "statementIndex": {
          "type": "integer",
          "minimum": 0
        },
        "opcode": {
          "type": "string",
          "pattern": "^EX_"
        },
        "call": {
          "$ref": "#/$defs/call"
        }
      }
    },
    "candidate": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "selectionRule",
        "relationship",
        "argumentCountMatchesParameterCount",
        "signature",
        "function"
      ],
      "properties": {
        "selectionRule": {
          "const": "explicit-same-class-function-path"
        },
        "relationship": {
          "const": "unproven"
        },
        "argumentCountMatchesParameterCount": {
          "type": "boolean"
        },
        "signature": {
          "$ref": "#/$defs/signature"
        },
        "function": {
          "$ref": "#/$defs/function"
        }
      }
    },
    "signature": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "parameterCount",
        "parameters"
      ],
      "properties": {
        "parameterCount": {
          "type": "integer",
          "minimum": 0
        },
        "parameters": {
          "type": "array",
          "uniqueItems": true,
          "items": {
            "$ref": "#/$defs/parameter"
          }
        }
      }
    },
    "parameter": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "position",
        "name",
        "type",
        "arrayDimension",
        "flags"
      ],
      "properties": {
        "position": {
          "type": "integer",
          "minimum": 0
        },
        "name": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "type": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "arrayDimension": {
          "type": "integer",
          "minimum": 1
        },
        "flags": {
          "$ref": "#/$defs/nonEmptyString"
        }
      }
    }
  }
} as const;

export const BlueprintCallCandidateTraceSchema =
  defineArtifactSchema<BlueprintCallCandidateTraceContract>(
    BlueprintCallCandidateTraceJsonSchema,
  );
export type BlueprintCallCandidateTrace =
  typeof BlueprintCallCandidateTraceSchema.infer;
