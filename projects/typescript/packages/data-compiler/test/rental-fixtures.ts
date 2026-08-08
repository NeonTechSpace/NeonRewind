import type { RentalArtifactIdentity } from "@neonrewind/core";

import type {
  RentalBlueprintBodiesArtifact,
  RentalEvidenceArtifact,
} from "../src/rental-inputs.ts";

export const rentalPackagePath =
  "RetroRewind/Content/VideoStore/core/blueprint/RentSystem/RentSystem.uasset";
export const rentalClassPath =
  "RetroRewind/Content/VideoStore/core/blueprint/RentSystem/RentSystem.RentSystem_C";
const feeStructPath =
  "RetroRewind/Content/VideoStore/core/blueprint/RentSystem/Fees.Fees";

const feeFields = [
  "Broken_5_C1FEAF1341F90006475B01B94B5079AE",
  "ConsoleBroken_12_B4793D3A40BF8BDC91FD35B4105F1693",
  "ConsoleLate_10_1326E6A34C65237C35667B88D7C972DA",
  "Late_3_6BD289B444BB8B56E87D128D260C2549",
  "Rewind_7_B80C9AFF4A03C0C5B9222088CEEB2842",
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
            name: "RentSystem_C",
            path: rentalClassPath,
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
              {
                name: "Fees Membeship",
                type: `Map<Int, Struct<${feeStructPath}>>`,
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
        userDefinedStructs: [],
      },
      {
        path: "RetroRewind/Content/VideoStore/core/blueprint/RentSystem/Fees.uasset",
        blueprintClasses: [],
        userDefinedStructs: [
          {
            name: "Fees",
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
        name: "RentSystem_C",
        path: rentalClassPath,
        functions: [
          createFunction("Is this console ready to come back from rent", 9),
          createFunction("Get Console Rent ready for return", 34),
          createFunction("Add Fees to Membership", 14),
          createFunction("Remove Fees to Membership", 5),
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
          "",
          "    // (Public, BlueprintCallable, BlueprintEvent)",
          "    public void Add Fees to Membership(int Membership ID, struct FFees Fees)",
          "    {",
          "        CallFunc_NotEqual_IntInt_ReturnValue = (Membership ID !== 0);",
          "        if (!CallFunc_NotEqual_IntInt_ReturnValue)",
          "            return;",
          "        Map_Find(Fees Membeship, Membership ID, CallFunc_Map_Find_Value)",
          `        CallFunc_Map_Find_Value.${feeFields[3]} + Fees.${feeFields[3]}`,
          `        CallFunc_Map_Find_Value.${feeFields[0]} + Fees.${feeFields[0]}`,
          `        CallFunc_Map_Find_Value.${feeFields[4]} + Fees.${feeFields[4]}`,
          `        K2Node_MakeStruct_Fees.${feeFields[3]} = CallFunc_Add_IntInt_ReturnValue`,
          `        K2Node_MakeStruct_Fees.${feeFields[0]} = CallFunc_Add_IntInt_ReturnValue_2`,
          `        K2Node_MakeStruct_Fees.${feeFields[4]} = CallFunc_Add_IntInt_ReturnValue_1`,
          `        K2Node_MakeStruct_Fees.${feeFields[2]} = 0`,
          `        K2Node_MakeStruct_Fees.${feeFields[1]} = 0`,
          "        Map_Add(Fees Membeship, Membership ID, K2Node_MakeStruct_Fees)",
          "    }",
          "",
          "    // (Public, BlueprintCallable, BlueprintEvent)",
          "    public void Remove Fees to Membership(int Membership ID)",
          "    {",
          "        CallFunc_NotEqual_IntInt_ReturnValue = (Membership ID !== 0);",
          "        if (!CallFunc_NotEqual_IntInt_ReturnValue)",
          "            return;",
          "        Fees Membeship.Remove(Membership ID)",
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
