// Generated from src/contracts/acquisition/rental-function-trace.ts by pnpm contracts:generate. Do not edit.

export type Sha256 = string;
export type NonEmptyString = string;

export interface RentalFunctionTraceContract {
  artifactType: "rental-function-trace";
  build: BuildReference;
  rentalBlueprintBodies: InputIdentity;
  /**
   * @minItems 1
   */
  requestedFunctionPaths: [NonEmptyString, ...NonEmptyString[]];
  mappings: MappingIdentity;
  engine: EngineIdentity;
  extractor: ExtractorIdentity;
  totals: Totals;
  /**
   * @minItems 1
   */
  functions: [Function, ...Function[]];
}
export interface BuildReference {
  manifestSha256: Sha256;
  steamAppId: string;
  steamBuildId: string;
}
export interface InputIdentity {
  fileName: string;
  sizeBytes: number;
  sha256: Sha256;
}
export interface MappingIdentity {
  fileName: string;
  sizeBytes: number;
  sha256: Sha256;
  formatVersion: 4;
}
export interface EngineIdentity {
  version: "5.4";
  cue4ParseProfile: "GAME_UE5_4";
  source: "configured";
  confidence: "probable";
}
export interface ExtractorIdentity {
  name: "NeonRetroRewind.StaticExtractor";
  version: NonEmptyString;
  cue4ParseVersion: NonEmptyString;
}
export interface Totals {
  packageCount: number;
  classCount: number;
  functionCount: number;
  nodeCount: number;
  callCount: number;
  branchCount: number;
  entrypointCount: number;
}
export interface Function {
  packagePath: string;
  className: NonEmptyString;
  classPath: NonEmptyString;
  functionName: NonEmptyString;
  functionPath: NonEmptyString;
  flags: NonEmptyString;
  bytecodeExpressionCount: number;
  /**
   * @minItems 1
   */
  nodes: [Node, ...Node[]];
}
export interface Node {
  nodeIndex: number;
  parentNodeIndex: number | null;
  edge: NonEmptyString;
  depth: number;
  statementIndex: number;
  opcode: NonEmptyString;
  kind: "call" | "branch" | "literal" | "return" | "assignment" | "variable" | "context" | "operation";
  symbol: string | null;
  call: Call | null;
  jump: Jump | null;
  literal: Literal | null;
}
export interface Call {
  callKind: "virtual" | "local-virtual" | "final" | "local-final";
  functionName: NonEmptyString;
  argumentCount: number;
  integerArguments: IntegerArgument[];
}
export interface IntegerArgument {
  position: number;
  value: string;
}
export interface Jump {
  jumpKind:
    "unconditional" | "conditional-false" | "computed" | "push-flow" | "pop-flow" | "pop-flow-if-false" | "switch";
  targets: JumpTarget[];
}
export interface JumpTarget {
  edge: NonEmptyString;
  offset: number;
}
export interface Literal {
  literalType: "integer" | "number" | "string" | "name" | "boolean" | "null";
  value: string;
}
