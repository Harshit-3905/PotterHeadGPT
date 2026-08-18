# Qdrant

← [Codebase guide](../codebase-guide.md)

**Purpose:** Store and search book-chunk embeddings.

---

## Files and functions

| File | Key functions | Responsibility |
|------|---------------|----------------|
| `client.ts` | `createQdrantClient()` | REST client wrapper. |
| `collections.ts` | `ensureBookChunksCollection()` | Creates `book_chunks`: 1536 dims, cosine distance, payload index on `documentId`. |
| `chunks.ts` | `upsertChunks()`, `searchChunks()`, `deleteChunksByDocumentId()` | Point id = chunk UUID; payload: `content`, `book`, `chapter`, `documentId`, `chunkIndex`. |

---

## Data model

Each Qdrant point represents one text chunk from an ingested book:

| Field | Location | Purpose |
|-------|----------|---------|
| Point id | Qdrant | Chunk UUID (matches `message_citations.chunkId`) |
| Vector | Qdrant | 1536-d embedding from `text-embedding-3-small` |
| `content` | Payload | Passage text returned at retrieval time |
| `book`, `chapter` | Payload | Citation metadata |
| `documentId` | Payload | Links to Postgres `documents` row; used for delete-on-reingest |
| `chunkIndex` | Payload | Order within chapter |

---

## Design choices

- **Payload carries passage text:** Retrieval returns content without a second Postgres lookup.
- **Delete-by-document on re-ingest:** Checksum change → delete old points → upsert new ones for that `documentId`.

---

## Related

- [RAG — retrieve](./rag.md) — `retrievePassages()` calls `searchChunks()`
- [Scripts — ingest](./scripts.md) — `upsertChunks()` during CLI ingest
- [Database](./database.md) — `documents` registry
