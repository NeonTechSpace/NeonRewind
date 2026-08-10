import type { BlueprintCallTargetTraceContract } from "../generated/acquisition/blueprint-call-target-trace.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";
import { BlueprintCallCandidateTraceJsonSchema } from "./blueprint-call-candidate-trace.ts";

const traceDefinitions = BlueprintCallCandidateTraceJsonSchema.$defs;

export const BlueprintCallTargetTraceJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:acquisition:blueprint-call-target-trace",
  "title": "NeonRetroRewind Blueprint call-target trace",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "artifactType",
    "build",
    "sourceTrace",
    "declarations",
    "recordedCall",
    "binding",
    "mappings",
    "engine",
    "extractor"
  ],
  "properties": {
    "artifactType": {
      "const": "blueprint-call-target-trace"
    },
    "build": {
      "$ref": "#/$defs/buildReference"
    },
    "sourceTrace": {
      "$ref": "#/$defs/sourceTrace"
    },
    "declarations": {
      "$ref": "#/$defs/declarationsInput"
    },
    "recordedCall": {
      "$ref": "#/$defs/recordedCall"
    },
    "binding": {
      "$ref": "#/$defs/binding"
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
    "declarationsInput": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "fileName",
        "sizeBytes",
        "sha256",
        "artifactType",
        "targetFunctionName",
        "declarationRule"
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
          "const": "blueprint-function-declarations"
        },
        "targetFunctionName": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "declarationRule": {
          "const": "exact-raw-function-export-object-name"
        }
      }
    },
    "binding": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "bindingRule",
        "relationship",
        "receiverClassMatchesDeclarationOwner",
        "argumentCountMatchesParameterCount",
        "receiver",
        "declaration",
        "function"
      ],
      "properties": {
        "bindingRule": {
          "const": "exact-context-object-class-and-declaration"
        },
        "relationship": {
          "const": "verified"
        },
        "receiverClassMatchesDeclarationOwner": {
          "const": true
        },
        "argumentCountMatchesParameterCount": {
          "const": true
        },
        "receiver": {
          "$ref": "#/$defs/receiver"
        },
        "declaration": {
          "$ref": "#/$defs/targetDeclaration"
        },
        "function": {
          "$ref": "#/$defs/function"
        }
      }
    },
    "receiver": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "contextStatementIndex",
        "contextOpcode",
        "callEdge",
        "receiverStatementIndex",
        "receiverOpcode",
        "receiverEdge",
        "objectName",
        "objectPath",
        "classPath",
        "exportType"
      ],
      "properties": {
        "contextStatementIndex": {
          "type": "integer",
          "minimum": 0
        },
        "contextOpcode": {
          "const": "EX_Context"
        },
        "callEdge": {
          "const": "ContextExpression"
        },
        "receiverStatementIndex": {
          "type": "integer",
          "minimum": 0
        },
        "receiverOpcode": {
          "const": "EX_ObjectConst"
        },
        "receiverEdge": {
          "const": "ObjectExpression"
        },
        "objectName": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "objectPath": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "classPath": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "exportType": {
          "$ref": "#/$defs/nonEmptyString"
        }
      }
    },
    "targetDeclaration": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "packagePath",
        "packageExportIndex",
        "objectPath",
        "ownerPath",
        "signature"
      ],
      "properties": {
        "packagePath": {
          "type": "string",
          "minLength": 1,
          "pattern": "\\.uasset$"
        },
        "packageExportIndex": {
          "type": "integer",
          "minimum": 1
        },
        "objectPath": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "ownerPath": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "signature": {
          "$ref": "#/$defs/signature"
        }
      }
    }
  }
} as const;

export const BlueprintCallTargetTraceSchema =
  defineArtifactSchema<BlueprintCallTargetTraceContract>(
    BlueprintCallTargetTraceJsonSchema,
  );
export type BlueprintCallTargetTrace =
  typeof BlueprintCallTargetTraceSchema.infer;
