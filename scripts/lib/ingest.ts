import { randomUUID } from "node:crypto";
import { EMBED_BATCH_SIZE, type ChunkPoint, type IngestDeps, type IngestFileResult, type IngestSummary } from "./ingest-types";
import { splitChapterChunks } from "./chunk";
import { discoverPreparedBooks } from "./discover-books";
import { loadPreparedBook } from "./load-prepared-book";

function assertEmbeddingShape(vectors: number[][], expected: number): void {
  if (vectors.length !== expected) {
    throw new Error(`Expected ${expected} embeddings, received ${vectors.length}`);
  }
  for (const vector of vectors) {
    if (vector.length !== 1536 || vector.some((value) => !Number.isFinite(value))) {
      throw new Error("Embedding vector must contain 1536 finite numbers");
    }
  }
}

async function embedInBatches(
  embedder: IngestDeps["embedder"],
  texts: string[],
): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let index = 0; index < texts.length; index += EMBED_BATCH_SIZE) {
    const batch = texts.slice(index, index + EMBED_BATCH_SIZE);
    const embedded = await embedder.embedDocuments(batch);
    assertEmbeddingShape(embedded, batch.length);
    vectors.push(...embedded);
  }
  return vectors;
}

export async function ingestPreparedBook(
  directory: string,
  deps: IngestDeps,
): Promise<IngestFileResult> {
  const book = await loadPreparedBook(directory);
  const existing = await deps.store.findDocument(book.sourcePath);
  if (existing?.checksum === book.checksum) {
    return {
      status: "skipped",
      chunks: 0,
      sourcePath: book.sourcePath,
      title: book.title,
    };
  }

  const chunks = await splitChapterChunks(book.chapters, book.title);
  const embeddings = await embedInBatches(
    deps.embedder,
    chunks.map((chunk) => chunk.embedInput),
  );

  const documentId = existing?.id ?? randomUUID();
  const points: ChunkPoint[] = chunks.map((chunk, index) => ({
    id: randomUUID(),
    vector: embeddings[index] ?? [],
    payload: {
      content: chunk.content,
      documentId,
      chunkIndex: chunk.chunkIndex,
      book: chunk.book,
      chapter: chunk.chapter,
    },
  }));

  if (existing) {
    await deps.vectors.deleteByDocumentId(documentId);
  }
  await deps.vectors.upsert(points);

  if (existing) {
    await deps.store.updateDocument(documentId, {
      checksum: book.checksum,
      title: book.title,
    });
    return {
      status: "replaced",
      chunks: points.length,
      sourcePath: book.sourcePath,
      title: book.title,
    };
  }

  await deps.store.insertDocument({
    id: documentId,
    title: book.title,
    sourcePath: book.sourcePath,
    format: "txt",
    checksum: book.checksum,
  });

  return {
    status: "inserted",
    chunks: points.length,
    sourcePath: book.sourcePath,
    title: book.title,
  };
}

export async function ingestPreparedBooks(
  root: string,
  deps: IngestDeps,
): Promise<IngestSummary> {
  const directories = await discoverPreparedBooks(root);
  if (directories.length === 0) {
    throw new Error(`No prepared books found in ${root}`);
  }

  const summary: IngestSummary = {
    inserted: 0,
    replaced: 0,
    skipped: 0,
    chunks: 0,
  };

  for (const directory of directories) {
    const result = await ingestPreparedBook(directory, deps);
    summary[result.status] += 1;
    summary.chunks += result.chunks;
    const label = directory.split(/[\\/]/).pop() ?? directory;
    if (result.status === "skipped") {
      console.log(`SKIPPED ${label}`);
    } else {
      console.log(
        `${result.status.toUpperCase()} ${label} (${result.chunks} chunks)`,
      );
    }
  }

  return summary;
}