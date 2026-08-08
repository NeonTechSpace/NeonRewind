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
              {
                name: "Cartridge Base out for Rent",
                type: "Array<Object<Cartridge_C>>",
                arrayDimension: 1,
              },
              {
                name: "Cartridge Base out Ready to Return",
                type: "Array<Object<Cartridge_C>>",
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
                {
                  name: "Weight Chance of Returning at least one Cartridge",
                  type: "FloatProperty",
                  arrayIndex: 0,
                  value: 0.8,
                },
                {
                  name: "Weight Chance of Returning more Cartridge",
                  type: "FloatProperty",
                  arrayIndex: 0,
                  value: 0.3,
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
          createFunction("Weather - New Day Event", 4),
          createFunction("Get Movie ready for return", 3),
          createFunction("ExecuteUbergraph_RentSystem", 108),
          createFunction("Get Random List Of Cartridges From Rent List", 36),
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
          "",
          "    // (Private, BlueprintCallable, BlueprintEvent)",
          "    private void Weather - New Day Event(int Day)",
          "    {",
          "        ExecuteUbergraph_RentSystem(1792);",
          "    }",
          "",
          "    // (Private, BlueprintCallable, BlueprintEvent)",
          "    private void Get Movie ready for return()",
          "    {",
          "        ExecuteUbergraph_RentSystem(2592);",
          "    }",
          "",
          "    // (Private, UbergraphFunction)",
          "    private void ExecuteUbergraph_RentSystem(int EntryPoint)",
          "    {",
          "        Label_1792:",
          "        Simulated New Day Event when SaveGame is Load = true;",
          "",
          "        Get Movie ready for return();",
          "    ",
          "        Get Console Rent ready for return();",
          "",
          "        Label_1832:",
          "        Array_Append(Cartridge Base out Ready to Return, Cartridge Base out for Rent);",
          "",
          "        Cartridge Base out for Rent.Clear();",
          "",
          "        Label_2592:",
          "        goto Label_1832;",
          "    }",
          "",
          "    // (Public, HasOutParms, BlueprintCallable, BlueprintEvent)",
          "    public void Get Random List Of Cartridges From Rent List(bool& Find a product, TArray<class Cartridge_C*>& Item founded)",
          "    {",
          "        List of Cartridge to return.Length",
          "        CallFunc_GreaterEqual_IntInt_ReturnValue_1 = (CallFunc_Array_Length_ReturnValue_3 >= 4);",
          "        Find a product = true;",
          "        Item founded = List of Cartridge to return;",
          "        Cartridge Base out for Rent.Length",
          "        CallFunc_GreaterEqual_IntInt_ReturnValue = (CallFunc_Array_Length_ReturnValue >= 3);",
          "        CallFunc_SelectFloat_B_ImplicitCast_1 = Cast<double>(Weight Chance of Returning at least one Cartridge);",
          "        CallFunc_SelectFloat_ReturnValue = (CallFunc_GreaterEqual_IntInt_ReturnValue ? 0.95 : CallFunc_SelectFloat_B_ImplicitCast_1);",
          "        List of Cartridge to return.Length",
          "        CallFunc_LessEqual_IntInt_ReturnValue = (CallFunc_Array_Length_ReturnValue_1 <= 0);",
          "        CallFunc_SelectFloat_B_ImplicitCast = Cast<double>(Weight Chance of Returning more Cartridge);",
          "        CallFunc_RandomBoolWithWeight_ReturnValue = UKismetMathLibrary::RandomBoolWithWeight(CallFunc_RandomBoolWithWeight_Weight_ImplicitCast);",
          "        Array_Random(Cartridge Base out Ready to Return, CallFunc_Array_Random_OutItem, CallFunc_Array_Random_OutIndex);",
          "        CallFunc_NotEqual_IntInt_ReturnValue = (CallFunc_Array_Random_OutIndex !== -1);",
          "        CallFunc_Array_AddUnique_ReturnValue = List of Cartridge to return.Add(CallFunc_Array_Random_OutItem);",
          "        CallFunc_Greater_IntInt_ReturnValue = (CallFunc_Array_Length_ReturnValue_2 > 0);",
          "        Item founded = TArray<Item founded>();",
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

export function createBuild() {
  return {
    manifestSha256: "c".repeat(64),
    manifestSchemaVersion: 1 as const,
    steamAppId: "3552140",
    steamBuildId: "23896268",
  };
}

export function createMappings() {
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
