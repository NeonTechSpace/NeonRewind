import { mkdir, writeFile } from "node:fs/promises";

import { MarketEvidenceTargetProfileSchema } from "./contracts/config/market-evidence-target-profile.ts";

const output = new URL(
  "../../../../game-data-exporter/schemas/config/market-evidence-target-profile.schema.json",
  import.meta.url,
);
const json = `${JSON.stringify(MarketEvidenceTargetProfileSchema.toJsonSchema(), undefined, 2)}\n`;

await mkdir(new URL(".", output), { recursive: true });
await writeFile(output, json, "utf8");
