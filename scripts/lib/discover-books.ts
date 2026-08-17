import { readdir } from "node:fs/promises";
import path from "node:path";

const PDF_EXTENSIONS = new Set([".pdf"]);

export async function discoverBooks(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        PDF_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
    )
    .map((entry) => path.resolve(root, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

export async function discoverPreparedBooks(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.resolve(root, entry.name))
    .sort((left, right) => left.localeCompare(right));

  const prepared: string[] = [];
  for (const directory of directories) {
    const children = await readdir(directory);
    if (children.includes("manifest.json")) {
      prepared.push(directory);
    }
  }
  return prepared;
}
