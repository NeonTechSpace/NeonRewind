// Generated from src/contracts/acquisition/blueprint-call-target-trace.ts by pnpm contracts:generate. Do not edit.

export type Sha256 = string;
export type FileName = string;
export type NonEmptyString = string;

export interface BlueprintCallTargetTraceContract {
  artifactType: "blueprint-call-target-trace";
  build: BuildReference;
  sourceTrace: SourceTrace;
  declarations: DeclarationsInput;
  recordedCall: RecordedCall;
  binding: Binding;
  mappings: MappingIdentity;
  engine: EngineIdentity;
  extractor: ExtractorIdentity;
}
export interface BuildReference {
  manifestSha256: Sha256;
  steamAppId: string;
  steamBuildId: string;
}
export interface SourceTrace {
  fileName: FileName;
  sizeBytes: number;
  sha256: Sha256;
  artifactType: "blueprint-property-reference-trace";
  targetPropertyName: NonEmptyString;
}
export interface DeclarationsInput {
  fileName: FileName;
  sizeBytes: number;
  sha256: Sha256;
  artifactType: "blueprint-function-declarations";
  targetFunctionName: NonEmptyString;
  declarationRule: "exact-raw-function-export-object-name";
}
export interface RecordedCall {
  callerFunctionPath: NonEmptyString;
  statementIndex: number;
  opcode: string;
  call: Call;
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
export interface Binding {
  bindingRule: "exact-context-object-class-and-declaration";
  relationship: "verified";
  receiverClassMatchesDeclarationOwner: true;
  argumentCountMatchesParameterCount: true;
  receiver: Receiver;
  declaration: TargetDeclaration;
  function: Function;
}
export interface Receiver {
  contextStatementIndex: number;
  contextOpcode: "EX_Context";
  callEdge: "ContextExpression";
  receiverStatementIndex: number;
  receiverOpcode: "EX_ObjectConst";
  receiverEdge: "ObjectExpression";
  objectName: NonEmptyString;
  objectPath: NonEmptyString;
  classPath: NonEmptyString;
  exportType: NonEmptyString;
}
export interface TargetDeclaration {
  packagePath: string;
  packageExportIndex: number;
  objectPath: NonEmptyString;
  ownerPath: NonEmptyString;
  signature: Signature;
}
export interface Signature {
  parameterCount: number;
  parameters: Parameter[];
}
export interface Parameter {
  position: number;
  name: NonEmptyString;
  type: NonEmptyString;
  arrayDimension: number;
  flags: NonEmptyString;
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
  edge: string;
  depth: number;
  statementIndex: number;
  opcode: string;
  kind: "call" | "branch" | "literal" | "return" | "assignment" | "variable" | "context" | "operation";
  symbol: string | null;
  call: Call | null;
  jump: Jump | null;
  literal: Literal | null;
}
export interface Jump {
  jumpKind:
    "unconditional" | "conditional-false" | "computed" | "push-flow" | "pop-flow" | "pop-flow-if-false" | "switch";
  targets: JumpTarget[];
}
export interface JumpTarget {
  edge: string;
  offset: number;
}
export interface Literal {
  literalType: "integer" | "number" | "string" | "name" | "boolean" | "null";
  value: string;
}
export interface MappingIdentity {
  fileName: FileName;
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
