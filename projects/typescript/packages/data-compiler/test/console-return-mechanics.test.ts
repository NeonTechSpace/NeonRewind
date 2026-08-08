import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { RentalArtifactIdentity } from "@neonretrorewind/core";

import { compileConsoleReturnMechanics } from "../src/console-return-mechanics.ts";
import type {
  RentalBlueprintBodiesArtifact,
  RentalEvidenceArtifact,
} from "../src/rental-inputs.ts";
import { validateJsonSchema } from "../src/schema-validation.ts";

const packagePath =
  "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.uasset";
const classPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.ExampleQueueSystem_C";

const sources = {
  rentalEvidence: createIdentity("rental-evidence.v1.json", "rental-evidence"),
  rentalBlueprintBodies: createIdentity(
    "rental-blueprint-bodies.v1.json",
    "rental-blueprint-bodies",
  ),
} as const;

test("compiles normalized console-return facts with source locators", async () => {
  const mechanics = compileConsoleReturnMechanics(
    createRentalEvidence(),
    createBlueprintBodies(),
    sources,
  );

  assert.equal(mechanics.configuration.rentalDurationDays.value, 2);
  assert.equal(mechanics.eligibility.elapsedDays.operator, "greater-than-or-equal");
  assert.equal(mechanics.eligibility.missingWeatherActorResult, false);
  assert.deepEqual(mechanics.queueTransition, {
    when: "eligible",
    source: "rented",
    destination: "ready-to-return",
    removesFromSource: true,
    evidence: {
      artifactType: "rental-blueprint-bodies",
      classPath,
      functionName: "Prepare Example Devices",
    },
  });

  const schemaPath = new URL(
    "../../core/schemas/console-return-mechanics.v1.schema.json",
    import.meta.url,
  );
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  validateJsonSchema(mechanics, schema, "Console return mechanics");
});

test("rejects changed eligibility bytecode evidence", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode.replace(
    ">= Example Elapsed Periods",
    "> Example Elapsed Periods",
  );

  assert.throws(
    () => compileConsoleReturnMechanics(createRentalEvidence(), bodies, sources),
    /required static evidence/u,
  );
});

test("rejects eligibility evidence found only in another function", () => {
  const bodies = createBlueprintBodies();
  bodies.classes[0]!.pseudoCode = bodies.classes[0]!.pseudoCode
    .replace(
      "        >= Example Elapsed Periods\n",
      "",
    )
    .replace(
      "        Example Active Devices.Remove(ExampleSymbol_4bb2d3edf81f)\n",
      [
        "        Example Active Devices.Remove(ExampleSymbol_4bb2d3edf81f)",
        "        >= Example Elapsed Periods",
        "",
      ].join("\n"),
    );

  assert.throws(
    () => compileConsoleReturnMechanics(createRentalEvidence(), bodies, sources),
    /required static evidence/u,
  );
});

test("rejects source artifacts from different builds", () => {
  const bodies = createBlueprintBodies();
  bodies.build.steamBuildId = "different";

  assert.throws(
    () => compileConsoleReturnMechanics(createRentalEvidence(), bodies, sources),
    /same build and mappings/u,
  );
});

test("rejects a non-positive rental duration", () => {
  const evidence = createRentalEvidence();
  evidence.packages[0]!.blueprintClasses[0]!.classDefault.properties[0]!.value = 0;

  assert.throws(
    () => compileConsoleReturnMechanics(evidence, createBlueprintBodies(), sources),
    /positive integer default/u,
  );
});

function createIdentity(
  fileName: string,
  artifactType: RentalArtifactIdentity["artifactType"],
): RentalArtifactIdentity {
  return {
    fileName,
    sha256: artifactType === "rental-evidence" ? "a".repeat(64) : "b".repeat(64),
    sizeBytes: 100,
    artifactType,
    schemaVersion: 1,
  };
}

function createRentalEvidence(): Mutable<RentalEvidenceArtifact> {
  return {
    artifactType: "rental-evidence",
    schemaVersion: 1,
    build: createBuild(),
    mappings: createMappings(),
    packages: [
      {
        path: packagePath,
        blueprintClasses: [
          {
            name: "ExampleQueueSystem_C",
            path: classPath,
            fields: [
              {
                name: "Example Active Devices",
                type: "Array<Object<ExampleDevice_C>>",
                arrayDimension: 1,
              },
              {
                name: "Example Ready Devices",
                type: "Array<Object<ExampleDevice_C>>",
                arrayDimension: 1,
              },
            ],
            classDefault: {
              properties: [
                {
                  name: "Example Elapsed Periods",
                  type: "IntProperty",
                  arrayIndex: 0,
                  value: 2,
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function createBlueprintBodies(): Mutable<RentalBlueprintBodiesArtifact> {
  return {
    artifactType: "rental-blueprint-bodies",
    schemaVersion: 1,
    build: createBuild(),
    mappings: createMappings(),
    classes: [
      {
        packagePath,
        name: "ExampleQueueSystem_C",
        path: classPath,
        functions: [
          {
            name: "Is Example Device Ready",
            path: `${classPath}:eligibility`,
            flags: "FUNC_Public",
            bytecodeExpressionCount: 9,
          },
          {
            name: "Prepare Example Devices",
            path: `${classPath}:queue`,
            flags: "FUNC_Public",
            bytecodeExpressionCount: 34,
          },
        ],
        pseudoCode: [
          "    // (Public, BlueprintCallable, BlueprintEvent)",
          "    public bool Is Example Device Ready(class ExampleDevice_C* Console to Test)",
          "    {",
          "        Example Clock Reference->Example Period Count - Console to Test->Example Start Period",
          "        >= Example Elapsed Periods",
          "        ReturnValue = false",
          "    }",
          "",
          "    // (Public, BlueprintCallable, BlueprintEvent)",
          "    public void Prepare Example Devices()",
          "    {",
          "        Is Example Device Ready(ExampleSymbol_38f1ea380eae)",
          "        if (!ExampleSymbol_991770ecc841)",
          "        Example Ready Devices.Add(ExampleSymbol_38f1ea380eae)",
          "        Example Active Devices.Remove(ExampleSymbol_4bb2d3edf81f)",
          "    }",
        ].join("\n"),
      },
    ],
  };
}

function createBuild() {
  return {
    manifestSha256: "c".repeat(64),
    manifestSchemaVersion: 1 as const,
    steamAppId: "3552140",
    steamBuildId: "23896268",
  };
}

function createMappings() {
  return {
    fileName: "mapping.usmap",
    sizeBytes: 100,
    sha256: "d".repeat(64),
    formatVersion: 4 as const,
  };
}

type Mutable<T> = {
  -readonly [Key in keyof T]: T[Key] extends readonly (infer Item)[]
    ? Mutable<Item>[]
    : T[Key] extends object
      ? Mutable<T[Key]>
      : T[Key];
};
