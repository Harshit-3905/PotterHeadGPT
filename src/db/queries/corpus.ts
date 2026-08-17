import { eq } from "drizzle-orm";
import type { Database } from "../client";
import { documents } from "../schema/corpus";

export async function findDocumentBySourcePath(
  db: Database,
  sourcePath: string,
) {
  const [document] = await db
    .select({
      id: documents.id,
      checksum: documents.checksum,
      title: documents.title,
    })
    .from(documents)
    .where(eq(documents.sourcePath, sourcePath))
    .limit(1);

  return document ?? null;
}

export async function insertDocument(
  db: Database,
  input: {
    id: string;
    title: string;
    sourcePath: string;
    format: string;
    checksum: string;
  },
) {
  const [document] = await db
    .insert(documents)
    .values({
      id: input.id,
      title: input.title,
      sourcePath: input.sourcePath,
      format: input.format,
      checksum: input.checksum,
    })
    .returning({ id: documents.id });

  if (!document) {
    throw new Error("Failed to insert document");
  }

  return document;
}

export async function updateDocument(
  db: Database,
  id: string,
  patch: { checksum: string; title: string },
) {
  await db
    .update(documents)
    .set({
      checksum: patch.checksum,
      title: patch.title,
      ingestedAt: new Date(),
    })
    .where(eq(documents.id, id));
}

export async function deleteAllDocuments(db: Database) {
  await db.delete(documents);
}

export async function hasIngestedDocuments(db: Database): Promise<boolean> {
  const [document] = await db
    .select({ id: documents.id })
    .from(documents)
    .limit(1);

  return Boolean(document);
}