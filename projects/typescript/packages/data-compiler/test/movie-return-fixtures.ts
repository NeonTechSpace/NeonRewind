import type { MovieReturnCallerArtifactIdentity } from "@neonretrorewind/core";

import type {
  BlueprintCallerBodiesArtifact,
  BlueprintCallSitesArtifact,
} from "../src/blueprint-caller-inputs.ts";
import type { MovieReturnSources } from "../src/movie-return-mechanics.ts";
import {
  createBuild,
  createMappings,
  rentalSources,
  type Mutable,
} from "./rental-fixtures.ts";

export const callerPackagePath =
  "ExampleGame/Content/ExampleProject/core/ai/pawn/ExampleActor.uasset";
export const callerClassPath =
  "ExampleGame/Content/ExampleProject/core/ai/pawn/ExampleActor.ExampleActor_C";
export const callerFunction = "Initialize Example Return";
const callerFunctionPath = `${callerClassPath}:${callerFunction}`;
const selectionFunction = "Select Example Items";
const statementIndexes = [465, 519] as const;

const callSiteIdentity = createCallerIdentity(
  "blueprint-call-sites.movie-return.v1.json",
  "blueprint-call-sites",
  "e",
  200,
);
const callerBodyIdentity = createCallerIdentity(
  "blueprint-caller-bodies.movie-return.v1.json",
  "blueprint-caller-bodies",
  "f",
  300,
);

export const movieReturnSources: MovieReturnSources = {
  ...rentalSources,
  blueprintCallSites: callSiteIdentity,
  blueprintCallerBodies: callerBodyIdentity,
};

export function createCallSites(): Mutable<BlueprintCallSitesArtifact> {
  const callSites = statementIndexes.map((statementIndex) => ({
    packagePath: callerPackagePath,
    className: "ExampleActor_C",
    classPath: callerClassPath,
    functionName: callerFunction,
    functionPath: callerFunctionPath,
    callKind: "local-virtual" as const,
    statementIndex,
  }));

  return {
    artifactType: "blueprint-call-sites",
    schemaVersion: 1,
    build: createBuild(),
    staticCensus: {
      fileName: "static-census.v1.json",
      sizeBytes: 100,
      sha256: "1".repeat(64),
      schemaVersion: 1,
    },
    mappings: createMappings(),
    target: { functionName: selectionFunction },
    candidateRule: "parsed-packages-with-function-exports",
    coverage: "complete",
    totals: {
      candidatePackageCount: 604,
      scannedPackageCount: 604,
      failedPackageCount: 0,
      classCount: 604,
      functionCount: 7527,
      callSiteCount: 2,
    },
    callSites,
    failures: [],
  };
}

export function createCallerBodies(): Mutable<BlueprintCallerBodiesArtifact> {
  const pseudoCode = [
    `    public void ${callerFunction}()`,
    "    {",
    "        Select Example Device(foundConsole, console);",
    "        if (!ExampleSymbol_f35fefb6cd59)",
    "            goto Label_399;",
    "        return;",
    "        Label_399:",
    `        ExampleSymbol_59b9daf98844->Actor Gatherer->ExampleQueueSystem->${selectionFunction}(foundMovies, movies);`,
    `        ref to Rent system->${selectionFunction}(foundMovies, movies);`,
    "        if (!ExampleSymbol_19b27f16b828)",
    "            return;",
    "        ExampleSymbol_5546bd5cfb37 = ExampleSymbol_701a289356d8.Length;",
    "        ExampleAddInventoryItem(current Cartridge in loop, false);",
    "        ref to Rent system->Remove Example Ready Item(current Cartridge in loop, removed);",
    "    }",
  ].join("\n");

  return {
    artifactType: "blueprint-caller-bodies",
    schemaVersion: 1,
    build: createBuild(),
    callSites: {
      fileName: callSiteIdentity.fileName,
      sizeBytes: callSiteIdentity.sizeBytes,
      sha256: callSiteIdentity.sha256,
      schemaVersion: 1,
    },
    mappings: createMappings(),
    target: { functionName: selectionFunction },
    totals: {
      packageCount: 1,
      classCount: 1,
      functionCount: 1,
      callSiteCount: 2,
      pseudoCodeCharacterCount: pseudoCode.length,
    },
    functions: [
      {
        packagePath: callerPackagePath,
        className: "ExampleActor_C",
        classPath: callerClassPath,
        functionName: callerFunction,
        functionPath: callerFunctionPath,
        flags: "FUNC_Public, FUNC_BlueprintCallable, FUNC_BlueprintEvent",
        bytecodeExpressionCount: 48,
        calls: statementIndexes.map((statementIndex) => ({
          callKind: "local-virtual" as const,
          statementIndex,
        })),
        pseudoCode,
      },
    ],
  };
}

function createCallerIdentity<
  ArtifactType extends MovieReturnCallerArtifactIdentity["artifactType"],
>(
  fileName: string,
  artifactType: ArtifactType,
  hashCharacter: string,
  sizeBytes: number,
): MovieReturnCallerArtifactIdentity<ArtifactType> {
  return {
    fileName,
    sha256: hashCharacter.repeat(64),
    sizeBytes,
    artifactType,
    schemaVersion: 1,
  };
}
