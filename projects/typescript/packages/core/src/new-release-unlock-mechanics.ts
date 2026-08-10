export interface NewReleaseUnlockArtifactIdentity<
  ArtifactType extends "unlockable-manager-trace" | "blueprint-function-trace" =
    | "unlockable-manager-trace"
    | "blueprint-function-trace",
> {
  readonly fileName: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly artifactType: ArtifactType;
}

export interface NewReleaseUnlockMechanics {
  readonly artifactType: "new-release-unlock-mechanics";
  readonly build: {
    readonly steamAppId: string;
    readonly steamBuildId: string;
  };
  readonly sources: {
    readonly managerTrace: NewReleaseUnlockArtifactIdentity<"unlockable-manager-trace">;
    readonly wrapperTrace: NewReleaseUnlockArtifactIdentity<"blueprint-function-trace">;
  };
  readonly scope: "new-release-unlock";
  readonly evidenceLevel: "typed-blueprint";
  readonly runtimeValidation: "not-run";
  readonly unlock: {
    readonly trigger: "reset-to-new-day-event";
    readonly threshold: {
      readonly origin: "first-save-game-day";
      readonly elapsedDays: 2;
      readonly operator: "greater-than-or-equal";
      readonly currentDate: "weather-current-date";
    };
    readonly mutation: {
      readonly field: "ExampleReleaseKind";
      readonly value: true;
      readonly when: "threshold-reached";
    };
    readonly evidence: {
      readonly kind: "kismet-analysis";
      readonly confidence: "direct";
      readonly classPath: string;
      readonly wrapperFunctions: {
        readonly resetToNewDay: "Reset to new Day Event_Event";
        readonly newReleaseCheck: "ExampleReleaseEnabled";
      };
      readonly entryPoints: {
        readonly resetToNewDay: 3364;
        readonly newReleaseCheck: 3379;
      };
      readonly eventGraphFunction: "ExecuteExampleGraph_ExampleUnlockSystem";
      readonly statementIndexes: {
        readonly resetCallsCheck: 3364;
        readonly firstSaveDay: 3401;
        readonly makeTwoDayTimespan: 3442;
        readonly addThreshold: 3495;
        readonly compareCurrentDate: 3533;
        readonly condition: 3583;
        readonly successJump: 3593;
        readonly setUnlocked: 3352;
      };
    };
  };
}
