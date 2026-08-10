import type { MovieReturnRuntimeCollectorConfigContract } from "../generated/runtime/movie-return-runtime-collector-config.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";

export const MovieReturnRuntimeCollectorConfigJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:runtime:movie-return-runtime-collector-config",
  "title": "NeonRetroRewind movie-return runtime collector config",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "artifactType",
    "build",
    "targetMechanics",
    "collector",
    "runtimeHost",
    "observationSchema",
    "observationOutputRootAbsolutePath"
  ],
  "properties": {
    "artifactType": {
      "const": "movie-return-runtime-collector-config"
    },
    "build": {
      "$ref": "#/$defs/build"
    },
    "targetMechanics": {
      "$ref": "#/$defs/targetMechanics"
    },
    "collector": {
      "$ref": "#/$defs/collector"
    },
    "runtimeHost": {
      "$ref": "#/$defs/runtimeHost"
    },
    "observationSchema": {
      "$ref": "#/$defs/observationSchema"
    },
    "observationOutputRootAbsolutePath": {
      "type": "string",
      "minLength": 1
    }
  },
  "$defs": {
    "sha256": {
      "type": "string",
      "pattern": "^[0-9a-f]{64}$"
    },
    "build": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "steamAppId",
        "steamBuildId"
      ],
      "properties": {
        "steamAppId": {
          "const": "3552140"
        },
        "steamBuildId": {
          "type": "string",
          "pattern": "^[0-9]+$"
        }
      }
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
    "collector": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "version"
      ],
      "properties": {
        "name": {
          "const": "NeonRetroRewind.MovieReturnRuntimeCollector"
        },
        "version": {
          "const": "0.1.7"
        }
      }
    },
    "runtimeHost": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "version"
      ],
      "properties": {
        "name": {
          "const": "UE4SS"
        },
        "version": {
          "const": "3.0.1-1018-g662df915"
        }
      }
    },
    "observationSchema": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "fileName",
        "sizeBytes",
        "sha256",
        "stagedRelativePath"
      ],
      "properties": {
        "fileName": {
          "const": "movie-return-observation.schema.json"
        },
        "sizeBytes": {
          "type": "integer",
          "minimum": 1
        },
        "sha256": {
          "$ref": "#/$defs/sha256"
        },
        "stagedRelativePath": {
          "const": "mods/NeonRetroRewindMovieReturnCollector/movie-return-observation.schema.json"
        }
      }
    }
  }
} as const;

export const MovieReturnRuntimeCollectorConfigSchema = defineArtifactSchema<MovieReturnRuntimeCollectorConfigContract>(MovieReturnRuntimeCollectorConfigJsonSchema);
export type MovieReturnRuntimeCollectorConfig = typeof MovieReturnRuntimeCollectorConfigSchema.infer;
