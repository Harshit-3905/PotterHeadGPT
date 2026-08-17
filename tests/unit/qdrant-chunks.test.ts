// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  deleteAllChunks,
  deleteChunksByDocumentId,
  upsertChunks,
} from "@/qdrant/chunks";
import { ensureBookChunksCollection } from "@/qdrant/collections";

describe("ensureBookChunksCollection", () => {
  it("creates an unnamed collection and indexes documentId", async () => {
    const client = {
      getCollections: async () => ({ collections: [] }),
      createCollection: vi.fn(async () => true),
      createPayloadIndex: vi.fn(async () => ({ status: "completed" })),
      getCollection: vi.fn(),
    };

    await ensureBookChunksCollection(client, { collection: "book_chunks" });

    expect(client.createCollection).toHaveBeenCalledWith("book_chunks", {
      vectors: { size: 1536, distance: "Cosine" },
    });
    expect(client.createPayloadIndex).toHaveBeenCalledWith("book_chunks", {
      wait: true,
      field_name: "documentId",
      field_schema: "keyword",
    });
  });

  it("skips creation when the collection already exists with an index", async () => {
    const client = {
      getCollections: async () => ({ collections: [{ name: "book_chunks" }] }),
      createCollection: vi.fn(),
      createPayloadIndex: vi.fn(),
      getCollection: async () => ({
        payload_schema: { documentId: { data_type: "keyword" } },
      }),
    };

    await ensureBookChunksCollection(client, { collection: "book_chunks" });

    expect(client.createCollection).not.toHaveBeenCalled();
    expect(client.createPayloadIndex).not.toHaveBeenCalled();
  });
});

describe("chunk writes", () => {
  it("upserts points with wait:true", async () => {
    const client = {
      upsert: vi.fn(async () => ({ status: "completed" })),
    };

    await upsertChunks(client, "book_chunks", [
      {
        id: "11111111-1111-1111-1111-111111111111",
        vector: [0.1, 0.2],
        payload: {
          content: "hello",
          documentId: "doc-1",
          chunkIndex: 0,
          book: "The Lantern Academy",
          chapter: "Starlight",
        },
      },
    ]);

    expect(client.upsert).toHaveBeenCalledWith("book_chunks", {
      wait: true,
      points: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          vector: [0.1, 0.2],
          payload: {
            content: "hello",
            documentId: "doc-1",
            chunkIndex: 0,
            book: "The Lantern Academy",
            chapter: "Starlight",
          },
        },
      ],
    });
  });

  it("deletes by documentId filter", async () => {
    const client = {
      delete: vi.fn(async () => ({ status: "completed" })),
    };

    await deleteChunksByDocumentId(client, "book_chunks", "doc-1");

    expect(client.delete).toHaveBeenCalledWith("book_chunks", {
      wait: true,
      filter: {
        must: [{ key: "documentId", match: { value: "doc-1" } }],
      },
    });
  });

  it("deletes all points with an empty filter", async () => {
    const client = {
      delete: vi.fn(async () => ({ status: "completed" })),
    };

    await deleteAllChunks(client, "book_chunks");

    expect(client.delete).toHaveBeenCalledWith("book_chunks", {
      wait: true,
      filter: {},
    });
  });
});
