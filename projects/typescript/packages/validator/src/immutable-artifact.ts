import { randomUUID } from "node:crypto";
import { link, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

export type ArtifactWriteStatus = "created" | "unchanged" | "conflict";

export async function writeImmutableArtifact(
  outputPath: string,
  content: string,
): Promise<ArtifactWriteStatus> {
  const existing = await readExisting(outputPath);
  if (existing !== undefined) {
    return existing === content ? "unchanged" : "conflict";
  }

  const outputDirectory = dirname(outputPath);
  await mkdir(outputDirectory, { recursive: true });
  const temporaryPath = join(
    outputDirectory,
    `.${basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`,
  );

  await writeFile(temporaryPath, content, { encoding: "utf8", flag: "wx" });
  try {
    await link(temporaryPath, outputPath);
    return "created";
  } catch (error: unknown) {
    if (!isFileExistsError(error)) {
      throw error;
    }

    const racedContent = await readFile(outputPath, "utf8");
    return racedContent === content ? "unchanged" : "conflict";
  } finally {
    await unlink(temporaryPath).catch((error: unknown) => {
      if (!isFileMissingError(error)) {
        throw error;
      }
    });
  }
}

async function readExisting(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error: unknown) {
    if (isFileMissingError(error)) {
      return undefined;
    }
    throw error;
  }
}

function isFileExistsError(error: unknown): error is NodeJS.ErrnoException {
  return isNodeError(error) && error.code === "EEXIST";
}

function isFileMissingError(error: unknown): error is NodeJS.ErrnoException {
  return isNodeError(error) && error.code === "ENOENT";
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
