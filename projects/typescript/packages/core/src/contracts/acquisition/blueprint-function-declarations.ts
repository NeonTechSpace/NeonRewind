import type { BlueprintFunctionDeclarationsContract } from "../generated/acquisition/blueprint-function-declarations.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";
import { BlueprintCallCandidateTraceJsonSchema } from "./blueprint-call-candidate-trace.ts";
import { BlueprintPropertyReferencesJsonSchema } from "./blueprint-property-references.ts";

const referenceDefinitions = BlueprintPropertyReferencesJsonSchema.$defs;
const candidateDefinitions = BlueprintCallCandidateTraceJsonSchema.$defs;

export const BlueprintFunctionDeclarationsJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:acquisition:blueprint-function-declarations",
  "title": "NeonRetroRewind Blueprint function declarations",
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
    "declarationRule",
    "coverage",
    "totals",
    "declarations",
    "failures"
  ],
  "properties": {
    "artifactType": {
      "const": "blueprint-function-declarations"
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
    "declarationRule": {
      "const": "exact-raw-function-export-object-name"
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
    "declarations": {
      "type": "array",
      "uniqueItems": true,
      "items": {
        "$ref": "#/$defs/declaration"
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
    ...referenceDefinitions,
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
        "candidatePackageCount",
        "scannedPackageCount",
        "failedPackageCount",
        "rawFunctionExportCount",
        "matchedDeclarationCount"
      ],
      "properties": {
        "candidatePackageCount": {
          "type": "integer",
          "minimum": 0
        },
        "scannedPackageCount": {
          "type": "integer",
          "minimum": 0
        },
        "failedPackageCount": {
          "type": "integer",
          "minimum": 0
        },
        "rawFunctionExportCount": {
          "type": "integer",
          "minimum": 0
        },
        "matchedDeclarationCount": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "declaration": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "packagePath",
        "packageExportIndex",
        "objectName",
        "objectPath",
        "ownerPath",
        "ownerExportType",
        "flags",
        "bytecodeExpressionCount",
        "signature",
        "ownerLinkage"
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
        "objectName": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "objectPath": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "ownerPath": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "ownerExportType": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "flags": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "bytecodeExpressionCount": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "signature": {
          "$ref": "#/$defs/signature"
        },
        "ownerLinkage": {
          "$ref": "#/$defs/ownerLinkage"
        }
      }
    },
    "signature": candidateDefinitions.signature,
    "parameter": candidateDefinitions.parameter,
    "ownerLinkage": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "funcMapContainsDeclaration",
        "childrenContainsDeclaration",
        "superclassPath",
        "interfacePaths"
      ],
      "properties": {
        "funcMapContainsDeclaration": {
          "type": [
            "boolean",
            "null"
          ]
        },
        "childrenContainsDeclaration": {
          "type": [
            "boolean",
            "null"
          ]
        },
        "superclassPath": {
          "type": [
            "string",
            "null"
          ],
          "minLength": 1,
          "maxLength": 1024
        },
        "interfacePaths": {
          "type": "array",
          "uniqueItems": true,
          "items": {
            "$ref": "#/$defs/nonEmptyString"
          }
        }
      }
    }
  }
} as const;

export const BlueprintFunctionDeclarationsSchema =
  defineArtifactSchema<BlueprintFunctionDeclarationsContract>(
    BlueprintFunctionDeclarationsJsonSchema,
  );
export type BlueprintFunctionDeclarations =
  typeof BlueprintFunctionDeclarationsSchema.infer;
