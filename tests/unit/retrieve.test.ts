// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { retrievePassages } from "../../src/rag/retrieve";
import { searchChunks } from "../../src/qdrant/chunks";

function vector(seed: number): number[] {
  const values = Array.from({ length: 1536 }, () => 0);
  values[0] = seed;
  return values;
}

describe("searchChunks", () => {
  it("queries Qdrant and maps payload metadata", async () => {
    const query = vi.fn(async () => ({
      points: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          score: 0.88,
          payload: {
            content: "The archive opens at dusk.",
            documentId: "doc-1",
            chunkIndex: 0,
            book: "The Lantern Academy",
            chapter: "Starlight",
          },
        },
      ],
    }));

    const hits = await searchChunks({ query }, "book_chunks", vector(0.2), 6);

    expect(query).toHaveBeenCalledWith("book_chunks", {
      query: vector(0.2),
      limit: 6,
      with_payload: true,
    });
    expect(hits).toEqual([
      {
        id: "11111111-1111-1111-1111-111111111111",
        score: 0.88,
        payload: {
          content: "The archive opens at dusk.",
          documentId: "doc-1",
          chunkIndex: 0,
          book: "The Lantern Academy",
          chapter: "Starlight",
        },
      },
    ]);
  });

  it("rejects query vectors that are not 1536 finite numbers", async () => {
    await expect(
      searchChunks({ query: vi.fn() }, "book_chunks", [1, 2, 3], 6),
    ).rejects.toThrow(/1536/);
  });
});

describe("retrievePassages", () => {
  it("embeds the raw question and returns ranked passages", async () => {
    const queryVector = vector(0.4);
    const embedQuery = vi.fn(async (text: string) => {
      expect(text).toBe("Where is the moonstone key?");
      return queryVector;
    });
    const search = vi.fn(async () => [
      {
        id: "chunk-1",
        score: 0.93,
        payload: {
          content: "The moonstone key is kept beneath the observatory.",
          documentId: "doc-1",
          chunkIndex: 0,
          book: "The Lantern Academy",
          chapter: "The Moonstone Key",
        },
      },
    ]);

    const passages = await retrievePassages("Where is the moonstone key?", {
      embedQuery,
      searchChunks: search,
      topK: 6,
    });

    expect(search).toHaveBeenCalledWith(queryVector, 6);
    expect(passages).toEqual([
      {
        chunkId: "chunk-1",
        content: "The moonstone key is kept beneath the observatory.",
        metadata: {
          book: "The Lantern Academy",
          chapter: "The Moonstone Key",
        },
        score: 0.93,
      },
    ]);
  });
});
