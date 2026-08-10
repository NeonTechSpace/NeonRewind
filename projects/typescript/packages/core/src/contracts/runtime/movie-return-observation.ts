import type { MovieReturnObservationContract } from "../generated/runtime/movie-return-observation.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";

export const MovieReturnObservationJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:runtime:movie-return-observation",
  "title": "NeonRetroRewind movie-return runtime observation",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "artifactType",
    "build",
    "targetMechanics",
    "collector",
    "run",
    "events"
  ],
  "properties": {
    "artifactType": {
      "const": "movie-return-runtime-observation"
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
    "run": {
      "$ref": "#/$defs/run"
    },
    "events": {
      "type": "array",
      "maxItems": 256,
      "items": {
        "oneOf": [
          {
            "$ref": "#/$defs/readinessEvent"
          },
          {
            "$ref": "#/$defs/selectionEvent"
          },
          {
            "$ref": "#/$defs/customerReturnEvent"
          }
        ]
      }
    }
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "run": {
            "properties": {
              "status": {
                "const": "complete"
              }
            },
            "required": [
              "status"
            ]
          }
        },
        "required": [
          "run"
        ]
      },
      "then": {
        "properties": {
          "events": {
            "allOf": [
              {
                "contains": {
                  "properties": {
                    "eventType": {
                      "const": "readiness-observed"
                    }
                  },
                  "required": [
                    "eventType"
                  ]
                },
                "minContains": 1
              },
              {
                "contains": {
                  "properties": {
                    "eventType": {
                      "const": "selection-observed"
                    }
                  },
                  "required": [
                    "eventType"
                  ]
                },
                "minContains": 1
              },
              {
                "contains": {
                  "properties": {
                    "eventType": {
                      "const": "customer-return-observed"
                    }
                  },
                  "required": [
                    "eventType"
                  ]
                },
                "minContains": 1
              }
            ]
          }
        }
      }
    }
  ],
  "$defs": {
    "build": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "steamAppId",
        "steamBuildId"
      ],
      "properties": {
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
        "version",
        "runtimeHost"
      ],
      "properties": {
        "name": {
          "const": "NeonRetroRewind.MovieReturnRuntimeCollector"
        },
        "version": {
          "$ref": "#/$defs/version"
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
              "type": "string",
              "minLength": 1,
              "maxLength": 100
            },
            "version": {
              "$ref": "#/$defs/version"
            }
          }
        }
      }
    },
    "run": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "runId",
        "startedAtUtc",
        "finishedAtUtc",
        "status",
        "statusReason"
      ],
      "properties": {
        "runId": {
          "type": "string",
          "pattern": "^[0-9]{8}T[0-9]{6}Z-[0-9a-f]{8}$"
        },
        "startedAtUtc": {
          "$ref": "#/$defs/utcTimestamp"
        },
        "finishedAtUtc": {
          "oneOf": [
            {
              "$ref": "#/$defs/utcTimestamp"
            },
            {
              "type": "null"
            }
          ]
        },
        "status": {
          "enum": [
            "complete",
            "aborted",
            "failed"
          ]
        },
        "statusReason": {
          "oneOf": [
            {
              "$ref": "#/$defs/statusReason"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "allOf": [
        {
          "if": {
            "properties": {
              "status": {
                "const": "complete"
              }
            },
            "required": [
              "status"
            ]
          },
          "then": {
            "properties": {
              "finishedAtUtc": {
                "$ref": "#/$defs/utcTimestamp"
              },
              "statusReason": {
                "type": "null"
              }
            }
          },
          "else": {
            "properties": {
              "statusReason": {
                "$ref": "#/$defs/statusReason"
              }
            }
          }
        }
      ]
    },
    "readinessEvent": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "sequence",
        "eventType",
        "observedAtUtc",
        "classPath",
        "objectPath",
        "functionPath",
        "preState",
        "postState"
      ],
      "properties": {
        "sequence": {
          "$ref": "#/$defs/sequence"
        },
        "eventType": {
          "const": "readiness-observed"
        },
        "observedAtUtc": {
          "$ref": "#/$defs/utcTimestamp"
        },
        "classPath": {
          "$ref": "#/$defs/runtimePath"
        },
        "objectPath": {
          "$ref": "#/$defs/runtimePath"
        },
        "functionPath": {
          "$ref": "#/$defs/runtimePath"
        },
        "preState": {
          "$ref": "#/$defs/rentalQueues"
        },
        "postState": {
          "$ref": "#/$defs/rentalQueues"
        }
      }
    },
    "selectionEvent": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "sequence",
        "eventType",
        "observedAtUtc",
        "classPath",
        "objectPath",
        "functionPath",
        "preState",
        "result"
      ],
      "properties": {
        "sequence": {
          "$ref": "#/$defs/sequence"
        },
        "eventType": {
          "const": "selection-observed"
        },
        "observedAtUtc": {
          "$ref": "#/$defs/utcTimestamp"
        },
        "classPath": {
          "$ref": "#/$defs/runtimePath"
        },
        "objectPath": {
          "$ref": "#/$defs/runtimePath"
        },
        "functionPath": {
          "$ref": "#/$defs/runtimePath"
        },
        "preState": {
          "$ref": "#/$defs/rentalQueues"
        },
        "result": {
          "$ref": "#/$defs/selectionResult"
        }
      }
    },
    "customerReturnEvent": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "sequence",
        "eventType",
        "observedAtUtc",
        "classPath",
        "objectPath",
        "functionPath",
        "preState",
        "result",
        "postState"
      ],
      "properties": {
        "sequence": {
          "$ref": "#/$defs/sequence"
        },
        "eventType": {
          "const": "customer-return-observed"
        },
        "observedAtUtc": {
          "$ref": "#/$defs/utcTimestamp"
        },
        "classPath": {
          "$ref": "#/$defs/runtimePath"
        },
        "objectPath": {
          "$ref": "#/$defs/runtimePath"
        },
        "functionPath": {
          "$ref": "#/$defs/runtimePath"
        },
        "preState": {
          "$ref": "#/$defs/customerState"
        },
        "result": {
          "$ref": "#/$defs/selectionResult"
        },
        "postState": {
          "$ref": "#/$defs/customerState"
        }
      }
    },
    "rentalQueues": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "rentedMovies",
        "readyMovies"
      ],
      "properties": {
        "rentedMovies": {
          "$ref": "#/$defs/movieCollection"
        },
        "readyMovies": {
          "$ref": "#/$defs/movieCollection"
        }
      }
    },
    "customerState": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "readyMovies",
        "customerInventoryMovies"
      ],
      "properties": {
        "readyMovies": {
          "$ref": "#/$defs/movieCollection"
        },
        "customerInventoryMovies": {
          "$ref": "#/$defs/movieCollection"
        }
      }
    },
    "selectionResult": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "found",
        "selectedMovies"
      ],
      "properties": {
        "found": {
          "type": "boolean"
        },
        "selectedMovies": {
          "$ref": "#/$defs/movieCollection"
        }
      }
    },
    "movieCollection": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "totalCount",
        "truncated",
        "movies"
      ],
      "properties": {
        "totalCount": {
          "type": "integer",
          "minimum": 0,
          "maximum": 2147483647
        },
        "truncated": {
          "type": "boolean"
        },
        "movies": {
          "type": "array",
          "maxItems": 256,
          "items": {
            "$ref": "#/$defs/movieReference"
          }
        }
      }
    },
    "movieReference": {
      "oneOf": [
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "referenceType",
            "value"
          ],
          "properties": {
            "referenceType": {
              "const": "object-path"
            },
            "value": {
              "$ref": "#/$defs/runtimePath"
            }
          }
        },
        {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "referenceType",
            "value"
          ],
          "properties": {
            "referenceType": {
              "const": "run-local"
            },
            "value": {
              "type": "string",
              "pattern": "^movie-[0-9]{4}$"
            }
          }
        }
      ]
    },
    "sequence": {
      "type": "integer",
      "minimum": 1,
      "maximum": 256
    },
    "runtimePath": {
      "type": "string",
      "minLength": 1,
      "maxLength": 1024
    },
    "version": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    },
    "utcTimestamp": {
      "type": "string",
      "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]{3,7})?Z$"
    },
    "statusReason": {
      "enum": [
        "user-stopped",
        "game-closed",
        "object-unavailable",
        "hook-failed",
        "write-failed",
        "validation-failed",
        "collector-error",
        "unknown"
      ]
    },
    "sha256": {
      "type": "string",
      "pattern": "^[0-9a-f]{64}$"
    }
  }
} as const;

export const MovieReturnObservationSchema = defineArtifactSchema<MovieReturnObservationContract>(MovieReturnObservationJsonSchema);
export type MovieReturnObservation = typeof MovieReturnObservationSchema.infer;

export type MovieReturnObservationEvent = MovieReturnObservation["events"][number];
export type ReadinessObservationEvent = Extract<
  MovieReturnObservationEvent,
  { eventType: "readiness-observed" }
>;
export type SelectionObservationEvent = Extract<
  MovieReturnObservationEvent,
  { eventType: "selection-observed" }
>;
export type CustomerReturnObservationEvent = Extract<
  MovieReturnObservationEvent,
  { eventType: "customer-return-observed" }
>;
export type MovieReference =
  ReadinessObservationEvent["preState"]["rentedMovies"]["movies"][number];
export type CapturedMovieReferences =
  ReadinessObservationEvent["preState"]["rentedMovies"];
