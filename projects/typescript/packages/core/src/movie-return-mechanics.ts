import type {
  BlueprintFunctionEvidence,
  DefaultPropertyEvidence,
  RentalArtifactIdentity,
} from "./console-return-mechanics.ts";
import type { ClassFieldEvidence } from "./membership-fee-mechanics.ts";

export interface BlueprintEntrypointEvidence extends BlueprintFunctionEvidence {
  readonly entryPoint: number;
}

export interface MovieReturnMechanics {
  readonly artifactType: "movie-return-mechanics";
  readonly schemaVersion: 1;
  readonly build: {
    readonly steamAppId: string;
    readonly steamBuildId: string;
  };
  readonly sources: {
    readonly rentalEvidence: RentalArtifactIdentity;
    readonly rentalBlueprintBodies: RentalArtifactIdentity;
  };
  readonly scope: "movie-return-readiness-and-selection";
  readonly evidenceLevel: "decompiled-blueprint";
  readonly runtimeValidation: "not-run";
  readonly readiness: {
    readonly trigger: "new-day-event";
    readonly source: {
      readonly queue: "rented";
      readonly evidence: ClassFieldEvidence;
    };
    readonly destination: {
      readonly queue: "ready-to-return";
      readonly evidence: ClassFieldEvidence;
    };
    readonly transfer: "append-all";
    readonly clearsSource: true;
    readonly evidence: {
      readonly newDayHandler: BlueprintEntrypointEvidence;
      readonly readinessHandler: BlueprintEntrypointEvidence;
      readonly dispatcher: BlueprintFunctionEvidence;
    };
  };
  readonly selection: {
    readonly callerSearch: {
      readonly coverage: "rental-blueprint-bodies";
      readonly callerFound: false;
    };
    readonly candidateQueue: "ready-to-return";
    readonly maximumUniqueMovies: 4;
    readonly firstAttempt: {
      readonly defaultProbability: {
        readonly value: number;
        readonly evidence: DefaultPropertyEvidence;
      };
      readonly override: {
        readonly whenQueue: "rented";
        readonly minimumLength: 3;
        readonly probability: 0.95;
      };
    };
    readonly additionalAttemptProbability: {
      readonly value: number;
      readonly evidence: DefaultPropertyEvidence;
    };
    readonly randomDecision: "weighted-boolean-per-attempt";
    readonly candidateChoice: "uniform-random";
    readonly deduplication: "add-unique";
    readonly outcomes: {
      readonly weightedFailureWithNoSelection: "not-found-empty";
      readonly weightedFailureWithSelection: "found-selected";
      readonly missingCandidate: "not-found-empty";
    };
    readonly evidence: BlueprintFunctionEvidence;
  };
}
