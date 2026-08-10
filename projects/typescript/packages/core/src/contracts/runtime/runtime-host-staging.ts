import type { RuntimeHostStagingContract } from "../generated/runtime/runtime-host-staging.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";

export const RuntimeHostStagingJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:runtime:runtime-host-staging",
  "title": "NeonRetroRewind runtime-host staging manifest",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "artifactType",
    "build",
    "runtimeHost",
    "gameDirectory",
    "proposedFiles"
  ],
  "properties": {
    "artifactType": {
      "const": "runtime-host-staging"
    },
    "build": {
      "$ref": "#/$defs/build"
    },
    "runtimeHost": {
      "$ref": "#/$defs/runtimeHost"
    },
    "probe": {
      "$ref": "#/$defs/probe"
    },
    "collector": {
      "$ref": "#/$defs/collector"
    },
    "gameDirectory": {
      "$ref": "#/$defs/gameDirectory"
    },
    "proposedFiles": {
      "type": "array",
      "minItems": 2,
      "maxItems": 2,
      "prefixItems": [
        {
          "allOf": [
            {
              "$ref": "#/$defs/proposedFile"
            },
            {
              "type": "object",
              "properties": {
                "relativePath": {
                  "const": "dwmapi.dll"
                },
                "sourceRelativePath": {
                  "const": "install/dwmapi.dll"
                }
              }
            }
          ]
        },
        {
          "allOf": [
            {
              "$ref": "#/$defs/proposedFile"
            },
            {
              "type": "object",
              "properties": {
                "relativePath": {
                  "const": "override.txt"
                },
                "sourceRelativePath": {
                  "const": "install/override.txt"
                }
              }
            }
          ]
        }
      ],
      "items": false
    }
  },
  "oneOf": [
    {
      "required": [
        "probe"
      ],
      "properties": {
        "probe": {
          "$ref": "#/$defs/probe"
        },
        "collector": false
      }
    },
    {
      "required": [
        "collector"
      ],
      "properties": {
        "probe": false,
        "collector": {
          "$ref": "#/$defs/collector"
        }
      }
    }
  ],
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
    "runtimeHost": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "version",
        "archive"
      ],
      "properties": {
        "name": {
          "const": "UE4SS"
        },
        "version": {
          "const": "3.0.1-1018-g662df915"
        },
        "archive": {
          "allOf": [
            {
              "$ref": "#/$defs/fileIdentity"
            },
            {
              "type": "object",
              "properties": {
                "sha256": {
                  "const": "caa0f9a6c2ca372c2be5042668b2e86d1cc3bf45fa069a689552314d97f9ee9e"
                }
              }
            }
          ]
        }
      }
    },
    "probe": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "version",
        "source",
        "diagnosticRelativePath"
      ],
      "properties": {
        "name": {
          "const": "NeonRetroRewindMovieReturnProbe"
        },
        "version": {
          "type": "string",
          "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$"
        },
        "source": {
          "allOf": [
            {
              "$ref": "#/$defs/fileIdentity"
            },
            {
              "type": "object",
              "properties": {
                "fileName": {
                  "const": "main.lua"
                },
                "sizeBytes": {
                  "const": 15068
                },
                "sha256": {
                  "const": "5c8f29dfe42d5e2f7b8ba866d8df1bfd3c5620101f6253f697e3c1111f20657a"
                }
              }
            }
          ]
        },
        "diagnosticRelativePath": {
          "const": "diagnostics/movie-return-compatibility-probe.json"
        }
      }
    },
    "collector": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "version",
        "binary",
        "config",
        "observationSchema",
        "targetMechanics",
        "observationOutputRootAbsolutePath"
      ],
      "properties": {
        "name": {
          "const": "NeonRetroRewindMovieReturnCollector"
        },
        "version": {
          "const": "0.1.7"
        },
        "binary": {
          "allOf": [
            {
              "$ref": "#/$defs/fileIdentity"
            },
            {
              "type": "object",
              "properties": {
                "fileName": {
                  "const": "main.dll"
                }
              }
            }
          ]
        },
        "config": {
          "allOf": [
            {
              "$ref": "#/$defs/fileIdentity"
            },
            {
              "type": "object",
              "properties": {
                "fileName": {
                  "const": "config.json"
                }
              }
            }
          ]
        },
        "observationSchema": {
          "allOf": [
            {
              "$ref": "#/$defs/fileIdentity"
            },
            {
              "type": "object",
              "properties": {
                "fileName": {
                  "const": "movie-return-observation.schema.json"
                }
              }
            }
          ]
        },
        "targetMechanics": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "fileName",
            "sizeBytes",
            "sha256",
            "artifactType"
          ],
          "properties": {
            "fileName": {
              "const": "movie-return-mechanics.json"
            },
            "sizeBytes": {
              "type": "integer",
              "minimum": 1
            },
            "sha256": {
              "$ref": "#/$defs/sha256"
            },
            "artifactType": {
              "const": "movie-return-mechanics"
            }
          }
        },
        "observationOutputRootAbsolutePath": {
          "type": "string",
          "minLength": 1
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
    "proposedFile": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "relativePath",
        "sourceRelativePath",
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
        "sourceRelativePath": {
          "enum": [
            "install/dwmapi.dll",
            "install/override.txt"
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

export const RuntimeHostStagingSchema = defineArtifactSchema<RuntimeHostStagingContract>(RuntimeHostStagingJsonSchema);
export type RuntimeHostStaging = typeof RuntimeHostStagingSchema.infer;
