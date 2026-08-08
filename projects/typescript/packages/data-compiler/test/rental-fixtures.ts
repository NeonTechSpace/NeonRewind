import type { RentalArtifactIdentity } from "@neonretrorewind/core";

import type {
  RentalBlueprintBodiesArtifact,
  RentalEvidenceArtifact,
} from "../src/rental-inputs.ts";

export const rentalPackagePath =
  "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.uasset";
export const rentalClassPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleQueueSystem.ExampleQueueSystem_C";
const feeStructPath =
  "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleFeeRecord.ExampleFeeRecord";

const feeFields = [
  "ExampleField04_0_00000000000000000000000000000000",
  "ExampleField05_0_00000000000000000000000000000000",
  "ExampleField06_0_00000000000000000000000000000000",
  "ExampleField09_0_00000000000000000000000000000000",
  "ExampleField13_0_00000000000000000000000000000000",
] as const;

export const rentalSources = {
  rentalEvidence: createIdentity("rental-evidence.v1.json", "rental-evidence"),
  rentalBlueprintBodies: createIdentity(
    "rental-blueprint-bodies.v1.json",
    "rental-blueprint-bodies",
  ),
} as const;

export function createRentalEvidence(): Mutable<RentalEvidenceArtifact> {
  return {
    artifactType: "rental-evidence",
    schemaVersion: 1,
    build: createBuild(),
    mappings: createMappings(),
    packages: [
      {
        path: rentalPackagePath,
        blueprintClasses: [
          {
            name: "ExampleQueueSystem_C",
            path: rentalClassPath,
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
              {
                name: "ExampleFeeMap",
                type: `Map<Int, Struct<${feeStructPath}>>`,
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
        userDefinedStructs: [],
      },
      {
        path: "ExampleGame/Content/ExampleProject/core/blueprint/ExampleQueueSystem/ExampleFeeRecord.uasset",
        blueprintClasses: [],
        userDefinedStructs: [
          {
            name: "ExampleFeeRecord",
            path: feeStructPath,
            fields: feeFields.map((name) => ({ name, type: "Int", arrayDimension: 1 })),
            defaults: feeFields.map((name) => ({
              name,
              type: "IntProperty",
              arrayIndex: 0,
              value: 0,
            })),
          },
        ],
      },
    ],
  };
}

export function createBlueprintBodies(): Mutable<RentalBlueprintBodiesArtifact> {
  return {
    artifactType: "rental-blueprint-bodies",
    schemaVersion: 1,
    build: createBuild(),
    mappings: createMappings(),
    classes: [
      {
        packagePath: rentalPackagePath,
        name: "ExampleQueueSystem_C",
        path: rentalClassPath,
        functions: [
          createFunction("Is Example Device Ready", 9),
          createFunction("Prepare Example Devices", 34),
          createFunction("ExampleAddFee", 14),
          createFunction("ExampleRemoveFee", 5),
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
          "",
          "    // (Public, BlueprintCallable, BlueprintEvent)",
          "    public void ExampleAddFee(int ExampleMemberKey, struct FExampleFeeRecord ExampleFeeRecord)",
          "    {",
          "        ExampleSymbol_78567b0964f3 = (ExampleMemberKey !== 0);",
          "        if (!ExampleSymbol_78567b0964f3)",
          "            return;",
          "        Map_Find(ExampleFeeMap, ExampleMemberKey, ExampleSymbol_c49af706dd70)",
          `        ExampleSymbol_c49af706dd70.${feeFields[3]} + ExampleFeeRecord.${feeFields[3]}`,
          `        ExampleSymbol_c49af706dd70.${feeFields[0]} + ExampleFeeRecord.${feeFields[0]}`,
          `        ExampleSymbol_c49af706dd70.${feeFields[4]} + ExampleFeeRecord.${feeFields[4]}`,
          `        ExampleConstructExampleFeeRecord.${feeFields[3]} = ExampleSymbol_fbf99360b7d0`,
          `        ExampleConstructExampleFeeRecord.${feeFields[0]} = ExampleSymbol_984af5b2d439`,
          `        ExampleConstructExampleFeeRecord.${feeFields[4]} = ExampleSymbol_68a76c00e78c`,
          `        ExampleConstructExampleFeeRecord.${feeFields[2]} = 0`,
          `        ExampleConstructExampleFeeRecord.${feeFields[1]} = 0`,
          "        Map_Add(ExampleFeeMap, ExampleMemberKey, ExampleConstructExampleFeeRecord)",
          "    }",
          "",
          "    // (Public, BlueprintCallable, BlueprintEvent)",
          "    public void ExampleRemoveFee(int ExampleMemberKey)",
          "    {",
          "        ExampleSymbol_78567b0964f3 = (ExampleMemberKey !== 0);",
          "        if (!ExampleSymbol_78567b0964f3)",
          "            return;",
          "        ExampleFeeMap.Remove(ExampleMemberKey)",
          "    }",
        ].join("\n"),
      },
    ],
  };
}

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

function createFunction(name: string, bytecodeExpressionCount: number) {
  return {
    name,
    path: `${rentalClassPath}:${name}`,
    flags: "FUNC_Public",
    bytecodeExpressionCount,
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

export type Mutable<T> = {
  -readonly [Key in keyof T]: T[Key] extends readonly (infer Item)[]
    ? Mutable<Item>[]
    : T[Key] extends object
      ? Mutable<T[Key]>
      : T[Key];
};
