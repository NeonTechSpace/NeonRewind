import type {
  NewReleaseArtifactIdentity,
  NewReleaseMechanics,
} from "@neonretrorewind/core";

import {
  assertTraceJump,
  assertTraceLiteralChild,
  assertTraceNodeTree,
  assertTraceRootNode,
  assertTraceSymbolChild,
  findTraceCall,
  findTraceFunction,
  findTraceNode,
} from "./blueprint-trace-assertions.ts";
import type {
  BlueprintCallTargetTraceArtifact,
  BlueprintPropertyReferenceTraceArtifact,
  BlueprintTraceFunctionInput,
  BlueprintTraceNodeInput,
} from "./blueprint-trace-inputs.ts";

const calendarClassPath =
  "ExampleGame/Content/ExampleProject/asset/prop/ExampleScheduleArea/ExampleScheduler.ExampleScheduler_C";
const callerFunctionName = "ExecuteExampleGraph_ExampleScheduler";
const callerFunctionPath = `${calendarClassPath}:${callerFunctionName}`;
const scheduleFunctionName = "Generate Example Event";
const scheduleFunctionPath = `${calendarClassPath}:${scheduleFunctionName}`;
const movieCounter = "ExampleLastReleasePeriod";
const loopDay = "Generate Example Event - Current Loop I";
const forcedMap = "ExampleForcedEvents";
const calendarPackagePath =
  "ExampleGame/Content/ExampleProject/asset/prop/ExampleScheduleArea/ExampleScheduler.uasset";
const forcedMapType =
  "Map<Int, Struct<ExampleGame/Content/ExampleProject/asset/prop/ExampleScheduleArea/ExampleScheduleStruct.ExampleScheduleStruct>>";

export function compileNewReleaseMonthlySchedule(
  callerTrace: BlueprintPropertyReferenceTraceArtifact,
  callTargetTrace: BlueprintCallTargetTraceArtifact,
  callerIdentity: NewReleaseArtifactIdentity<"blueprint-property-reference-trace">,
): NewReleaseMechanics["monthlySchedule"] {
  assertCallerScope(callerTrace);
  assertTargetBinding(callTargetTrace, callerIdentity);

  const caller = findTraceFunction(callerTrace.functions, callerFunctionName);
  assertCallerFunction(caller);
  assertTargetFunction(callTargetTrace.binding.function);

  return {
    calendar: {
      firstDay: 1,
      lastDay: 28,
      calendarMapClearedBeforeGeneration: true,
      calendarUiMapClearedBeforeGeneration: true,
    },
    eventCodes: {
      noEvent: 0,
      newReleaseMovie: 1,
    },
    movieReleaseCounter: {
      field: movieCounter,
      initialValues: {
        firstSaveDay: 0,
        laterMonth: 2,
      },
      increment: {
        amount: 1,
        when: "day-not-present-in-force-map",
      },
      randomThreshold: {
        function: "RandomIntegerInRange",
        minimum: 4,
        maximum: 5,
        bounds: "inclusive",
        draw: "each-nonseasonal-evaluation",
        comparison: "counter-greater-than-or-equal",
      },
      resetOnRelease: 0,
    },
    forcedInputs: {
      nonFirstSaveMatchingDayCount: 0,
      firstSaveFullGameMovieReleaseDay: 3,
      firstSaveDemoMovieReleaseDayOne: 3,
      firstSaveDemoMovieReleaseDayTwo: 6,
      firstSaveDemoNoEventDay: 7,
      movieReleaseEntryCounterValue: 0,
      noEventEntryCounterValue: 2,
    },
    seasonalPrecedence: {
      selection: "weather-season-return-event",
      noEventCode: 0,
      nonzeroEventBlocksNewRelease: true,
      counterContinuesAcrossBlockedDay: true,
    },
    evidence: {
      kind: "kismet-analysis",
      confidence: "direct",
      classPath: calendarClassPath,
      callerFunction: callerFunctionName,
      scheduleFunction: scheduleFunctionName,
      bindingRule: "exact-local-virtual-caller-class-and-declaration",
      relationship: "verified",
      statementIndexes: {
        callerFirstSaveCheck: 877,
        callerNonFirstSaveMap: 900,
        callerMovieEventArray: 948,
        callerFullGameMap: 997,
        callerNoEventArray: 1045,
        callerDemoMap: 1180,
        callerDemoCheck: 1237,
        callerScheduleCall: 1278,
        clearExampleScheduleAreaMap: 27,
        clearExampleScheduleAreaUiMap: 68,
        targetFirstSaveCheck: 109,
        initialCounterSelection: 215,
        loopStart: 286,
        loopCondition: 301,
        forcedMapFind: 403,
        forcedMovieFind: 583,
        resetFromForcedMovie: 668,
        randomThreshold: 1047,
        compareThreshold: 1077,
        resetFromThreshold: 1119,
        seasonalSelection: 912,
        seasonalBranch: 1015,
        selectMovieEvent: 1245,
        addExampleScheduleAreaDay: 1357,
        incrementLoopDay: 1859,
        incrementCounter: 1933,
        forcedNoEventFind: 2187,
        setFromForcedNoEvent: 2272,
        addSeasonalDay: 2901,
        addExampleScheduleAreaUiDay: 3304,
      },
    },
  };
}

function assertCallerScope(trace: BlueprintPropertyReferenceTraceArtifact): void {
  if (
    trace.artifactType !== "blueprint-property-reference-trace" ||
    trace.blueprintPropertyReferences.targetPropertyName !== "ExampleScheduleArea Map" ||
    trace.selectionRule !== "explicit-functions-with-read-references" ||
    trace.requestedFunctionPaths.length !== 1 ||
    trace.requestedFunctionPaths[0] !== callerFunctionPath ||
    trace.functions.length !== 1
  ) {
    throw new Error("Monthly-schedule caller trace scope changed.");
  }
}

function assertTargetBinding(
  trace: BlueprintCallTargetTraceArtifact,
  callerIdentity: NewReleaseArtifactIdentity<"blueprint-property-reference-trace">,
): void {
  if (
    trace.artifactType !== "blueprint-call-target-trace" ||
    trace.sourceTrace.fileName !== callerIdentity.fileName ||
    trace.sourceTrace.sizeBytes !== callerIdentity.sizeBytes ||
    trace.sourceTrace.sha256 !== callerIdentity.sha256 ||
    trace.sourceTrace.artifactType !== callerIdentity.artifactType ||
    trace.sourceTrace.targetPropertyName !== "ExampleScheduleArea Map" ||
    trace.declarations.artifactType !== "blueprint-function-declarations" ||
    trace.declarations.targetFunctionName !== scheduleFunctionName ||
    trace.declarations.declarationRule !== "exact-raw-function-export-object-name"
  ) {
    throw new Error("Monthly-schedule source trace identity changed.");
  }

  if (
    trace.recordedCall.callerFunctionPath !== callerFunctionPath ||
    trace.recordedCall.statementIndex !== 1278 ||
    trace.recordedCall.opcode !== "EX_LocalVirtualFunction" ||
    trace.recordedCall.call.callKind !== "local-virtual" ||
    trace.recordedCall.call.functionName !== scheduleFunctionName ||
    trace.recordedCall.call.argumentCount !== 1 ||
    trace.recordedCall.call.integerArguments.length !== 0
  ) {
    throw new Error("Monthly-schedule call binding changed.");
  }

  const { binding } = trace;
  if (
    binding.bindingRule !== "exact-local-virtual-caller-class-and-declaration" ||
    !("callStatementIndex" in binding.receiver) ||
    binding.relationship !== "verified" ||
    !binding.receiverClassMatchesDeclarationOwner ||
    !binding.argumentCountMatchesParameterCount ||
    binding.receiver.classPath !== calendarClassPath ||
    binding.receiver.callStatementIndex !== 1278 ||
    binding.receiver.callOpcode !== "EX_LocalVirtualFunction" ||
    binding.receiver.callerFunctionPath !== callerFunctionPath ||
    binding.declaration.packagePath !== calendarPackagePath ||
    binding.declaration.packageExportIndex !== 15 ||
    binding.declaration.objectPath !== scheduleFunctionPath ||
    binding.declaration.ownerPath !== calendarClassPath ||
    binding.declaration.signature.parameterCount !== 1 ||
    binding.declaration.signature.parameters[0]?.position !== 0 ||
    binding.declaration.signature.parameters[0]?.name !== forcedMap ||
    binding.declaration.signature.parameters[0]?.type !== forcedMapType ||
    binding.declaration.signature.parameters[0]?.arrayDimension !== 1 ||
    binding.declaration.signature.parameters[0]?.flags !==
      "BlueprintVisible, BlueprintReadOnly, Parm" ||
    binding.function.packagePath !== calendarPackagePath ||
    binding.function.className !== "ExampleScheduler_C" ||
    binding.function.classPath !== calendarClassPath ||
    binding.function.functionName !== scheduleFunctionName ||
    binding.function.functionPath !== scheduleFunctionPath ||
    binding.function.flags !==
      "FUNC_Public, FUNC_HasDefaults, FUNC_BlueprintCallable, FUNC_BlueprintEvent"
  ) {
    throw new Error("Monthly-schedule target identity changed.");
  }
}

function assertCallerFunction(function_: BlueprintTraceFunctionInput): void {
  if (
    function_.packagePath !== calendarPackagePath ||
    function_.className !== "ExampleScheduler_C" ||
    function_.classPath !== calendarClassPath ||
    function_.functionName !== callerFunctionName ||
    function_.functionPath !== callerFunctionPath ||
    function_.flags !== "FUNC_Final, FUNC_UbergraphFunction, FUNC_HasDefaults" ||
    function_.bytecodeExpressionCount !== 237
  ) {
    throw new Error("Monthly-schedule caller function identity changed.");
  }
  assertTraceNodeTree(function_);

  const firstSave = findTraceCall(
    function_,
    877,
    "Return Is it the First day of SaveGame?",
    "local-virtual",
    1,
  );
  assertTraceSymbolChild(
    firstSave,
    function_,
    "Parameters[0]",
    "ExampleSymbol_32904955f3e6",
  );

  const nonFirstSaveMap = assertRootOperation(function_, 900, "EX_SetMap");
  assertTraceSymbolChild(nonFirstSaveMap, function_, "MapProperty", "ExampleSymbol_61f1e174a7f2");
  assertTraceLiteralChild(nonFirstSaveMap, function_, "Elements[0]", "integer", "0");
  const emptyDay = findChild(nonFirstSaveMap, function_, "Elements[1]");
  assertOpcode(emptyDay, "EX_StructConst", 919);
  const emptyEvents = findChild(emptyDay, function_, "Properties[0]");
  assertOpcode(emptyEvents, "EX_ArrayConst", 932);
  assertNoChildren(emptyEvents, function_);

  assertByteArray(function_, 948, "ExampleSymbol_12ac84ddab95", 1);
  assertEventArrayAssignment(
    function_,
    961,
    "ExampleSymbol_acf5973f84c3",
    "ExampleSymbol_12ac84ddab95",
  );
  assertForcedMap(function_, 997, "ExampleSymbol_76da57e5c31a", [
    [3, "ExampleSymbol_acf5973f84c3"],
  ]);
  const callerFirstSave = assertAssignment(function_, 1026, "Temp_bool_Variable");
  assertTraceSymbolChild(
    callerFirstSave,
    function_,
    "Assignment",
    "ExampleSymbol_32904955f3e6",
  );

  assertByteArray(function_, 1045, "ExampleSymbol_8691914c8e3f", 0);
  assertEventArrayAssignment(
    function_,
    1079,
    "ExampleSymbol_966f3400f27e",
    "ExampleSymbol_8691914c8e3f",
  );
  assertForcedMap(function_, 1180, "ExampleSymbol_91871c7462dc", [
    [3, "ExampleSymbol_acf5973f84c3"],
    [6, "ExampleSymbol_acf5973f84c3"],
    [7, "ExampleSymbol_966f3400f27e"],
  ]);

  const demoCheck = assertAssignment(function_, 1237, "Temp_bool_Variable_1");
  const demoContext = findChild(demoCheck, function_, "Assignment");
  assertOpcode(demoContext, "EX_Context", 1247);
  assertTraceSymbolChild(demoContext, function_, "ContextExpression", "is Demo");

  const scheduleCall = findTraceCall(
    function_,
    1278,
    scheduleFunctionName,
    "local-virtual",
    1,
  );
  assertTraceRootNode(function_, 1278, "EX_LocalVirtualFunction");
  const firstSaveSelection = findChild(scheduleCall, function_, "Parameters[0]");
  assertOpcode(firstSaveSelection, "EX_SwitchValue", 1291);
  assertBooleanSwitchCases(firstSaveSelection, function_);
  assertTraceSymbolChild(firstSaveSelection, function_, "IndexTerm", "Temp_bool_Variable");
  assertTraceSymbolChild(
    firstSaveSelection,
    function_,
    "Cases[0].CaseTerm",
    "ExampleSymbol_61f1e174a7f2",
  );
  const demoSelection = findChild(firstSaveSelection, function_, "Cases[1].CaseTerm");
  assertOpcode(demoSelection, "EX_SwitchValue", 1326);
  assertBooleanSwitchCases(demoSelection, function_);
  assertTraceSymbolChild(demoSelection, function_, "IndexTerm", "Temp_bool_Variable_1");
  assertTraceSymbolChild(
    demoSelection,
    function_,
    "Cases[0].CaseTerm",
    "ExampleSymbol_76da57e5c31a",
  );
  assertTraceSymbolChild(
    demoSelection,
    function_,
    "Cases[1].CaseTerm",
    "ExampleSymbol_91871c7462dc",
  );
}

function assertTargetFunction(function_: BlueprintTraceFunctionInput): void {
  if (
    function_.packagePath !== calendarPackagePath ||
    function_.className !== "ExampleScheduler_C" ||
    function_.classPath !== calendarClassPath ||
    function_.functionName !== scheduleFunctionName ||
    function_.functionPath !== scheduleFunctionPath ||
    function_.flags !==
      "FUNC_Public, FUNC_HasDefaults, FUNC_BlueprintCallable, FUNC_BlueprintEvent" ||
    function_.bytecodeExpressionCount !== 101
  ) {
    throw new Error("Monthly-schedule target function identity changed.");
  }
  assertTraceNodeTree(function_);

  assertMapCall(function_, 27, "Map_Clear", "ExampleScheduleArea Map", 1);
  assertMapCall(function_, 68, "Map_Clear", "ExampleScheduleArea UI Map", 1);

  const firstSave = findTraceCall(
    function_,
    109,
    "Return Is it the First day of SaveGame?",
    "local-virtual",
    1,
  );
  assertTraceSymbolChild(
    firstSave,
    function_,
    "Parameters[0]",
    "ExampleSymbol_32904955f3e6",
  );
  assertLiteralAssignment(function_, 132, "Temp_int_Variable_1", 2);
  assertLiteralAssignment(function_, 155, "Temp_int_Variable_2", 0);
  const initialCounter = assertAssignment(function_, 197, movieCounter);
  const targetFirstSave = assertAssignment(function_, 178, "Temp_bool_Variable_1");
  assertTraceSymbolChild(
    targetFirstSave,
    function_,
    "Assignment",
    "ExampleSymbol_32904955f3e6",
  );
  const initialSelection = findChild(initialCounter, function_, "Assignment");
  assertOpcode(initialSelection, "EX_SwitchValue", 215);
  assertBooleanSwitchCases(initialSelection, function_);
  assertTraceSymbolChild(initialSelection, function_, "IndexTerm", "Temp_bool_Variable_1");
  assertTraceSymbolChild(
    initialSelection,
    function_,
    "Cases[0].CaseTerm",
    "Temp_int_Variable_1",
  );
  assertTraceSymbolChild(
    initialSelection,
    function_,
    "Cases[1].CaseTerm",
    "Temp_int_Variable_2",
  );

  assertLiteralAssignment(function_, 268, "Temp_int_Variable", 1);
  const loopCondition = findTraceCall(function_, 301, "LessEqual_IntInt", "final", 2);
  assertTraceSymbolChild(loopCondition, function_, "Parameters[0]", "Temp_int_Variable");
  assertTraceLiteralChild(loopCondition, function_, "Parameters[1]", "integer", "28");
  assertTraceJump(function_, 325, "conditional-false", "codeOffset", 1647);
  const currentDay = assertAssignment(function_, 344, loopDay);
  assertTraceSymbolChild(currentDay, function_, "Assignment", "Temp_int_Variable");

  const forcedDay = findTraceCall(function_, 403, "Map_Find", "final", 3);
  assertTraceSymbolChild(forcedDay, function_, "Parameters[0]", forcedMap);
  assertTraceSymbolChild(forcedDay, function_, "Parameters[1]", "Temp_int_Variable");
  assertTraceJump(function_, 440, "conditional-false", "codeOffset", 1915);

  assertLiteralAssignment(function_, 523, "Temp_byte_Variable_5", 1);
  const forcedMovie = findTraceCall(function_, 583, "Array_Find", "final", 2);
  assertTraceSymbolChild(forcedMovie, function_, "Parameters[1]", "Temp_byte_Variable_5");
  assertNotEqualMinusOne(function_, 630, "ExampleSymbol_e14d36c37b81");
  assertTraceJump(function_, 654, "conditional-false", "codeOffset", 2058);
  assertLiteralAssignment(function_, 668, movieCounter, 0);

  const counterIncrement = findTraceCall(function_, 1933, "Add_IntInt", "final", 2);
  assertTraceSymbolChild(counterIncrement, function_, "Parameters[0]", movieCounter);
  assertTraceLiteralChild(counterIncrement, function_, "Parameters[1]", "integer", "1");
  const incrementedCounter = assertAssignment(function_, 1957, movieCounter);
  assertTraceSymbolChild(
    incrementedCounter,
    function_,
    "Assignment",
    "ExampleSymbol_984af5b2d439",
  );
  assertTraceJump(function_, 2053, "unconditional", "codeOffset", 691);

  assertLiteralAssignment(function_, 2127, "Temp_byte_Variable_4", 0);
  const forcedNoEvent = findTraceCall(function_, 2187, "Array_Find", "final", 2);
  assertTraceSymbolChild(forcedNoEvent, function_, "Parameters[1]", "Temp_byte_Variable_4");
  assertNotEqualMinusOne(function_, 2234, "ExampleSymbol_0b481d5b7326");
  assertTraceJump(function_, 2258, "conditional-false", "codeOffset", 2300);
  assertLiteralAssignment(function_, 2272, movieCounter, 2);
  assertTraceJump(function_, 2295, "unconditional", "codeOffset", 691);

  for (const [statement, name] of [
    [716, "ExampleSeasonEvent2"],
    [748, "ExampleSeasonEvent3"],
    [780, "ExampleSeasonEvent4"],
    [812, "ExampleSeasonEvent1"],
  ] as const) {
    const call = findTraceCall(function_, statement, name, "local-virtual", 2);
    assertTraceSymbolChild(call, function_, "Parameters[0]", loopDay);
  }
  const season = assertAssignment(function_, 844, "Temp_byte_Variable");
  const seasonContext = findChild(season, function_, "Assignment");
  assertOpcode(seasonContext, "EX_Context", 862);
  assertTraceSymbolChild(seasonContext, function_, "ObjectExpression", "Example Clock Reference");
  assertTraceSymbolChild(seasonContext, function_, "ContextExpression", "Season");
  const seasonSelection = findTraceCall(
    function_,
    903,
    "EqualEqual_ByteByte",
    "final",
    2,
  );
  const selectedSeasonalEvent = findChild(seasonSelection, function_, "Parameters[0]");
  assertOpcode(selectedSeasonalEvent, "EX_SwitchValue", 912);
  assertTraceSymbolChild(selectedSeasonalEvent, function_, "IndexTerm", "Temp_byte_Variable");
  for (const [index, symbol] of [
    [0, "Temp_byte_Variable_1"],
    [1, "ExampleSymbol_802a7881eb4c"],
    [2, "ExampleSymbol_b4b1db4b3f0a"],
    [3, "ExampleSymbol_3de8670e5951"],
    [4, "ExampleSymbol_de1725b614ba"],
  ] as const) {
    assertTraceSymbolChild(
      selectedSeasonalEvent,
      function_,
      `Cases[${index}].CaseTerm`,
      symbol,
    );
  }
  assertTraceLiteralChild(seasonSelection, function_, "Parameters[1]", "integer", "0");
  assertTraceJump(function_, 1015, "conditional-false", "codeOffset", 2535);

  assertRandomThreshold(function_, 1047, 1077, 1105, 1142);
  assertLiteralAssignment(function_, 1119, movieCounter, 0);
  assertRandomThreshold(function_, 2318, 2348, 2376, 691);
  assertLiteralAssignment(function_, 2390, movieCounter, 0);

  assertLiteralAssignment(function_, 1142, "Temp_byte_Variable_2", 1);
  assertLiteralAssignment(function_, 1162, "Temp_byte_Variable_3", 0);
  const releaseDue = findTraceCall(function_, 1192, "EqualEqual_IntInt", "final", 2);
  assertTraceSymbolChild(releaseDue, function_, "Parameters[0]", movieCounter);
  assertTraceLiteralChild(releaseDue, function_, "Parameters[1]", "integer", "0");
  const eventSelection = findTraceNode(function_, 1245);
  assertOpcode(eventSelection, "EX_SwitchValue", 1245);
  assertBooleanSwitchCases(eventSelection, function_);
  assertTraceSymbolChild(eventSelection, function_, "IndexTerm", "Temp_bool_Variable");
  assertTraceSymbolChild(eventSelection, function_, "Cases[0].CaseTerm", "Temp_byte_Variable_3");
  assertTraceSymbolChild(eventSelection, function_, "Cases[1].CaseTerm", "Temp_byte_Variable_2");

  const regularDayAdd = assertMapCall(function_, 1357, "Map_Add", "ExampleScheduleArea Map", 3);
  assertTraceSymbolChild(regularDayAdd, function_, "Parameters[1]", "Temp_int_Variable");
  const dayIncrement = findTraceCall(function_, 1859, "Add_IntInt", "final", 2);
  assertTraceSymbolChild(dayIncrement, function_, "Parameters[0]", "Temp_int_Variable");
  assertTraceLiteralChild(dayIncrement, function_, "Parameters[1]", "integer", "1");
  assertTraceJump(function_, 1910, "unconditional", "codeOffset", 291);
  const seasonalDayAdd = assertMapCall(function_, 2901, "Map_Add", "ExampleScheduleArea Map", 3);
  assertTraceSymbolChild(seasonalDayAdd, function_, "Parameters[1]", "Temp_int_Variable");
  const uiDayAdd = assertMapCall(function_, 3304, "Map_Add", "ExampleScheduleArea UI Map", 3);
  assertTraceSymbolChild(uiDayAdd, function_, "Parameters[1]", "Temp_int_Variable");

  const counterWrites = function_.nodes
    .filter((node) => node.kind === "assignment" && node.symbol === movieCounter)
    .map((node) => node.statementIndex);
  if (JSON.stringify(counterWrites) !== JSON.stringify([197, 668, 1119, 1957, 2272, 2390])) {
    throw new Error("Monthly-schedule movie counter writes changed.");
  }
}

function assertRandomThreshold(
  function_: BlueprintTraceFunctionInput,
  randomStatement: number,
  comparisonStatement: number,
  branchStatement: number,
  falseTarget: number,
): void {
  const random = findTraceCall(
    function_,
    randomStatement,
    "RandomIntegerInRange",
    "final",
    2,
  );
  assertTraceLiteralChild(random, function_, "Parameters[0]", "integer", "4");
  assertTraceLiteralChild(random, function_, "Parameters[1]", "integer", "5");
  const comparison = findTraceCall(
    function_,
    comparisonStatement,
    "GreaterEqual_IntInt",
    "final",
    2,
  );
  assertTraceSymbolChild(comparison, function_, "Parameters[0]", movieCounter);
  assertTraceSymbolChild(
    comparison,
    function_,
    "Parameters[1]",
    "ExampleSymbol_16b34cdcbe73",
  );
  assertTraceJump(
    function_,
    branchStatement,
    "conditional-false",
    "codeOffset",
    falseTarget,
  );
}

function assertMapCall(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  functionName: string,
  mapSymbol: string,
  argumentCount: number,
): BlueprintTraceNodeInput {
  const call = findTraceCall(function_, statementIndex, functionName, "final", argumentCount);
  assertTraceSymbolChild(call, function_, "Parameters[0]", mapSymbol);
  return call;
}

function assertBooleanSwitchCases(
  switchNode: BlueprintTraceNodeInput,
  function_: BlueprintTraceFunctionInput,
): void {
  assertTraceLiteralChild(
    switchNode,
    function_,
    "Cases[0].CaseIndexValueTerm",
    "boolean",
    "false",
  );
  assertTraceLiteralChild(
    switchNode,
    function_,
    "Cases[1].CaseIndexValueTerm",
    "boolean",
    "true",
  );
}

function assertNotEqualMinusOne(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  resultSymbol: string,
): void {
  const comparison = findTraceCall(
    function_,
    statementIndex,
    "NotEqual_IntInt",
    "final",
    2,
  );
  assertTraceSymbolChild(comparison, function_, "Parameters[0]", resultSymbol);
  assertTraceLiteralChild(comparison, function_, "Parameters[1]", "integer", "-1");
}

function assertForcedMap(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  mapSymbol: string,
  entries: readonly (readonly [number, string])[],
): void {
  const map = assertRootOperation(function_, statementIndex, "EX_SetMap");
  assertTraceSymbolChild(map, function_, "MapProperty", mapSymbol);
  for (const [index, [day, eventStruct]] of entries.entries()) {
    assertTraceLiteralChild(map, function_, `Elements[${index * 2}]`, "integer", String(day));
    assertTraceSymbolChild(map, function_, `Elements[${index * 2 + 1}]`, eventStruct);
  }
  assertChildCount(map, function_, entries.length * 2 + 1);
}

function assertByteArray(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  arraySymbol: string,
  value: number,
): void {
  const array = assertRootOperation(function_, statementIndex, "EX_SetArray");
  assertTraceSymbolChild(array, function_, "AssigningProperty", arraySymbol);
  assertTraceLiteralChild(array, function_, "Elements[0]", "integer", String(value));
  assertChildCount(array, function_, 2);
}

function assertEventArrayAssignment(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  structSymbol: string,
  arraySymbol: string,
): void {
  const assignment = assertAssignment(function_, statementIndex);
  const member = findChild(assignment, function_, "Variable");
  assertOpcode(member, "EX_StructMemberContext", statementIndex + 9);
  assertTraceSymbolChild(member, function_, "StructExpression", structSymbol);
  assertTraceSymbolChild(assignment, function_, "Assignment", arraySymbol);
}

function assertLiteralAssignment(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  variable: string,
  value: number,
): void {
  const assignment = assertAssignment(function_, statementIndex, variable);
  assertTraceLiteralChild(assignment, function_, "Assignment", "integer", String(value));
}

function assertAssignment(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  variable?: string,
): BlueprintTraceNodeInput {
  const assignment = findTraceNode(function_, statementIndex);
  if (assignment.kind !== "assignment" || assignment.parentNodeIndex !== null) {
    throw new Error(`Monthly-schedule assignment changed at statement ${statementIndex}.`);
  }
  if (variable !== undefined) {
    assertTraceSymbolChild(assignment, function_, "Variable", variable);
  }
  return assignment;
}

function assertRootOperation(
  function_: BlueprintTraceFunctionInput,
  statementIndex: number,
  opcode: string,
): BlueprintTraceNodeInput {
  const operation = findTraceNode(function_, statementIndex);
  if (operation.parentNodeIndex !== null || operation.opcode !== opcode) {
    throw new Error(`Monthly-schedule operation changed at statement ${statementIndex}.`);
  }
  return operation;
}

function assertOpcode(
  node: BlueprintTraceNodeInput,
  opcode: string,
  statementIndex: number,
): void {
  if (node.opcode !== opcode || node.statementIndex !== statementIndex) {
    throw new Error(`Monthly-schedule node changed at statement ${statementIndex}.`);
  }
}

function assertNoChildren(
  parent: BlueprintTraceNodeInput,
  function_: BlueprintTraceFunctionInput,
): void {
  assertChildCount(parent, function_, 0);
}

function assertChildCount(
  parent: BlueprintTraceNodeInput,
  function_: BlueprintTraceFunctionInput,
  expected: number,
): void {
  const actual = function_.nodes.filter((node) => node.parentNodeIndex === parent.nodeIndex).length;
  if (actual !== expected) {
    throw new Error(`Monthly-schedule child count changed at statement ${parent.statementIndex}.`);
  }
}

function findChild(
  parent: BlueprintTraceNodeInput,
  function_: BlueprintTraceFunctionInput,
  edge: string,
): BlueprintTraceNodeInput {
  const matches = function_.nodes.filter(
    (node) => node.parentNodeIndex === parent.nodeIndex && node.edge === edge,
  );
  if (matches.length !== 1) {
    throw new Error(
      `Expected one monthly-schedule child ${edge} at statement ${parent.statementIndex}.`,
    );
  }
  return matches[0]!;
}
