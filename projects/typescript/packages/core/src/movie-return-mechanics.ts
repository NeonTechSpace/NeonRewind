import type {
  DefaultPropertyEvidence,
  RentalArtifactIdentity,
} from "./console-return-mechanics.ts";
import type { ClassFieldEvidence } from "./membership-fee-mechanics.ts";

export interface MovieReturnArtifactIdentity<
  ArtifactType extends
    | "blueprint-call-sites"
    | "blueprint-caller-bodies"
    | "blueprint-function-trace"
    | "rental-function-trace" =
    | "blueprint-call-sites"
    | "blueprint-caller-bodies"
    | "blueprint-function-trace"
    | "rental-function-trace",
> {
  readonly fileName: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly artifactType: ArtifactType;
  readonly schemaVersion: ArtifactType extends "blueprint-function-trace" ? 2 : 1;
}

export interface BlueprintTraceEvidence {
  readonly artifactType: "blueprint-function-trace";
  readonly classPath: string;
  readonly entryFunction: "ReceiveBeginPlay";
  readonly entryPoint: 68;
  readonly eventGraphFunction: "ExecuteExampleGraph_ExampleActor";
  readonly customerFunction: "Initialize Example Return";
  readonly statementIndexes: {
    readonly eventGraphEntry: 68;
    readonly customerCall: 49;
    readonly consoleSelectionCall: 230;
    readonly consoleFailureBranch: 262;
    readonly consoleFailureTarget: 399;
    readonly selectorCalls: readonly [465, 519];
    readonly selectorFailureBranch: 551;
    readonly loopHeader: 607;
    readonly loopCondition: 704;
    readonly inventoryAdd: 941;
    readonly readyQueueRemoval: 987;
    readonly loopExit: 1456;
    readonly loopBack: 1541;
  };
}

export interface RentalReadinessTraceEvidence {
  readonly artifactType: "rental-function-trace";
  readonly classPath: string;
  readonly newDayFunction: "Example Period Event";
  readonly readinessFunction: "Prepare Example Items";
  readonly eventGraphFunction: "ExecuteExampleGraph_ExampleQueueSystem";
  readonly statementIndexes: {
    readonly newDayCall: 18;
    readonly newDayEntry: 1792;
    readonly movieReadinessCall: 1803;
    readonly consoleReadinessCall: 1817;
    readonly readinessCall: 0;
    readonly readinessEntry: 2592;
    readonly transfer: 1854;
    readonly clearSource: 1904;
  };
}

export interface RentalSelectionTraceEvidence {
  readonly artifactType: "rental-function-trace";
  readonly classPath: string;
  readonly functionName: "Select Example Items";
  readonly statementIndexes: {
    readonly limitLength: 40;
    readonly limitComparison: 69;
    readonly limitBranch: 93;
    readonly rentedLength: 190;
    readonly rentedMinimum: 219;
    readonly firstProbability: 290;
    readonly selectedLength: 367;
    readonly firstAttemptCondition: 396;
    readonly additionalProbability: 467;
    readonly weightedDecision: 543;
    readonly weightedFailure: 562;
    readonly candidateChoice: 598;
    readonly candidateValidity: 645;
    readonly missingCandidate: 669;
    readonly selectedChoice: 705;
    readonly addUnique: 782;
    readonly retry: 810;
    readonly resultLength: 855;
    readonly resultCondition: 884;
    readonly emptyResult: 908;
  };
}

export interface MovieReturnMechanics {
  readonly artifactType: "movie-return-mechanics";
  readonly schemaVersion: 4;
  readonly build: {
    readonly steamAppId: string;
    readonly steamBuildId: string;
  };
  readonly sources: {
    readonly rentalEvidence: RentalArtifactIdentity;
    readonly rentalBlueprintBodies: RentalArtifactIdentity;
    readonly blueprintCallSites: MovieReturnArtifactIdentity<"blueprint-call-sites">;
    readonly blueprintCallerBodies: MovieReturnArtifactIdentity<"blueprint-caller-bodies">;
    readonly blueprintFunctionTrace: MovieReturnArtifactIdentity<"blueprint-function-trace">;
    readonly rentalFunctionTrace: MovieReturnArtifactIdentity<"rental-function-trace">;
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
    readonly evidence: RentalReadinessTraceEvidence;
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
    readonly evidence: RentalSelectionTraceEvidence;
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
      readonly evidence: BlueprintTraceEvidence;
    };
  };
}
