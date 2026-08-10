import type {
  BlueprintFunctionTrace,
  RentalFunctionTrace,
  UnlockableManagerTrace,
} from "@neonretrorewind/core";

type RawBlueprintTraceFunction = BlueprintFunctionTrace["functions"][number];
export type BlueprintTraceNodeInput = RawBlueprintTraceFunction["nodes"][number];
export type BlueprintTraceFunctionInput = Omit<RawBlueprintTraceFunction, "nodes"> & {
  readonly nodes: readonly BlueprintTraceNodeInput[];
};
export type BlueprintFunctionTraceArtifact = Omit<
  BlueprintFunctionTrace,
  "callerBodies" | "functions"
> & {
  readonly callerBodies: readonly BlueprintFunctionTrace["callerBodies"][number][];
  readonly functions: readonly BlueprintTraceFunctionInput[];
};
export type RentalFunctionTraceArtifact = Omit<
  RentalFunctionTrace,
  "functions" | "requestedFunctionPaths"
> & {
  readonly requestedFunctionPaths: readonly string[];
  readonly functions: readonly BlueprintTraceFunctionInput[];
};
export type UnlockableManagerTraceArtifact = Pick<
  UnlockableManagerTrace,
  | "artifactType"
  | "build"
  | "unlockableImplementationSites"
  | "mappings"
  | "engine"
  | "extractor"
> & {
  readonly requestedFunctionPaths: readonly string[];
  readonly totals: BlueprintFunctionTrace["totals"];
  readonly functions: readonly BlueprintTraceFunctionInput[];
};
