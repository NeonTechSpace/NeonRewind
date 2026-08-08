import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { RentalArtifactIdentity } from "@neonrewind/core";

import { compileConsoleReturnMechanics } from "../src/console-return-mechanics.ts";
import type {
  RentalBlueprintBodiesArtifact,
  RentalEvidenceArtifact,
} from "../src/rental-inputs.ts";
import { validateJsonSchema } from "../src/schema-validation.ts";

const packagePath =
  "RetroRewind/Content/VideoStore/core/blueprint/RentSystem/RentSystem.uasset";
const classPath =
  "RetroRewind/Content/VideoStore/core/blueprint/RentSystem/RentSystem.RentSystem_C";

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
      functionName: "Get Console Rent ready for return",
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
    ">= Number of day a console is rented",
    "> Number of day a console is rented",
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
      "        >= Number of day a console is rented\n",
      "",
    )
    .replace(
      "        Console Base out for Rent.Remove(CallFunc_Array_Get_Item)\n",
      [
        "        Console Base out for Rent.Remove(CallFunc_Array_Get_Item)",
        "        >= Number of day a console is rented",
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
            name: "RentSystem_C",
            path: classPath,
            fields: [
              {
                name: "Console Base out for Rent",
                type: "Array<Object<Console_C>>",
                arrayDimension: 1,
              },
              {
                name: "Console Base out Ready to Return",
                type: "Array<Object<Console_C>>",
                arrayDimension: 1,
              },
            ],
            classDefault: {
              properties: [
                {
                  name: "Number of day a console is rented",
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
        name: "RentSystem_C",
        path: classPath,
        functions: [
          {
            name: "Is this console ready to come back from rent",
            path: `${classPath}:eligibility`,
            flags: "FUNC_Public",
            bytecodeExpressionCount: 9,
          },
          {
            name: "Get Console Rent ready for return",
            path: `${classPath}:queue`,
            flags: "FUNC_Public",
            bytecodeExpressionCount: 34,
          },
        ],
        pseudoCode: [
          "    // (Public, BlueprintCallable, BlueprintEvent)",
          "    public bool Is this console ready to come back from rent(class Console_C* Console to Test)",
          "    {",
          "        Weather Actor ref->Days Passed - Console to Test->The Game Day It Was Rent",
          "        >= Number of day a console is rented",
          "        ReturnValue = false",
          "    }",
          "",
          "    // (Public, BlueprintCallable, BlueprintEvent)",
          "    public void Get Console Rent ready for return()",
          "    {",
          "        Is this console ready to come back from rent(CallFunc_Array_Get_Item_1)",
          "        if (!CallFunc_Is_this_console_ready_to_come_back_from_rent_ReturnValue)",
          "        Console Base out Ready to Return.Add(CallFunc_Array_Get_Item_1)",
          "        Console Base out for Rent.Remove(CallFunc_Array_Get_Item)",
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
