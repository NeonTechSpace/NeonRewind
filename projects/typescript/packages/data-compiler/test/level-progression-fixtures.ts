import type { GameplayUnlockEnum, LevelProgression } from "@neonretrorewind/core";

import type {
  BlueprintCallTargetTraceArtifact,
  BlueprintFunctionTraceArtifact,
  BlueprintPropertyReferenceTraceArtifact,
  BlueprintTraceFunctionInput,
  BlueprintTraceNodeInput,
} from "../src/blueprint-trace-inputs.ts";
import type {
  LevelProgressionSources,
  LevelStructuredValuesArtifact,
} from "../src/level-progression.ts";
import {
  changeXpFunctionName,
  cumulativeFunctionName,
  endOfDayClassPath,
  endOfDayEventGraphName,
  experienceClassPath,
  gameModeClassPath,
  gameModeEventGraphName,
  initAnimationFunctionName,
  maximumFunctionName,
  requirementFunctionName,
} from "../src/level-progression-traces.ts";
import { createBuild, createMappings, type Mutable } from "./rental-fixtures.ts";

const xpTablePath =
  "ExampleGame/Content/ExampleProject/core/gamesettings/ExampleThresholdTable.uasset";
const xpTableObjectPath =
  "ExampleGame/Content/ExampleProject/core/gamesettings/ExampleThresholdTable.ExampleThresholdTable";

export const levelProgressionSources: LevelProgressionSources = {
  structuredValues: identity("structured-values.json", "structured-values", "a"),
  gameplayUnlockEnum: identity(
    "gameplay-unlock-enum.json",
    "gameplay-unlock-enum",
    "f",
  ),
  changeXpTrace: identity(
    "blueprint-function-trace.change-xp.json",
    "blueprint-function-trace",
    "b",
  ),
  maximumCallerTrace: identity(
    "blueprint-property-reference-trace.maximum-xp.json",
    "blueprint-property-reference-trace",
    "c",
  ),
  maximumTargetTrace: identity(
    "blueprint-call-target-trace.maximum-xp.json",
    "blueprint-call-target-trace",
    "d",
  ),
  endOfDayTrace: identity(
    "blueprint-property-reference-trace.end-of-day.json",
    "blueprint-property-reference-trace",
    "e",
  ),
};

interface StructuredValuesOptions {
  readonly duplicateLevel?: boolean;
  readonly mismatchRowKey?: boolean;
  readonly nonPositiveXp?: boolean;
  readonly unexpectedField?: boolean;
}

export function createLevelStructuredValues(
  options: StructuredValuesOptions = {},
): Mutable<LevelStructuredValuesArtifact> {
  const xp = [10, 20, 30];
  return {
    artifactType: "structured-values",
    build: createBuild(),
    mappings: createMappings(),
    engine: engine(),
    dataTables: [
      {
        path: xpTablePath,
        name: "ExampleThresholdTable",
        type: "DataTable",
        rowStruct: "ExampleThresholdStruct",
        rows: xp.map((requiredXp, index) => ({
          key: options.mismatchRowKey && index === 1 ? "wrong" : String(index),
          values: {
            ExampleLevel_test: options.duplicateLevel && index === 1 ? 0 : index,
            ExampleUnlocks_test: [gameplayUnlockInternalName(index)],
            ExampleMovieCategories_test: [],
            ExampleGameCategories_test: [],
            ExampleRequiredProgress_test:
              options.nonPositiveXp && index === 1 ? 0 : requiredXp,
            ...(options.unexpectedField && index === 1 ? { Unexpected_test: 1 } : {}),
          },
        })),
      },
    ],
  };
}

export function createGameplayUnlockEnum(): Mutable<GameplayUnlockEnum> {
  return {
    artifactType: "gameplay-unlock-enum",
    build: createBuild(),
    staticCensus: {
      fileName: "static-census.v1.json",
      sizeBytes: 100,
      sha256: "1".repeat(64),
    },
    mappings: createMappings(),
    engine: engine(),
    extractor: {
      name: "NeonRetroRewind.StaticExtractor",
      version: "0.0.5",
      cue4ParseVersion: "1.2.2.202607",
    },
    source: {
      packagePath:
        "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockKind.uasset",
      objectPath:
        "ExampleGame/Content/ExampleProject/core/blueprint/research/ExampleUnlockKind.ExampleUnlockKind",
      enumName: "ExampleUnlockKind",
      cppForm: "Namespaced",
      underlyingType: "int64",
    },
    totals: { enumeratorCount: 4 },
    enumerators: [0, 1, 2, 3].map((value) => ({
      value,
      internalName: gameplayUnlockInternalName(value),
      displayName: `Fixture unlock ${value}`,
    })),
  };
}

function gameplayUnlockInternalName(value: number): string {
  return `ExampleUnlockKind::Value${value}`;
}

export function createChangeXpTrace(): Mutable<BlueprintFunctionTraceArtifact> {
  const nodes: Mutable<BlueprintTraceNodeInput>[] = [];
  addVariableAssignment(nodes, 5, "Local Xp modification", "Example Progress Delta");
  addCall(nodes, 50, "Add_IntInt", "final", [
    "Example Lifetime Progress",
    "Local Xp modification",
  ]);
  addVariableAssignment(
    nodes,
    78,
    "Example Lifetime Progress",
    "ExampleSymbol_fbf99360b7d0",
  );
  addCall(nodes, 123, "Add_IntInt", "final", [
    "Local Xp modification",
    "Example Current Progress",
  ]);
  addCall(nodes, 169, "Min", "final", [
    "ExampleSymbol_68a76c00e78c",
    "Example Progress Limit",
  ]);
  addVariableAssignment(nodes, 197, "Example Current Progress", "ExampleSymbol_560a86c90290");
  addCall(nodes, 246, "Apply Example Progress Value", "local-virtual", [
    "Local Xp modification",
    "Example Current Progress",
  ]);
  addCall(nodes, 388, "ExampleAccumulateProgress", "local-virtual", [
    "Local Xp modification",
  ]);
  const function_ = traceFunction(
    gameModeClassPath,
    changeXpFunctionName,
    nodes,
  );
  return {
    artifactType: "blueprint-function-trace",
    build: createBuild(),
    callerBodies: [
      {
        fileName: "blueprint-caller-bodies.change-xp.json",
        sizeBytes: 100,
        sha256: "f".repeat(64),
        targetFunctionName: "ExampleAccumulateProgress",
      },
    ],
    mappings: createMappings(),
    engine: engine(),
    extractor: extractor(),
    totals: totals([function_]),
    functions: [function_],
  };
}

export function createMaximumCallerTrace(): Mutable<BlueprintPropertyReferenceTraceArtifact> {
  const changeXp = placeholderFunction(gameModeClassPath, changeXpFunctionName);
  const nodes: Mutable<BlueprintTraceNodeInput>[] = [];
  const context = addRoot(nodes, 30993, "EX_Context", "context", "None");
  addLiteral(
    nodes,
    context,
    "ObjectExpression",
    30994,
    "EX_ObjectConst",
    "object",
    "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleProgression.Default__ExampleProgression_C",
  );
  const call = addNode(
    nodes,
    context,
    "ContextExpression",
    31015,
    "EX_LocalVirtualFunction",
    "call",
  );
  call.call = callValue("local-virtual", maximumFunctionName, 2);
  addNode(nodes, call, "Parameters[0]", 31028, "EX_Self", "variable", "self");
  addNode(
    nodes,
    call,
    "Parameters[1]",
    31029,
    "EX_LocalVariable",
    "variable",
    "ExampleSymbol_9f8e94efa4bd",
  );
  addVariableAssignment(
    nodes,
    31039,
    "Example Progress Limit",
    "ExampleSymbol_9f8e94efa4bd",
  );
  const eventGraph = traceFunction(
    gameModeClassPath,
    gameModeEventGraphName,
    nodes,
  );
  const paths = [changeXp.functionPath, eventGraph.functionPath];
  return {
    artifactType: "blueprint-property-reference-trace",
    build: createBuild(),
    blueprintPropertyReferences: {
      fileName: "blueprint-property-references.maximum-xp.json",
      sizeBytes: 100,
      sha256: "1".repeat(64),
      targetPropertyName: "Example Progress Limit",
    },
    requestedFunctionPaths: paths,
    selectionRule: "explicit-functions-with-recorded-references",
    mappings: createMappings(),
    engine: engine(),
    extractor: extractor(),
    totals: totals([changeXp, eventGraph]),
    functions: [changeXp, eventGraph],
  };
}

export function createMaximumTargetTrace(): Mutable<BlueprintCallTargetTraceArtifact> {
  const function_ = createMaximumFunction();
  const functionPath = `${experienceClassPath}:${maximumFunctionName}`;
  const signature = {
    parameterCount: 2,
    parameters: [
      parameter(0, "__WorldContext", "Object</Script/CoreUObject.Object>", "Parm"),
      parameter(1, "Example Required Progress", "Int", "Parm, OutParm"),
    ],
  };
  return {
    artifactType: "blueprint-call-target-trace",
    build: createBuild(),
    sourceTrace: {
      ...levelProgressionSources.maximumCallerTrace,
      targetPropertyName: "Example Progress Limit",
    },
    declarations: {
      fileName: "blueprint-function-declarations.maximum-xp.json",
      sizeBytes: 100,
      sha256: "2".repeat(64),
      artifactType: "blueprint-function-declarations",
      targetFunctionName: maximumFunctionName,
      declarationRule: "exact-raw-function-export-object-name",
    },
    recordedCall: {
      callerFunctionPath: `${gameModeClassPath}:${gameModeEventGraphName}`,
      statementIndex: 31015,
      opcode: "EX_LocalVirtualFunction",
      call: {
        callKind: "local-virtual",
        functionName: maximumFunctionName,
        argumentCount: 2,
        integerArguments: [],
      },
    },
    binding: {
      bindingRule: "exact-context-object-class-and-declaration",
      relationship: "verified",
      receiverClassMatchesDeclarationOwner: true,
      argumentCountMatchesParameterCount: true,
      receiver: {
        contextStatementIndex: 30993,
        contextOpcode: "EX_Context",
        callEdge: "ContextExpression",
        receiverStatementIndex: 30994,
        receiverOpcode: "EX_ObjectConst",
        receiverEdge: "ObjectExpression",
        objectName: "Default__ExampleProgression_C",
        objectPath:
          "ExampleGame/Content/ExampleProject/core/blueprint/example/ExampleProgression.Default__ExampleProgression_C",
        classPath: experienceClassPath,
        exportType: "ExampleProgression_C",
      },
      declaration: {
        packagePath:
          "ExampleGame/Content/ExampleProject/core/blueprint/experience/ExampleProgression.uasset",
        packageExportIndex: 4,
        objectPath: functionPath,
        ownerPath: experienceClassPath,
        signature,
      },
      function: function_,
    },
    mappings: createMappings(),
    engine: engine(),
    extractor: extractor(),
  };
}

export function createEndOfDayTrace(): Mutable<BlueprintPropertyReferenceTraceArtifact> {
  const functions = [
    placeholderFunction(
      endOfDayClassPath,
      "ExampleApplyProgressRewards",
    ),
    createEndOfDayEventGraph(),
    createInitAnimationFunction(),
    createRequirementFunction(),
    createCumulativeFunction(),
  ];
  const paths = functions.map((function_) => function_.functionPath);
  return {
    artifactType: "blueprint-property-reference-trace",
    build: createBuild(),
    blueprintPropertyReferences: {
      fileName: "blueprint-property-references.level.json",
      sizeBytes: 100,
      sha256: "3".repeat(64),
      targetPropertyName: "ExampleLevel",
    },
    requestedFunctionPaths: paths,
    selectionRule: "explicit-functions-with-recorded-references",
    mappings: createMappings(),
    engine: engine(),
    extractor: extractor(),
    totals: totals(functions),
    functions,
  };
}

function createMaximumFunction(): Mutable<BlueprintTraceFunctionInput> {
  const nodes: Mutable<BlueprintTraceNodeInput>[] = [];
  addObjectAssignment(nodes, 99, "ExampleProgressTable", xpTableObjectPath);
  addCallWithLiteral(
    nodes,
    136,
    "GetDataTableColumnAsString",
    "final",
    2,
    1,
    "name",
    "ExampleRequiredProgress",
  );
  addCall(nodes, 254, "Array_Length", "final", [
    "ExampleSymbol_d75d2a8b4564",
  ]);
  addCall(nodes, 283, "Less_IntInt", "final", [
    "Temp_int_Loop_Counter_Variable",
    "ExampleSymbol_5546bd5cfb37",
  ]);
  addJump(nodes, 311, "conditional-false", "codeOffset", 555);
  addCall(nodes, 379, "Array_Get", "final", [
    "ExampleSymbol_d75d2a8b4564",
    "Temp_int_Array_Index_Variable",
    "ExampleSymbol_4bb2d3edf81f",
  ]);
  addCall(nodes, 434, "Conv_StringToInt", "final", [
    "ExampleSymbol_4bb2d3edf81f",
  ]);
  addCall(nodes, 471, "Add_IntInt", "final", [
    "ExampleSymbol_abfd6d199e8b",
    "Accumulated XP",
  ]);
  addVariableAssignment(
    nodes,
    499,
    "Accumulated XP",
    "ExampleSymbol_68a76c00e78c",
  );
  addCallWithLiteral(nodes, 605, "Add_IntInt", "final", 2, 1, "integer", "1");
  addJump(nodes, 656, "unconditional", "codeOffset", 214);
  addVariableAssignment(nodes, 555, "Example Required Progress", "Accumulated XP");
  return traceFunction(experienceClassPath, maximumFunctionName, nodes);
}

function createRequirementFunction(): Mutable<BlueprintTraceFunctionInput> {
  const nodes: Mutable<BlueprintTraceNodeInput>[] = [];
  addCallWithLiteral(
    nodes,
    18,
    "GetDataTableColumnAsString",
    "final",
    2,
    1,
    "name",
    "ExampleRequiredProgress",
  );
  addCallWithLiteral(
    nodes,
    196,
    "GreaterEqual_IntInt",
    "final",
    2,
    1,
    "integer",
    "3",
  );
  addLiteralAssignment(nodes, 234, "ExampleLevel", "integer", "99999");
  addJump(nodes, 150, "conditional-false", "codeOffset", 390);
  addCall(nodes, 412, "Array_Get", "final", [
    "ExampleSymbol_d75d2a8b4564",
    "ExampleCurrentTier",
    "ExampleSymbol_4bb2d3edf81f",
  ]);
  addCall(nodes, 467, "Conv_StringToInt", "final", [
    "ExampleSymbol_4bb2d3edf81f",
  ]);
  addVariableAssignment(
    nodes,
    486,
    "ExampleLevel",
    "ExampleSymbol_abfd6d199e8b",
  );
  return traceFunction(endOfDayClassPath, requirementFunctionName, nodes);
}

function createCumulativeFunction(): Mutable<BlueprintTraceFunctionInput> {
  const nodes: Mutable<BlueprintTraceNodeInput>[] = [];
  addCallWithLiteral(
    nodes,
    140,
    "GetDataTableColumnAsString",
    "final",
    2,
    1,
    "name",
    "ExampleLevel",
  );
  addCallWithLiteral(
    nodes,
    190,
    "GetDataTableColumnAsString",
    "final",
    2,
    1,
    "name",
    "ExampleRequiredProgress",
  );
  addCall(nodes, 348, "Array_Length", "final", [
    "ExampleSymbol_d75d2a8b4564",
  ]);
  addCall(nodes, 511, "Array_Get", "final", [
    "ExampleSymbol_d75d2a8b4564",
    "Temp_int_Array_Index_Variable",
    "ExampleSymbol_4bb2d3edf81f",
  ]);
  addCall(nodes, 603, "Add_IntInt", "final", [
    "ExampleSymbol_abfd6d199e8b",
    "Accumulated XP",
  ]);
  addCall(nodes, 668, "GreaterEqual_IntInt", "final", [
    "Temp_int_Array_Index_Variable",
    "local Level",
  ]);
  addVariableAssignment(nodes, 746, "Example Required Progress", "Accumulated XP");
  return traceFunction(endOfDayClassPath, cumulativeFunctionName, nodes);
}

function createInitAnimationFunction(): Mutable<BlueprintTraceFunctionInput> {
  const nodes: Mutable<BlueprintTraceNodeInput>[] = [];
  addCall(nodes, 230, cumulativeFunctionName, "local-virtual", [
    "ExampleLevel",
    "ExampleSymbol_a7c13f9116b9",
  ], ["context", "variable"]);
  addCall(nodes, 375, cumulativeFunctionName, "local-virtual", [
    "ExampleSymbol_e786ddbe8538",
    "ExampleSymbol_526ef20c98db",
  ]);
  addCall(nodes, 452, "Subtract_IntInt", "final", [
    "Example Current Progress",
    "ExampleDailyProgress",
  ], ["context", "context"]);
  addCall(nodes, 586, "Subtract_IntInt", "final", [
    "ExampleSymbol_0e5eff394dbb",
    "Example Cumulative Progress",
  ]);
  addVariableAssignment(
    nodes,
    895,
    "ExampleInitialProgress",
    "ExampleSymbol_c65df1df8c08",
  );
  addVariableAssignment(nodes, 922, "Example Remaining Progress", "ExampleDailyProgress", "context");
  return traceFunction(endOfDayClassPath, initAnimationFunctionName, nodes);
}

function createEndOfDayEventGraph(): Mutable<BlueprintTraceFunctionInput> {
  const nodes: Mutable<BlueprintTraceNodeInput>[] = [];
  addLiteralAssignment(
    nodes,
    15,
    "ExampleProgressFraction",
    "number",
    "0",
  );
  addCallWithLiteral(
    nodes,
    114,
    "Subtract_IntInt",
    "final",
    2,
    1,
    "integer",
    "1",
  );
  addCall(nodes, 160, requirementFunctionName, "local-virtual", [
    "ExampleSymbol_0e5eff394dbb",
    "ExampleSymbol_c98aa86e91ba",
  ]);
  addCall(nodes, 210, "FFloor", "final", ["ExampleInitialProgress"]);
  addCall(nodes, 247, "Subtract_IntInt", "final", [
    "ExampleSymbol_c98aa86e91ba",
    "ExampleSymbol_b4e18586ed51",
  ]);
  addCall(nodes, 293, "Subtract_IntInt", "final", [
    "Example Remaining Progress",
    "ExampleSymbol_d33b763b6534",
  ]);
  addVariableAssignment(
    nodes,
    321,
    "Example Remaining Progress",
    "ExampleSymbol_be6409e14ce2",
  );
  addLiteralAssignment(nodes, 348, "ExampleInitialProgress", "number", "0");
  addCall(nodes, 375, requirementFunctionName, "local-virtual", [
    "ExampleLevel",
    "ExampleSymbol_2b6c8e733724",
  ], ["context", "variable"]);
  addCallWithLiteral(nodes, 576, "Add_IntInt", "final", 2, 1, "integer", "1");
  addVariableAssignment(nodes, 622, "ExampleLevel", "ExampleSymbol_fbf99360b7d0");
  addDelay(nodes, 953, "Delay", 3, 15);
  addDelay(nodes, 1053, "DelayUntilNextTick", 2, 558);
  addDelay(nodes, 1508, "DelayUntilNextTick", 2, 1008);
  addCall(nodes, 2912, requirementFunctionName, "local-virtual", [
    "ExampleLevel",
    "ExampleSymbol_d226b81c5597",
  ], ["context", "variable"]);
  addCall(nodes, 4034, "Divide_DoubleDouble", "final", [
    "ExampleSymbol_05f5d19e94a0",
    "ExampleSymbol_c65df1df8c08",
  ]);
  const clamp = addCall(nodes, 4080, "FClamp", "final", [
    "ExampleSymbol_7fb9e119d7ae",
    "unused-min",
    "unused-max",
  ]);
  replaceParameterWithLiteral(nodes, clamp, 1, "number", "0");
  replaceParameterWithLiteral(nodes, clamp, 2, "number", "1");
  addVariableAssignment(
    nodes,
    4117,
    "ExampleProgressFraction",
    "ExampleSymbol_993c5cdf8035",
  );
  addCallWithLiteral(
    nodes,
    1786,
    "GreaterEqual_DoubleDouble",
    "final",
    2,
    1,
    "number",
    "1",
  );
  addJump(nodes, 1814, "conditional-false", "codeOffset", 1833);
  addJump(nodes, 1828, "unconditional", "codeOffset", 1488);
  addCallWithLiteral(
    nodes,
    1843,
    "GreaterEqual_DoubleDouble",
    "final",
    2,
    1,
    "number",
    "1",
  );
  addCallWithLiteral(
    nodes,
    1881,
    "LessEqual_IntInt",
    "final",
    2,
    1,
    "integer",
    "0",
  );
  addCall(nodes, 1915, "BooleanOR", "final", [
    "ExampleSymbol_a689c31c681f",
    "ExampleSymbol_a3f5a084342d",
  ]);
  addCall(nodes, 1953, "K2_ClearAndInvalidateTimerHandle", "final", [
    "self",
    "Example Progress Timer",
  ]);
  return traceFunction(endOfDayClassPath, endOfDayEventGraphName, nodes);
}

function traceFunction(
  classPath: string,
  functionName: string,
  nodes: Mutable<BlueprintTraceNodeInput>[],
): Mutable<BlueprintTraceFunctionInput> {
  const packageRoot = classPath.slice(0, classPath.lastIndexOf("."));
  return {
    packagePath: `${packageRoot}.uasset`,
    className: classPath.slice(classPath.lastIndexOf(".") + 1),
    classPath,
    functionName,
    functionPath: `${classPath}:${functionName}`,
    flags: "FUNC_Public, FUNC_BlueprintCallable",
    bytecodeExpressionCount: Math.max(1, nodes.length),
    nodes,
  };
}

function placeholderFunction(
  classPath: string,
  functionName: string,
): Mutable<BlueprintTraceFunctionInput> {
  const nodes: Mutable<BlueprintTraceNodeInput>[] = [];
  addRoot(nodes, 0, "EX_EndOfScript", "operation");
  return traceFunction(classPath, functionName, nodes);
}

function addVariableAssignment(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  statementIndex: number,
  target: string,
  source: string,
  sourceKind: BlueprintTraceNodeInput["kind"] = "variable",
): Mutable<BlueprintTraceNodeInput> {
  const assignment = addRoot(nodes, statementIndex, "EX_Let", "assignment", target);
  addNode(
    nodes,
    assignment,
    "Assignment",
    childStatement(nodes, statementIndex),
    sourceKind === "context" ? "EX_Context" : "EX_LocalVariable",
    sourceKind,
    source,
  );
  return assignment;
}

function addLiteralAssignment(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  statementIndex: number,
  target: string,
  literalType: NonNullable<BlueprintTraceNodeInput["literal"]>["literalType"],
  value: string,
): void {
  const assignment = addRoot(nodes, statementIndex, "EX_Let", "assignment", target);
  addLiteral(
    nodes,
    assignment,
    "Assignment",
    childStatement(nodes, statementIndex),
    literalType === "number" ? "EX_DoubleConst" : "EX_IntConst",
    literalType,
    value,
  );
}

function addObjectAssignment(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  statementIndex: number,
  target: string,
  objectPath: string,
): void {
  const assignment = addRoot(nodes, statementIndex, "EX_LetObj", "assignment");
  addNode(
    nodes,
    assignment,
    "Variable",
    childStatement(nodes, statementIndex),
    "EX_LocalVariable",
    "variable",
    target,
  );
  addLiteral(
    nodes,
    assignment,
    "Assignment",
    childStatement(nodes, statementIndex),
    "EX_ObjectConst",
    "object",
    objectPath,
  );
}

function addCall(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  statementIndex: number,
  functionName: string,
  callKind: NonNullable<BlueprintTraceNodeInput["call"]>["callKind"],
  symbols: readonly string[],
  kinds: readonly BlueprintTraceNodeInput["kind"][] = symbols.map(
    () => "variable" as const,
  ),
): Mutable<BlueprintTraceNodeInput> {
  const call = addRoot(nodes, statementIndex, "EX_CallMath", "call");
  call.call = callValue(callKind, functionName, symbols.length);
  for (const [position, symbol] of symbols.entries()) {
    const kind = kinds[position] ?? "variable";
    addNode(
      nodes,
      call,
      `Parameters[${position}]`,
      childStatement(nodes, statementIndex),
      kind === "context" ? "EX_Context" : "EX_LocalVariable",
      kind,
      symbol,
    );
  }
  return call;
}

function addCallWithLiteral(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  statementIndex: number,
  functionName: string,
  callKind: NonNullable<BlueprintTraceNodeInput["call"]>["callKind"],
  argumentCount: number,
  literalPosition: number,
  literalType: NonNullable<BlueprintTraceNodeInput["literal"]>["literalType"],
  value: string,
): Mutable<BlueprintTraceNodeInput> {
  const symbols = Array.from({ length: argumentCount }, (_, index) => `arg-${index}`);
  const call = addCall(nodes, statementIndex, functionName, callKind, symbols);
  replaceParameterWithLiteral(nodes, call, literalPosition, literalType, value);
  return call;
}

function replaceParameterWithLiteral(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  call: Mutable<BlueprintTraceNodeInput>,
  position: number,
  literalType: NonNullable<BlueprintTraceNodeInput["literal"]>["literalType"],
  value: string,
): void {
  const parameter = nodes.find(
    (node) =>
      node.parentNodeIndex === call.nodeIndex && node.edge === `Parameters[${position}]`,
  );
  if (parameter === undefined) {
    throw new Error("Missing fixture call parameter.");
  }
  parameter.kind = "literal";
  parameter.opcode = literalType === "name" ? "EX_NameConst" :
    literalType === "number" ? "EX_DoubleConst" : "EX_IntConst";
  parameter.symbol = null;
  parameter.literal = { literalType, value };
}

function addDelay(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  statementIndex: number,
  functionName: string,
  argumentCount: number,
  target: number,
): void {
  const call = addCall(
    nodes,
    statementIndex,
    functionName,
    "final",
    Array.from({ length: argumentCount }, (_, index) => `delay-${index}`),
  );
  const struct = addNode(
    nodes,
    call,
    "LatentInfo",
    childStatement(nodes, statementIndex),
    "EX_StructConst",
    "literal",
  );
  addLiteral(
    nodes,
    struct,
    "Properties[0]",
    childStatement(nodes, statementIndex),
    "EX_SkipOffsetConst",
    "integer",
    String(target),
  );
}

function addJump(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  statementIndex: number,
  jumpKind: NonNullable<BlueprintTraceNodeInput["jump"]>["jumpKind"],
  edge: string,
  offset: number,
): void {
  const jump = addRoot(nodes, statementIndex, "EX_Jump", "branch");
  jump.jump = { jumpKind, targets: [{ edge, offset }] };
}

function addLiteral(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  parent: Mutable<BlueprintTraceNodeInput>,
  edge: string,
  statementIndex: number,
  opcode: string,
  literalType: NonNullable<BlueprintTraceNodeInput["literal"]>["literalType"],
  value: string,
): Mutable<BlueprintTraceNodeInput> {
  const literal = addNode(nodes, parent, edge, statementIndex, opcode, "literal");
  literal.literal = { literalType, value };
  return literal;
}

function addRoot(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  statementIndex: number,
  opcode: string,
  kind: BlueprintTraceNodeInput["kind"],
  symbol: string | null = null,
): Mutable<BlueprintTraceNodeInput> {
  return addNode(
    nodes,
    null,
    `script[${nodes.filter((node) => node.parentNodeIndex === null).length}]`,
    statementIndex,
    opcode,
    kind,
    symbol,
  );
}

function addNode(
  nodes: Mutable<BlueprintTraceNodeInput>[],
  parent: Mutable<BlueprintTraceNodeInput> | null,
  edge: string,
  statementIndex: number,
  opcode: string,
  kind: BlueprintTraceNodeInput["kind"],
  symbol: string | null = null,
): Mutable<BlueprintTraceNodeInput> {
  const node: Mutable<BlueprintTraceNodeInput> = {
    nodeIndex: nodes.length,
    parentNodeIndex: parent?.nodeIndex ?? null,
    edge,
    depth: parent === null ? 0 : parent.depth + 1,
    statementIndex,
    opcode,
    kind,
    symbol,
    call: null,
    jump: null,
    literal: null,
  };
  nodes.push(node);
  return node;
}

function childStatement(
  nodes: readonly Mutable<BlueprintTraceNodeInput>[],
  rootStatement: number,
): number {
  let candidate = rootStatement + 1;
  const used = new Set(nodes.map((node) => node.statementIndex));
  while (used.has(candidate)) {
    candidate++;
  }
  return candidate;
}

function callValue(
  callKind: NonNullable<BlueprintTraceNodeInput["call"]>["callKind"],
  functionName: string,
  argumentCount: number,
): NonNullable<Mutable<BlueprintTraceNodeInput>["call"]> {
  return { callKind, functionName, argumentCount, integerArguments: [] };
}

function parameter(
  position: number,
  name: string,
  type: string,
  flags: string,
) {
  return { position, name, type, arrayDimension: 1, flags };
}

function totals(functions: readonly Mutable<BlueprintTraceFunctionInput>[]) {
  const nodes = functions.flatMap((function_) => function_.nodes);
  return {
    packageCount: 1,
    classCount: 1,
    functionCount: functions.length,
    nodeCount: nodes.length,
    callCount: nodes.filter((node) => node.call !== null).length,
    branchCount: nodes.filter((node) => node.jump !== null).length,
    entrypointCount: 0,
  };
}

function engine() {
  return {
    version: "5.4" as const,
    cue4ParseProfile: "GAME_UE5_4" as const,
    source: "configured" as const,
    confidence: "probable" as const,
  };
}

function extractor() {
  return {
    name: "NeonRetroRewind.StaticExtractor" as const,
    version: "0.0.4",
    cue4ParseVersion: "1.2.2.202607",
  };
}

function identity<
  ArtifactType extends LevelProgression["sources"][keyof LevelProgression["sources"]]["artifactType"],
>(
  fileName: string,
  artifactType: ArtifactType,
  hashCharacter: string,
): Extract<
  LevelProgression["sources"][keyof LevelProgression["sources"]],
  { readonly artifactType: ArtifactType }
> {
  return {
    fileName,
    artifactType,
    sizeBytes: 100,
    sha256: hashCharacter.repeat(64),
  } as Extract<
    LevelProgression["sources"][keyof LevelProgression["sources"]],
    { readonly artifactType: ArtifactType }
  >;
}
