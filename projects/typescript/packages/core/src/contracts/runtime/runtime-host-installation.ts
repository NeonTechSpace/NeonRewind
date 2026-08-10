import type { RuntimeHostInstallationContract } from "../generated/runtime/runtime-host-installation.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";

export const RuntimeHostInstallationJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:runtime:runtime-host-installation",
  "title": "NeonRetroRewind runtime-host installation manifest",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "artifactType",
    "stagingManifest",
    "build",
    "gameDirectory",
    "installedFiles"
  ],
  "properties": {
    "artifactType": {
      "const": "runtime-host-installation"
    },
    "stagingManifest": {
      "allOf": [
        {
          "$ref": "#/$defs/fileIdentity"
        },
        {
          "type": "object",
          "properties": {
            "fileName": {
              "const": "runtime-host-staging.json"
            }
          }
        }
      ]
    },
    "build": {
      "$ref": "#/$defs/build"
    },
    "gameDirectory": {
      "$ref": "#/$defs/gameDirectory"
    },
    "installedFiles": {
      "type": "array",
      "minItems": 2,
      "maxItems": 2,
      "prefixItems": [
        {
          "allOf": [
            {
              "$ref": "#/$defs/installedFile"
            },
            {
              "type": "object",
              "properties": {
                "relativePath": {
                  "const": "dwmapi.dll"
                }
              }
            }
          ]
        },
        {
          "allOf": [
            {
              "$ref": "#/$defs/installedFile"
            },
            {
              "type": "object",
              "properties": {
                "relativePath": {
                  "const": "override.txt"
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
    "sha256": {
      "type": "string",
      "pattern": "^[0-9a-f]{64}$"
    },
    "fileIdentity": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "fileName",
        "sizeBytes",
        "sha256"
      ],
      "properties": {
        "fileName": {
          "type": "string",
          "minLength": 1,
          "pattern": "^[^/\\\\]+$"
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
    "build": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "steamAppId",
        "steamBuildId",
        "buildManifest",
        "executable"
      ],
      "properties": {
        "steamAppId": {
          "const": "3552140"
        },
        "steamBuildId": {
          "type": "string",
          "pattern": "^[0-9]+$"
        },
        "buildManifest": {
          "$ref": "#/$defs/fileIdentity"
        },
        "executable": {
          "$ref": "#/$defs/fileIdentity"
        }
      }
    },
    "gameDirectory": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "absolutePath"
      ],
      "properties": {
        "absolutePath": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "installedFile": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "relativePath",
        "sizeBytes",
        "sha256"
      ],
      "properties": {
        "relativePath": {
          "enum": [
            "dwmapi.dll",
            "override.txt"
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
    }
  }
} as const;

export const RuntimeHostInstallationSchema = defineArtifactSchema<RuntimeHostInstallationContract>(RuntimeHostInstallationJsonSchema);
export type RuntimeHostInstallation = typeof RuntimeHostInstallationSchema.infer;
