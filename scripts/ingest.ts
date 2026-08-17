import { pathToFileURL } from "node:url";
import { OpenAIEmbeddings } from "@langchain/openai";
import { getDatabaseConnection } from "../src/db/client";
import {
  findDocumentBySourcePath,
  insertDocument,
  updateDocument,
} from "../src/db/queries/corpus";
import { createQdrantClient } from "../src/qdrant/client";
import {
  deleteChunksByDocumentId,
  upsertChunks,
} from "../src/qdrant/chunks";
import { ensureBookChunksCollection } from "../src/qdrant/collections";
import { parseIngestArgs } from "./lib/ingest-args";
import { loadIngestEnv } from "./lib/ingest-env";
import { ingestPreparedBooks } from "./lib/ingest";

export { parseIngestArgs } from "./lib/ingest-args";

async function main(): Promise<void> {
  const args = parseIngestArgs(process.argv.slice(2));
  const env = loadIngestEnv();
  const { client, db } = getDatabaseConnection(env.DATABASE_URL);
  const qdrant = createQdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY,
  });

  try {
    await ensureBookChunksCollection(qdrant, {
      collection: env.QDRANT_COLLECTION,
    });
    const embedder = new OpenAIEmbeddings({
      apiKey: env.OPENAI_API_KEY,
      model: "text-embedding-3-small",
      dimensions: 1536,
      batchSize: 64,
      stripNewLines: false,
    });

    const summary = await ingestPreparedBooks(args.path, {
      store: {
        findDocument: (sourcePath) => findDocumentBySourcePath(db, sourcePath),
        insertDocument: (input) => insertDocument(db, input),
        updateDocument: (id, patch) => updateDocument(db, id, patch),
      },
      vectors: {
        upsert: (points) =>
          upsertChunks(qdrant, env.QDRANT_COLLECTION, points),
        deleteByDocumentId: (documentId) =>
          deleteChunksByDocumentId(qdrant, env.QDRANT_COLLECTION, documentId),
      },
      embedder,
    });

    console.log(
      `Done: ${summary.inserted} inserted, ${summary.replaced} replaced, ${summary.skipped} skipped, ${summary.chunks} chunks`,
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

const isCli =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}