import assert from "node:assert/strict";
import test from "node:test";

import { NewReleaseUnlockMechanicsSchema } from "@neonretrorewind/core";

import { compileNewReleaseUnlockMechanics } from "../src/new-release-unlock-mechanics.ts";
import {
  createManagerTrace,
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

function compileCurrent(overrides: {
  manager?: ReturnType<typeof createManagerTrace>;
  wrapper?: ReturnType<typeof createWrapperTrace>;
} = {}) {
  return compileNewReleaseUnlockMechanics(
    overrides.manager ?? createManagerTrace(),
    overrides.wrapper ?? createWrapperTrace(),
    newReleaseUnlockSources,
  );
}
