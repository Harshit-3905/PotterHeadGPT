import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { INGEST_VERSION, type LoadedPreparedBook } from "./ingest-types";

const manifestSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  sourcePath: z.string().min(1),
  chapters: z
    .array(
      z.object({
        index: z.number().int().positive(),
        title: z.string().min(1),
        file: z.string().min(1),
        startPage: z.number().int().positive(),
        endPage: z.number().int().positive(),
      }),
    )
    .min(1),
});

export async function loadPreparedBook(
  directory: string,
): Promise<LoadedPreparedBook> {
  const sourcePath = path.resolve(directory);
  const manifestRaw = await readFile(path.join(sourcePath, "manifest.json"), "utf8");
  const manifest = manifestSchema.parse(JSON.parse(manifestRaw));
  const hasher = createHash("sha256");
  hasher.update(INGEST_VERSION);
  hasher.update("\n");
  hasher.update(manifestRaw);

  const chapters = [];
  for (const chapter of [...manifest.chapters].sort((left, right) => left.index - right.index)) {
    const content = await readFile(path.join(sourcePath, chapter.file), "utf8");
    hasher.update("\n");
    hasher.update(chapter.file);
    hasher.update("\n");
    hasher.update(content);
    chapters.push({ ...chapter, content });
  }

  return {
    title: manifest.title,
    slug: manifest.slug,
    sourcePath,
    checksum: hasher.digest("hex"),
    chapters,
  };
}