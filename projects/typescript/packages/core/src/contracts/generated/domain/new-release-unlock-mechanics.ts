// Generated from src/contracts/domain/new-release-unlock-mechanics.ts by pnpm contracts:generate. Do not edit.

export interface NewReleaseUnlockMechanicsContract {
  artifactType: "new-release-unlock-mechanics";
  build: Build;
  sources: Sources;
  scope: "new-release-unlock";
  evidenceLevel: "typed-blueprint";
  runtimeValidation: "not-run";
  unlock: Unlock;
  requestSelection: RequestSelection;
}
export interface Build {
  steamAppId: string;
  steamBuildId: string;
}
export interface Sources {
  managerTrace: SourceIdentity & {
    artifactType: "unlockable-manager-trace";
  };
  wrapperTrace: SourceIdentity & {
    artifactType: "blueprint-function-trace";
  };
  propertyReaderTrace: SourceIdentity & {
    artifactType: "blueprint-property-reference-trace";
  };
}
export interface SourceIdentity {
  fileName: string;
  sha256: string;
  sizeBytes: number;
  artifactType: "unlockable-manager-trace" | "blueprint-function-trace" | "blueprint-property-reference-trace";
}
export interface Unlock {
  trigger: "reset-to-new-day-event";
  threshold: Threshold;
  mutation: Mutation;
  evidence: Evidence;
}
export interface Threshold {
  origin: "first-save-game-day";
  elapsedDays: 2;
  operator: "greater-than-or-equal";
  currentDate: "weather-current-date";
}
export interface Mutation {
  field: "ExampleReleaseKind";
  value: true;
  when: "threshold-reached";
}
export interface Evidence {
  kind: "kismet-analysis";
  confidence: "direct";
  classPath: "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C";
  wrapperFunctions: WrapperFunctions;
  entryPoints: EntryPoints;
  eventGraphFunction: "ExecuteExampleGraph_ExampleUnlockSystem";
  statementIndexes: StatementIndexes;
}
export interface WrapperFunctions {
  resetToNewDay: "Reset to new Day Event_Event";
  newReleaseCheck: "ExampleReleaseEnabled";
}
export interface EntryPoints {
  resetToNewDay: 3364;
  newReleaseCheck: 3379;
}
export interface StatementIndexes {
  resetCallsCheck: 3364;
  firstSaveDay: 3401;
  makeTwoDayTimespan: 3442;
  addThreshold: 3495;
  compareCurrentDate: 3533;
  condition: 3583;
  successJump: 3593;
  setUnlocked: 3352;
}
export interface RequestSelection {
  trigger: "return-movie-request";
  condition: RequestCondition;
  effect: RequestEffect;
  evidence: RequestEvidence;
}
export interface RequestCondition {
  unlockField: "ExampleReleaseKind";
  requiredValue: true;
  operator: "and";
  randomGate: RandomGate;
}
export interface RandomGate {
  function: "RandomBoolWithWeight";
  trueWeight: 0.5;
}
export interface RequestEffect {
  guaranteedRequestStep: 1;
  runOptionalPass: false;
  newReleaseRequested: true;
  primaryRequestCode: 5;
  primaryRequestValue: true;
  outputs: RequestOutputs;
}
export interface RequestOutputs {
  onlyNewRelease: true;
  mandatoryRequest: "primary-request-map";
}
export interface RequestEvidence {
  kind: "kismet-analysis";
  confidence: "direct";
  classPath: "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C";
  functionName: "Return Example Request";
  statementIndexes: RequestStatementIndexes;
}
export interface RequestStatementIndexes {
  randomCall: 2253;
  combineConditions: 2278;
  unlockRead: 2309;
  conditionBranch: 2328;
  setGuaranteedStep: 2342;
  disableOptionalPass: 2365;
  loopToDispatch: 2376;
  stepOneComparison: 2108;
  stepOneRoute: 2132;
  setNewReleaseRequested: 4028;
  setRequestValue: 4039;
  setRequestCode: 4050;
  addPrimaryRequest: 4092;
  setOnlyNewReleaseOutput: 3358;
  setMandatoryRequestOutput: 3396;
}
