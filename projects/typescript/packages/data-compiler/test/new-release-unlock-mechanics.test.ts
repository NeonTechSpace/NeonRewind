import assert from "node:assert/strict";
import test from "node:test";

import { NewReleaseUnlockMechanicsSchema } from "@neonretrorewind/core";

import { compileNewReleaseUnlockMechanics } from "../src/new-release-unlock-mechanics.ts";
import {
  createManagerTrace,
  createPropertyReaderTrace,
  createWrapperTrace,
  newReleaseUnlockSources,
} from "./new-release-unlock-fixtures.ts";

test("compiles the confirmed two-day new-release unlock transition", async () => {
  const mechanics = compileCurrent();

  assert.deepEqual(mechanics.unlock, {
    trigger: "reset-to-new-day-event",
    threshold: {
      origin: "first-save-game-day",
      elapsedDays: 2,
      operator: "greater-than-or-equal",
      currentDate: "weather-current-date",
    },
    mutation: {
      field: "ExampleReleaseKind",
      value: true,
      when: "threshold-reached",
    },
    evidence: {
      kind: "kismet-analysis",
      confidence: "direct",
      classPath: "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockSystem.ExampleUnlockSystem_C",
      wrapperFunctions: {
        resetToNewDay: "Reset to new Day Event_Event",
        newReleaseCheck: "ExampleReleaseEnabled",
      },
      entryPoints: { resetToNewDay: 3364, newReleaseCheck: 3379 },
      eventGraphFunction: "ExecuteExampleGraph_ExampleUnlockSystem",
      statementIndexes: {
        resetCallsCheck: 3364,
        firstSaveDay: 3401,
        makeTwoDayTimespan: 3442,
        addThreshold: 3495,
        compareCurrentDate: 3533,
        condition: 3583,
        successJump: 3593,
        setUnlocked: 3352,
      },
    },
  });

  assert.equal(NewReleaseUnlockMechanicsSchema.allows(mechanics), true);
  assert.deepEqual(mechanics.requestSelection, {
    trigger: "return-movie-request",
    condition: {
      unlockField: "ExampleReleaseKind",
      requiredValue: true,
      operator: "and",
      randomGate: {
        function: "RandomBoolWithWeight",
        trueWeight: 0.5,
      },
    },
    effect: {
      guaranteedRequestStep: 1,
      runOptionalPass: false,
      newReleaseRequested: true,
      primaryRequestCode: 5,
      primaryRequestValue: true,
      outputs: {
        onlyNewRelease: true,
        mandatoryRequest: "primary-request-map",
      },
    },
    evidence: {
      kind: "kismet-analysis",
      confidence: "direct",
      classPath:
        "ExampleGame/Content/ExampleProject/core/ai/Task/BTTask_ExampleRequest.BTTask_ExampleRequest_C",
      functionName: "Return Example Request",
      statementIndexes: {
        randomCall: 2253,
        combineConditions: 2278,
        unlockRead: 2309,
        conditionBranch: 2328,
        setGuaranteedStep: 2342,
        disableOptionalPass: 2365,
        loopToDispatch: 2376,
        stepOneComparison: 2108,
        stepOneRoute: 2132,
        setNewReleaseRequested: 4028,
        setRequestValue: 4039,
        setRequestCode: 4050,
        addPrimaryRequest: 4092,
        setOnlyNewReleaseOutput: 3358,
        setMandatoryRequestOutput: 3396,
      },
    },
  });
});

test("rejects a changed reset wrapper entrypoint", () => {
  const wrapper = createWrapperTrace();
  const reset = wrapper.functions.find((function_) => function_.functionName === "Reset to new Day Event_Event");
  assert.ok(reset?.nodes[2]?.call);
  reset.nodes[2].call = {
    ...reset.nodes[2].call,
    integerArguments: [{ position: 0, value: "3365" }],
  };
  assert.throws(() => compileCurrent({ wrapper }), /integer arguments changed/u);
});

test("rejects a changed two-day threshold", () => {
  const manager = createManagerTrace();
  const timespan = manager.functions[0]!.nodes.find((node) => node.statementIndex === 3442);
  assert.ok(timespan?.call);
  timespan.call = {
    ...timespan.call,
    integerArguments: [
      { position: 0, value: "3" },
      ...timespan.call.integerArguments.slice(1),
    ],
  };
  assert.throws(() => compileCurrent({ manager }), /integer arguments changed/u);
});

test("rejects a changed threshold origin", () => {
  const manager = createManagerTrace();
  const origin = manager.functions[0]!.nodes.find((node) => node.statementIndex === 3504);
  assert.ok(origin);
  origin.symbol = "Another Date";
  assert.throws(() => compileCurrent({ manager }), /trace symbol changed/u);
});

test("rejects a reversed date comparison", () => {
  const manager = createManagerTrace();
  const compare = manager.functions[0]!.nodes.find((node) => node.statementIndex === 3533);
  assert.ok(compare?.call);
  compare.call = { ...compare.call, functionName: "Less_DateTimeDateTime" };
  assert.throws(() => compileCurrent({ manager }), /trace call changed/u);
});

test("rejects a changed success route", () => {
  const manager = createManagerTrace();
  const jump = manager.functions[0]!.nodes.find((node) => node.statementIndex === 3593);
  assert.ok(jump?.jump);
  jump.jump = {
    ...jump.jump,
    targets: [{ edge: "codeOffset", offset: 3600 }],
  };
  assert.throws(() => compileCurrent({ manager }), /trace branch changed/u);
});

test("rejects a changed mutation", () => {
  const manager = createManagerTrace();
  const field = manager.functions[0]!.nodes.find((node) => node.statementIndex === 3353);
  assert.ok(field);
  field.symbol = "Another Unlock";
  assert.throws(() => compileCurrent({ manager }), /trace symbol changed/u);
});

test("rejects traces from different builds", () => {
  const wrapper = createWrapperTrace();
  wrapper.build.steamBuildId = "1";
  assert.throws(() => compileCurrent({ wrapper }), /different game builds/u);
});

test("rejects a changed new-release request weight", () => {
  const propertyReader = createPropertyReaderTrace();
  const weight = propertyReader.functions[0]!.nodes.find(
    (node) => node.statementIndex === 2262,
  );
  assert.ok(weight?.literal);
  weight.literal = { ...weight.literal, value: "0.4" };
  assert.throws(() => compileCurrent({ propertyReader }), /trace literal changed/u);
});

test("rejects a changed new-release flag read", () => {
  const propertyReader = createPropertyReaderTrace();
  const unlockRead = propertyReader.functions[0]!.nodes.find(
    (node) => node.statementIndex === 2309,
  );
  assert.ok(unlockRead);
  unlockRead.symbol = "Another Unlock";
  assert.throws(() => compileCurrent({ propertyReader }), /trace symbol changed/u);
});

test("rejects a changed guaranteed-request route", () => {
  const propertyReader = createPropertyReaderTrace();
  const route = propertyReader.functions[0]!.nodes.find(
    (node) => node.statementIndex === 2132,
  );
  assert.ok(route?.jump);
  route.jump = {
    ...route.jump,
    targets: [{ edge: "codeOffset", offset: 4130 }],
  };
  assert.throws(() => compileCurrent({ propertyReader }), /trace branch changed/u);
});

test("rejects a changed primary request code", () => {
  const propertyReader = createPropertyReaderTrace();
  const requestCode = propertyReader.functions[0]!.nodes.find(
    (node) => node.statementIndex === 4068,
  );
  assert.ok(requestCode?.literal);
  requestCode.literal = { ...requestCode.literal, value: "6" };
  assert.throws(() => compileCurrent({ propertyReader }), /trace literal changed/u);
});

test("rejects a changed new-release output", () => {
  const propertyReader = createPropertyReaderTrace();
  const output = propertyReader.functions[0]!.nodes.find(
    (node) => node.statementIndex === 3368,
  );
  assert.ok(output);
  output.symbol = "lOld Movie Requested";
  assert.throws(() => compileCurrent({ propertyReader }), /trace symbol changed/u);
});

test("rejects a property-reader trace from another build", () => {
  const propertyReader = createPropertyReaderTrace();
  propertyReader.build.steamBuildId = "1";
  assert.throws(() => compileCurrent({ propertyReader }), /different game builds/u);
});

function compileCurrent(overrides: {
  manager?: ReturnType<typeof createManagerTrace>;
  propertyReader?: ReturnType<typeof createPropertyReaderTrace>;
  wrapper?: ReturnType<typeof createWrapperTrace>;
} = {}) {
  return compileNewReleaseUnlockMechanics(
    overrides.manager ?? createManagerTrace(),
    overrides.wrapper ?? createWrapperTrace(),
    overrides.propertyReader ?? createPropertyReaderTrace(),
    newReleaseUnlockSources,
  );
}
