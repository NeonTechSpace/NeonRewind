import type { BlueprintPropertyReferenceTraceContract } from "../generated/acquisition/blueprint-property-reference-trace.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";
import { BlueprintFunctionTraceJsonSchema } from "./blueprint-function-trace.ts";

const traceDefinitions = BlueprintFunctionTraceJsonSchema.$defs;

export const BlueprintPropertyReferenceTraceJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:acquisition:blueprint-property-reference-trace",
  "title": "NeonRetroRewind Blueprint property-reference trace",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "artifactType",
    "build",
    "blueprintPropertyReferences",
    "requestedFunctionPaths",
    "selectionRule",
    "mappings",
    "engine",
    "extractor",
    "totals",
    "functions"
  ],
  "properties": {
    "artifactType": {
      "const": "blueprint-property-reference-trace"
    },
    "build": {
      "$ref": "#/$defs/buildReference"
    },
    "blueprintPropertyReferences": {
      "$ref": "#/$defs/propertyReferencesInput"
    },
    "requestedFunctionPaths": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1024
      }
    },
    "selectionRule": {
      "const": "explicit-functions-with-read-references"
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
    ...traceDefinitions,
    "propertyReferencesInput": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "fileName",
        "sizeBytes",
        "sha256",
        "targetPropertyName"
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
        },
        "targetPropertyName": {
          "type": "string",
          "minLength": 1,
          "maxLength": 256,
          "pattern": "^[^\\u0000-\\u001f\\u007f-\\u009f]+$"
        }
      }
    },
    "totals": {
      ...traceDefinitions.totals,
      "properties": {
        ...traceDefinitions.totals.properties,
        "callCount": {
          "type": "integer",
          "minimum": 0
        }
      }
    }
  }
} as const;

export const BlueprintPropertyReferenceTraceSchema = defineArtifactSchema<BlueprintPropertyReferenceTraceContract>(BlueprintPropertyReferenceTraceJsonSchema);
export type BlueprintPropertyReferenceTrace = typeof BlueprintPropertyReferenceTraceSchema.infer;
