import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { writeImmutableArtifact } from "../src/immutable-artifact.ts";

test("creates an artifact, accepts identical content, and rejects different content", async () => {
  const directory = await mkdtemp(join(tmpdir(), "neonretrorewind-artifact-test-"));
  const outputPath = join(directory, "film-catalog.v1.json");

  try {
    assert.equal(await writeImmutableArtifact(outputPath, "first\n"), "created");
    assert.equal(await writeImmutableArtifact(outputPath, "first\n"), "unchanged");
    assert.equal(await writeImmutableArtifact(outputPath, "second\n"), "conflict");
    assert.equal(await readFile(outputPath, "utf8"), "first\n");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
