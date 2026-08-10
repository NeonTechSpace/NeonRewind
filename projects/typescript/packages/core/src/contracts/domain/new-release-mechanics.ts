import type { NewReleaseMechanicsContract } from "../generated/domain/new-release-mechanics.ts";
import { defineArtifactSchema } from "../define-artifact-schema.ts";

export const NewReleaseMechanicsJsonSchema = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:neonretrorewind:schema:domain:new-release-mechanics",
  "title": "NeonRetroRewind new-release mechanics",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "artifactType",
    "build",
    "sources",
    "scope",
    "evidenceLevel",
    "runtimeValidation",
    "unlock",
    "requestSelection",
    "requestGeneration",
    "candidateEligibility"
  ],
  "properties": {
    "artifactType": {
      "const": "new-release-mechanics"
    },
    "build": {
      "$ref": "#/$defs/build"
    },
    "sources": {
      "$ref": "#/$defs/sources"
    },
    "scope": {
      "const": "new-release"
    },
    "evidenceLevel": {
      "const": "typed-blueprint"
    },
    "runtimeValidation": {
      "const": "not-run"
    },
    "unlock": {
      "$ref": "#/$defs/unlock"
    },
    "requestSelection": {
      "$ref": "#/$defs/requestSelection"
    },
    "requestGeneration": {
      "$ref": "#/$defs/requestGeneration"
    },
    "candidateEligibility": {
      "$ref": "#/$defs/candidateEligibility"
    }
  },
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
    "sources": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "managerTrace",
        "wrapperTrace",
        "propertyReaderTrace",
        "requestGeneratorTrace",
        "candidateMapTrace",
        "callTargetTrace"
      ],
      "properties": {
        "managerTrace": {
          "allOf": [
            {
              "$ref": "#/$defs/sourceIdentity"
            },
            {
              "properties": {
                "artifactType": {
                  "const": "unlockable-manager-trace"
                }
              }
            }
          ]
        },
        "wrapperTrace": {
          "allOf": [
            {
              "$ref": "#/$defs/sourceIdentity"
            },
            {
              "properties": {
                "artifactType": {
                  "const": "blueprint-function-trace"
                }
              }
            }
          ]
        },
        "propertyReaderTrace": {
          "allOf": [
            {
              "$ref": "#/$defs/sourceIdentity"
            },
            {
              "properties": {
                "artifactType": {
                  "const": "blueprint-property-reference-trace"
                }
              }
            }
          ]
        },
        "requestGeneratorTrace": {
          "allOf": [
            {
              "$ref": "#/$defs/sourceIdentity"
            },
            {
              "properties": {
                "artifactType": {
                  "const": "blueprint-function-trace"
                }
              }
            }
          ]
        },
        "candidateMapTrace": {
          "allOf": [
            {
              "$ref": "#/$defs/sourceIdentity"
            },
            {
              "properties": {
                "artifactType": {
                  "const": "blueprint-property-reference-trace"
                }
              }
            }
          ]
        },
        "callTargetTrace": {
          "allOf": [
            {
              "$ref": "#/$defs/sourceIdentity"
            },
            {
              "properties": {
                "artifactType": {
                  "const": "blueprint-call-target-trace"
                }
              }
            }
          ]
        }
      }
    },
    "sourceIdentity": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "fileName",
        "sha256",
        "sizeBytes",
        "artifactType"
      ],
      "properties": {
        "fileName": {
          "type": "string",
          "pattern": "^[^/\\\\]+\\.json$"
        },
        "sha256": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        },
        "sizeBytes": {
          "type": "integer",
          "minimum": 1
        },
        "artifactType": {
          "enum": [
            "unlockable-manager-trace",
            "blueprint-function-trace",
            "blueprint-property-reference-trace",
            "blueprint-call-target-trace"
          ]
        }
      }
    },
    "candidateEligibility": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "rebuild",
        "preconditions",
        "predicate",
        "outcomes",
        "evidence"
      ],
      "properties": {
        "rebuild": {
          "$ref": "#/$defs/candidateRebuild"
        },
        "preconditions": {
          "$ref": "#/$defs/candidatePreconditions"
        },
        "predicate": {
          "$ref": "#/$defs/candidatePredicate"
        },
        "outcomes": {
          "$ref": "#/$defs/candidateOutcomes"
        },
        "evidence": {
          "$ref": "#/$defs/candidateEvidence"
        }
      }
    },
    "candidateRebuild": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "trigger",
        "requiresWeatherReference",
        "sourceCollection",
        "candidateCollection",
        "candidateCollectionClearedBeforeScan",
        "iteration"
      ],
      "properties": {
        "trigger": {
          "const": "filter-all-new-release-movie-data"
        },
        "requiresWeatherReference": {
          "const": true
        },
        "sourceCollection": {
          "const": "Example Source Map"
        },
        "candidateCollection": {
          "const": "Example Candidate Map"
        },
        "candidateCollectionClearedBeforeScan": {
          "const": true
        },
        "iteration": {
          "const": "source-map-values"
        }
      }
    },
    "candidatePreconditions": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "released",
        "secondHandAvailable",
        "operator"
      ],
      "properties": {
        "released": {
          "const": true
        },
        "secondHandAvailable": {
          "const": false
        },
        "operator": {
          "const": "and"
        }
      }
    },
    "candidatePredicate": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "function",
        "ownerClass",
        "durationDays",
        "elapsedDays",
        "comparison",
        "lowerBoundEnforced",
        "remainingDays",
        "gameModeCastFailure"
      ],
      "properties": {
        "function": {
          "const": "Evaluate Example Record"
        },
        "ownerClass": {
          "const": "ExampleRecord_C"
        },
        "durationDays": {
          "const": 7
        },
        "elapsedDays": {
          "const": "days-passed-minus-available-in-game-day"
        },
        "comparison": {
          "const": "elapsed-days-less-than-or-equal-to-duration"
        },
        "lowerBoundEnforced": {
          "const": false
        },
        "remainingDays": {
          "const": "available-in-game-day-plus-duration-minus-days-passed"
        },
        "gameModeCastFailure": {
          "$ref": "#/$defs/gameModeCastFailure"
        }
      }
    },
    "gameModeCastFailure": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "isNew",
        "remainingDays"
      ],
      "properties": {
        "isNew": {
          "const": false
        },
        "remainingDays": {
          "const": 0
        }
      }
    },
    "candidateOutcomes": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "eligible",
        "preconditionFailure",
        "predicateFailure",
        "remainingDaysConsumedByCaller"
      ],
      "properties": {
        "eligible": {
          "$ref": "#/$defs/candidateOutcomeEligible"
        },
        "preconditionFailure": {
          "$ref": "#/$defs/candidateOutcomePreconditionFailure"
        },
        "predicateFailure": {
          "$ref": "#/$defs/candidateOutcomePredicateFailure"
        },
        "remainingDaysConsumedByCaller": {
          "const": false
        }
      }
    },
    "candidateOutcomeEligible": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "collection",
        "key",
        "secondHandAvailable",
        "basePrice"
      ],
      "properties": {
        "collection": {
          "const": "Example Candidate Map"
        },
        "key": {
          "const": "product-sku"
        },
        "secondHandAvailable": {
          "const": false
        },
        "basePrice": {
          "const": 0
        }
      }
    },
    "candidateOutcomePreconditionFailure": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "collection",
        "effect"
      ],
      "properties": {
        "collection": {
          "const": "Example Source Map"
        },
        "effect": {
          "const": "no-mutation"
        }
      }
    },
    "candidateOutcomePredicateFailure": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "collection",
        "key",
        "secondHandAvailable",
        "basePrice"
      ],
      "properties": {
        "collection": {
          "const": "Example Source Map"
        },
        "key": {
          "const": "product-sku"
        },
        "secondHandAvailable": {
          "const": true
        },
        "basePrice": {
          "const": 0
        }
      }
    },
    "candidateEvidence": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "kind",
        "confidence",
        "marketClassPath",
        "rebuildFunction",
        "filterFunction",
        "predicateClassPath",
        "predicateFunction",
        "bindingRule",
        "relationship",
        "statementIndexes"
      ],
      "properties": {
        "kind": {
          "const": "kismet-analysis"
        },
        "confidence": {
          "const": "direct"
        },
        "marketClassPath": {
          "const": "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleManager.ExampleManager_C"
        },
        "rebuildFunction": {
          "const": "ExampleRebuildCandidates"
        },
        "filterFunction": {
          "const": "Filter Example Schedule"
        },
        "predicateClassPath": {
          "const": "ExampleGame/Content/ExampleProject/core/blueprint/data/ExampleRecord.ExampleRecord_C"
        },
        "predicateFunction": {
          "const": "Evaluate Example Record"
        },
        "bindingRule": {
          "const": "exact-context-object-class-and-declaration"
        },
        "relationship": {
          "const": "verified"
        },
        "statementIndexes": {
          "$ref": "#/$defs/candidateStatementIndexes"
        }
      }
    },
    "candidateStatementIndexes": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "clearCandidateCollection",
        "enumerateSourceValues",
        "callPerFilmFilter",
        "checkSecondHand",
        "checkReleased",
        "combinePreconditions",
        "preconditionBranch",
        "predicateCall",
        "predicateBranch",
        "addEligible",
        "addIneligible",
        "durationAssignment",
        "gameModeCastBranch",
        "elapsedSubtract",
        "compareDuration",
        "remainingAdd",
        "remainingSubtract",
        "setEligible",
        "setRemainingDays",
        "castFailureSetEligible",
        "castFailureSetRemainingDays"
      ],
      "properties": {
        "clearCandidateCollection": { "const": 66 },
        "enumerateSourceValues": { "const": 118 },
        "callPerFilmFilter": { "const": 390 },
        "checkSecondHand": { "const": 10 },
        "checkReleased": { "const": 49 },
        "combinePreconditions": { "const": 88 },
        "preconditionBranch": { "const": 116 },
        "predicateCall": { "const": 152 },
        "predicateBranch": { "const": 203 },
        "addEligible": { "const": 418 },
        "addIneligible": { "const": 697 },
        "durationAssignment": { "const": 0 },
        "gameModeCastBranch": { "const": 117 },
        "elapsedSubtract": { "const": 1512 },
        "compareDuration": { "const": 1634 },
        "remainingAdd": { "const": 1680 },
        "remainingSubtract": { "const": 1744 },
        "setEligible": { "const": 1838 },
        "setRemainingDays": { "const": 1857 },
        "castFailureSetEligible": { "const": 1889 },
        "castFailureSetRemainingDays": { "const": 1900 }
      }
    },
    "unlock": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "trigger",
        "threshold",
        "mutation",
        "evidence"
      ],
      "properties": {
        "trigger": {
          "const": "reset-to-new-day-event"
        },
        "threshold": {
          "$ref": "#/$defs/threshold"
        },
        "mutation": {
          "$ref": "#/$defs/mutation"
        },
        "evidence": {
          "$ref": "#/$defs/evidence"
        }
      }
    },
    "threshold": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "origin",
        "elapsedDays",
        "operator",
        "currentDate"
      ],
      "properties": {
        "origin": {
          "const": "first-save-game-day"
        },
        "elapsedDays": {
          "const": 2
        },
        "operator": {
          "const": "greater-than-or-equal"
        },
        "currentDate": {
          "const": "weather-current-date"
        }
      }
    },
    "requestSelection": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "trigger",
        "condition",
        "effect",
        "evidence"
      ],
      "properties": {
        "trigger": {
          "const": "return-movie-request"
        },
        "condition": {
          "$ref": "#/$defs/requestCondition"
        },
        "effect": {
          "$ref": "#/$defs/requestEffect"
        },
        "evidence": {
          "$ref": "#/$defs/requestEvidence"
        }
      }
    },
    "requestGeneration": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "trigger",
        "selector",
        "newReleaseCandidateSelection",
        "effect",
        "evidence"
      ],
      "properties": {
        "trigger": {
          "const": "generate-movie-request"
        },
        "selector": {
          "$ref": "#/$defs/generatorSelector"
        },
        "newReleaseCandidateSelection": {
          "$ref": "#/$defs/newReleaseCandidateSelection"
        },
        "effect": {
          "$ref": "#/$defs/generatorEffect"
        },
        "evidence": {
          "$ref": "#/$defs/generatorEvidence"
        }
      }
    },
    "generatorSelector": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "function",
        "successRequired",
        "copiedOutputs",
        "requestGenerated"
      ],
      "properties": {
        "function": {
          "const": "Return Example Request"
        },
        "successRequired": {
          "const": true
        },
        "copiedOutputs": {
          "$ref": "#/$defs/generatorCopiedOutputs"
        },
        "requestGenerated": {
          "const": true
        }
      }
    },
    "generatorCopiedOutputs": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "onlyNewRelease",
        "primaryRequest",
        "optionalRequest"
      ],
      "properties": {
        "onlyNewRelease": {
          "const": "only-new-release-output"
        },
        "primaryRequest": {
          "const": "mandatory-request-output"
        },
        "optionalRequest": {
          "const": "optional-request-output"
        }
      }
    },
    "newReleaseCandidateSelection": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "condition",
        "enumeration",
        "index"
      ],
      "properties": {
        "condition": {
          "$ref": "#/$defs/generatorCondition"
        },
        "enumeration": {
          "$ref": "#/$defs/candidateEnumeration"
        },
        "index": {
          "$ref": "#/$defs/candidateIndex"
        }
      }
    },
    "generatorCondition": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "onlyNewRelease",
        "gameModeType",
        "randomGate",
        "candidateCollection",
        "candidateCount",
        "operator"
      ],
      "properties": {
        "onlyNewRelease": {
          "const": true
        },
        "gameModeType": {
          "const": "ExampleMode"
        },
        "randomGate": {
          "$ref": "#/$defs/generatorRandomGate"
        },
        "candidateCollection": {
          "const": "Example Candidate Map"
        },
        "candidateCount": {
          "const": "greater-than-zero"
        },
        "operator": {
          "const": "and"
        }
      }
    },
    "generatorRandomGate": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "function",
        "trueWeight"
      ],
      "properties": {
        "function": {
          "const": "RandomBoolWithWeight"
        },
        "trueWeight": {
          "const": 0.66
        }
      }
    },
    "candidateEnumeration": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "keys",
        "values",
        "pairing"
      ],
      "properties": {
        "keys": {
          "const": "map-keys"
        },
        "values": {
          "const": "map-values"
        },
        "pairing": {
          "const": "shared-array-index"
        }
      }
    },
    "candidateIndex": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "function",
        "input",
        "engineSemantics",
        "result"
      ],
      "properties": {
        "function": {
          "const": "RandomInteger"
        },
        "input": {
          "const": "candidate-count-minus-one"
        },
        "engineSemantics": {
          "$ref": "#/$defs/randomIntegerEngineSemantics"
        },
        "result": {
          "$ref": "#/$defs/candidateIndexResult"
        }
      }
    },
    "randomIntegerEngineSemantics": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "engineVersion",
        "wrapper",
        "implementation",
        "positiveInputRange",
        "nonPositiveInputResult"
      ],
      "properties": {
        "engineVersion": {
          "const": "5.4"
        },
        "wrapper": {
          "const": "UKismetMathLibrary::RandomInteger"
        },
        "implementation": {
          "const": "FMath::RandHelper"
        },
        "positiveInputRange": {
          "const": "zero-inclusive-to-input-exclusive"
        },
        "nonPositiveInputResult": {
          "const": 0
        }
      }
    },
    "candidateIndexResult": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "oneCandidate",
        "multipleCandidates",
        "finalEnumeratedPairSelectable"
      ],
      "properties": {
        "oneCandidate": {
          "const": "index-zero"
        },
        "multipleCandidates": {
          "const": "zero-through-candidate-count-minus-two"
        },
        "finalEnumeratedPairSelectable": {
          "const": false
        }
      }
    },
    "generatorEffect": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "requestMovieSku",
        "reservedMovieProduct",
        "generateSuccess",
        "candidateSelectionRequiredForSuccess"
      ],
      "properties": {
        "requestMovieSku": {
          "const": "selected-key"
        },
        "reservedMovieProduct": {
          "const": "selected-value-product"
        },
        "generateSuccess": {
          "const": true
        },
        "candidateSelectionRequiredForSuccess": {
          "const": false
        }
      }
    },
    "generatorEvidence": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "kind",
        "confidence",
        "classPath",
        "functionName",
        "statementIndexes",
        "engineSource"
      ],
      "properties": {
        "kind": {
          "const": "kismet-and-engine-source-analysis"
        },
        "confidence": {
          "const": "direct"
        },
        "classPath": {
          "const": "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C"
        },
        "functionName": {
          "const": "Generate Example Request"
        },
        "statementIndexes": {
          "$ref": "#/$defs/generatorStatementIndexes"
        },
        "engineSource": {
          "$ref": "#/$defs/generatorEngineSource"
        }
      }
    },
    "generatorStatementIndexes": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "selectorCall",
        "selectorSuccessBranch",
        "copyOnlyNewRelease",
        "copyMandatoryRequest",
        "copyOptionalRequest",
        "newReleaseBranch",
        "randomGate",
        "candidateCount",
        "combinedCondition",
        "enumerateKeys",
        "enumerateValues",
        "subtractOne",
        "randomIndex",
        "selectKey",
        "assignMovieSku",
        "selectValue",
        "assignReservedProduct",
        "setGenerateSuccess"
      ],
      "properties": {
        "selectorCall": { "const": 448 },
        "selectorSuccessBranch": { "const": 570 },
        "copyOnlyNewRelease": { "const": 735 },
        "copyMandatoryRequest": { "const": 1272 },
        "copyOptionalRequest": { "const": 1299 },
        "newReleaseBranch": { "const": 1331 },
        "randomGate": { "const": 1447 },
        "candidateCount": { "const": 1502 },
        "combinedCondition": { "const": 1631 },
        "enumerateKeys": { "const": 1702 },
        "enumerateValues": { "const": 1829 },
        "subtractOne": { "const": 2066 },
        "randomIndex": { "const": 2108 },
        "selectKey": { "const": 2176 },
        "assignMovieSku": { "const": 2213 },
        "selectValue": { "const": 2262 },
        "assignReservedProduct": { "const": 2299 },
        "setGenerateSuccess": { "const": 2336 }
      }
    },
    "generatorEngineSource": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "repository",
        "commit",
        "wrapperFile",
        "implementationFile"
      ],
      "properties": {
        "repository": {
          "const": "EpicGames/UnrealEngine"
        },
        "commit": {
          "const": "847de5e2553adeb4d3498953604d0b0abe669780"
        },
        "wrapperFile": {
          "const": "Engine/Source/Runtime/Engine/Classes/Kismet/KismetMathLibrary.inl"
        },
        "implementationFile": {
          "const": "Engine/Source/Runtime/Core/Public/Math/UnrealMathUtility.h"
        }
      }
    },
    "requestCondition": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "unlockField",
        "requiredValue",
        "operator",
        "randomGate"
      ],
      "properties": {
        "unlockField": {
          "const": "ExampleReleaseKind"
        },
        "requiredValue": {
          "const": true
        },
        "operator": {
          "const": "and"
        },
        "randomGate": {
          "$ref": "#/$defs/randomGate"
        }
      }
    },
    "randomGate": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "function",
        "trueWeight"
      ],
      "properties": {
        "function": {
          "const": "RandomBoolWithWeight"
        },
        "trueWeight": {
          "const": 0.5
        }
      }
    },
    "requestEffect": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "guaranteedRequestStep",
        "runOptionalPass",
        "newReleaseRequested",
        "primaryRequestCode",
        "primaryRequestValue",
        "outputs"
      ],
      "properties": {
        "guaranteedRequestStep": {
          "const": 1
        },
        "runOptionalPass": {
          "const": false
        },
        "newReleaseRequested": {
          "const": true
        },
        "primaryRequestCode": {
          "const": 5
        },
        "primaryRequestValue": {
          "const": true
        },
        "outputs": {
          "$ref": "#/$defs/requestOutputs"
        }
      }
    },
    "requestOutputs": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "onlyNewRelease",
        "mandatoryRequest"
      ],
      "properties": {
        "onlyNewRelease": {
          "const": true
        },
        "mandatoryRequest": {
          "const": "primary-request-map"
        }
      }
    },
    "requestEvidence": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "kind",
        "confidence",
        "classPath",
        "functionName",
        "statementIndexes"
      ],
      "properties": {
        "kind": {
          "const": "kismet-analysis"
        },
        "confidence": {
          "const": "direct"
        },
        "classPath": {
          "const": "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C"
        },
        "functionName": {
          "const": "Return Example Request"
        },
        "statementIndexes": {
          "$ref": "#/$defs/requestStatementIndexes"
        }
      }
    },
    "requestStatementIndexes": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "randomCall",
        "combineConditions",
        "unlockRead",
        "conditionBranch",
        "setGuaranteedStep",
        "disableOptionalPass",
        "loopToDispatch",
        "stepOneComparison",
        "stepOneRoute",
        "setNewReleaseRequested",
        "setRequestValue",
        "setRequestCode",
        "addPrimaryRequest",
        "setOnlyNewReleaseOutput",
        "setMandatoryRequestOutput"
      ],
      "properties": {
        "randomCall": {
          "const": 2253
        },
        "combineConditions": {
          "const": 2278
        },
        "unlockRead": {
          "const": 2309
        },
        "conditionBranch": {
          "const": 2328
        },
        "setGuaranteedStep": {
          "const": 2342
        },
        "disableOptionalPass": {
          "const": 2365
        },
        "loopToDispatch": {
          "const": 2376
        },
        "stepOneComparison": {
          "const": 2108
        },
        "stepOneRoute": {
          "const": 2132
        },
        "setNewReleaseRequested": {
          "const": 4028
        },
        "setRequestValue": {
          "const": 4039
        },
        "setRequestCode": {
          "const": 4050
        },
        "addPrimaryRequest": {
          "const": 4092
        },
        "setOnlyNewReleaseOutput": {
          "const": 3358
        },
        "setMandatoryRequestOutput": {
          "const": 3396
        }
      }
    },
    "mutation": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "field",
        "value",
        "when"
      ],
      "properties": {
        "field": {
          "const": "ExampleReleaseKind"
        },
        "value": {
          "const": true
        },
        "when": {
          "const": "threshold-reached"
        }
      }
    },
    "evidence": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "kind",
        "confidence",
        "classPath",
        "wrapperFunctions",
        "entryPoints",
        "eventGraphFunction",
        "statementIndexes"
      ],
      "properties": {
        "kind": {
          "const": "kismet-analysis"
        },
        "confidence": {
          "const": "direct"
        },
        "classPath": {
          "const": "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C"
        },
        "wrapperFunctions": {
          "$ref": "#/$defs/wrapperFunctions"
        },
        "entryPoints": {
          "$ref": "#/$defs/entryPoints"
        },
        "eventGraphFunction": {
          "const": "ExecuteExampleGraph_ExampleUnlockSystem"
        },
        "statementIndexes": {
          "$ref": "#/$defs/statementIndexes"
        }
      }
    },
    "wrapperFunctions": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "resetToNewDay",
        "newReleaseCheck"
      ],
      "properties": {
        "resetToNewDay": {
          "const": "Reset to new Day Event_Event"
        },
        "newReleaseCheck": {
          "const": "ExampleReleaseEnabled"
        }
      }
    },
    "entryPoints": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "resetToNewDay",
        "newReleaseCheck"
      ],
      "properties": {
        "resetToNewDay": {
          "const": 3364
        },
        "newReleaseCheck": {
          "const": 3379
        }
      }
    },
    "statementIndexes": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "resetCallsCheck",
        "firstSaveDay",
        "makeTwoDayTimespan",
        "addThreshold",
        "compareCurrentDate",
        "condition",
        "successJump",
        "setUnlocked"
      ],
      "properties": {
        "resetCallsCheck": {
          "const": 3364
        },
        "firstSaveDay": {
          "const": 3401
        },
        "makeTwoDayTimespan": {
          "const": 3442
        },
        "addThreshold": {
          "const": 3495
        },
        "compareCurrentDate": {
          "const": 3533
        },
        "condition": {
          "const": 3583
        },
        "successJump": {
          "const": 3593
        },
        "setUnlocked": {
          "const": 3352
        }
      }
    }
  }
} as const;

export const NewReleaseMechanicsSchema = defineArtifactSchema<NewReleaseMechanicsContract>(NewReleaseMechanicsJsonSchema);
export type NewReleaseMechanics = typeof NewReleaseMechanicsSchema.infer;

type NewReleaseSourceIdentity =
  NewReleaseMechanics["sources"][keyof NewReleaseMechanics["sources"]];
export type NewReleaseArtifactIdentity<
  ArtifactType extends NewReleaseSourceIdentity["artifactType"] =
    NewReleaseSourceIdentity["artifactType"],
> = Extract<NewReleaseSourceIdentity, { artifactType: ArtifactType }>;
