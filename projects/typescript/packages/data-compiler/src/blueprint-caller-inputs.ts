import type { BlueprintCallerBodies, BlueprintCallSites } from "@neonretrorewind/core";

export type BlueprintCallSiteInput = BlueprintCallSites["callSites"][number];
type BlueprintCallerFunction = BlueprintCallerBodies["functions"][number];
type BlueprintCallerFunctionInput = Omit<BlueprintCallerFunction, "calls"> & {
  readonly calls: readonly BlueprintCallerFunction["calls"][number][];
};
export type BlueprintCallSitesArtifact = Pick<
  BlueprintCallSites,
  | "artifactType"
  | "build"
  | "staticCensus"
  | "mappings"
  | "target"
  | "candidateRule"
  | "coverage"
  | "totals"
> & {
  readonly callSites: readonly BlueprintCallSiteInput[];
  readonly failures: readonly BlueprintCallSites["failures"][number][];
};
export type BlueprintCallerBodiesArtifact = Pick<
  BlueprintCallerBodies,
  | "artifactType"
  | "build"
  | "callSites"
  | "mappings"
  | "target"
  | "totals"
> & {
  readonly functions: readonly BlueprintCallerFunctionInput[];
};
