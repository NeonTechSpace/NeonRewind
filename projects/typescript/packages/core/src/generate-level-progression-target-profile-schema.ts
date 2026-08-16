import { mkdir, writeFile } from "node:fs/promises";

import { LevelProgressionTargetProfileSchema } from "./contracts/config/level-progression-target-profile.ts";

const output = new URL(
  "../../../../game-data-exporter/schemas/config/level-progression-target-profile.schema.json",
  import.meta.url,
);
const json = `${JSON.stringify(LevelProgressionTargetProfileSchema.toJsonSchema(), undefined, 2)}\n`;

await mkdir(new URL(".", output), { recursive: true });
await writeFile(output, json, "utf8");
