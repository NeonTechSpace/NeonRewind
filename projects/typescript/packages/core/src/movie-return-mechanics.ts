import type {
  BlueprintFunctionEvidence,
  DefaultPropertyEvidence,
  RentalArtifactIdentity,
} from "./console-return-mechanics.ts";
import type { ClassFieldEvidence } from "./membership-fee-mechanics.ts";

export interface BlueprintEntrypointEvidence extends BlueprintFunctionEvidence {
  readonly entryPoint: number;
}

export interface MovieReturnCallerArtifactIdentity<
  ArtifactType extends "blueprint-call-sites" | "blueprint-caller-bodies" =
    | "blueprint-call-sites"
    | "blueprint-caller-bodies",
> {
  readonly fileName: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly artifactType: ArtifactType;
  readonly schemaVersion: 1;
}

export interface BlueprintCallerFunctionEvidence {
  readonly artifactType: "blueprint-caller-bodies";
  readonly classPath: string;
  readonly functionName: string;
  readonly statementIndexes: readonly number[];
}

export interface MovieReturnMechanics {
  readonly artifactType: "movie-return-mechanics";
  readonly schemaVersion: 2;
  readonly build: {
    readonly steamAppId: string;
    readonly steamBuildId: string;
  };
  readonly sources: {
    readonly rentalEvidence: RentalArtifactIdentity;
    readonly rentalBlueprintBodies: RentalArtifactIdentity;
    readonly blueprintCallSites: MovieReturnCallerArtifactIdentity<"blueprint-call-sites">;
    readonly blueprintCallerBodies: MovieReturnCallerArtifactIdentity<"blueprint-caller-bodies">;
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
      readonly coverage: "all-parsed-blueprint-function-packages";
      readonly candidatePackageCount: number;
      readonly scannedPackageCount: number;
      readonly failedPackageCount: 0;
      readonly callerFound: true;
      readonly callSiteCount: 2;
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
    readonly customerFlow: {
      readonly callerClass: "ExampleActor_C";
      readonly callerFunction: "Initialize Example Return";
      readonly productPriority: "ready-console-before-movies";
      readonly movieSelectionWhen: "no-ready-console-found";
      readonly selectorCallCount: 2;
      readonly selectorNotFound: "return-without-product";
      readonly selectedMovies: {
        readonly iteration: "all-returned-movies";
        readonly destination: "customer-inventory";
        readonly removesFromCandidateQueue: true;
      };
      readonly evidence: BlueprintCallerFunctionEvidence;
    };
  };
}
