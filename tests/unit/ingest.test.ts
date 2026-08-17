// @vitest-environment node
import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { splitChapterChunks } from "../../scripts/lib/chunk";
import { discoverPreparedBooks } from "../../scripts/lib/discover-books";
import {
  ingestPreparedBook,
  ingestPreparedBooks,
} from "../../scripts/lib/ingest";
import { loadPreparedBook } from "../../scripts/lib/load-prepared-book";
import type { ChunkPoint } from "../../scripts/lib/ingest-types";

const FIXTURE_BOOK = path.resolve(
  "tests/fixtures/prepared/01-the-lantern-academy",
);

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "potterhead-ingest-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("discoverPreparedBooks", () => {
  it("returns prepared book directories in sorted order and ignores stray files", async () => {
    const root = await makeTempDir();
    await mkdir(path.join(root, "02-later"));
    await writeFile(path.join(root, "02-later", "manifest.json"), "{}");
    await mkdir(path.join(root, "01-first"));
    await writeFile(path.join(root, "01-first", "manifest.json"), "{}");
    await writeFile(path.join(root, "notes.md"), "nope");

    await expect(discoverPreparedBooks(root)).resolves.toEqual([
      path.join(root, "01-first"),
      path.join(root, "02-later"),
    ]);
  });
});

describe("loadPreparedBook", () => {
  it("loads chapter text and metadata from a prepared book folder", async () => {
    const book = await loadPreparedBook(FIXTURE_BOOK);

    expect(book.title).toBe("The Lantern Academy");
    expect(book.chapters).toHaveLength(2);
    expect(book.chapters[0]).toMatchObject({
      title: "The Moonstone Key",
      startPage: 2,
    });
    expect(book.chapters[0]?.content).toContain("moonstone key");
    expect(book.checksum).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("splitChapterChunks", () => {
  it("attaches book and chapter metadata and does not cross chapters", async () => {
    const chunks = await splitChapterChunks(
      [
        {
          index: 1,
          title: "The Moonstone Key",
          startPage: 2,
          endPage: 3,
          content: `${"alpha ".repeat(800)}ENDONE`,
        },
        {
          index: 2,
          title: "Starlight",
          startPage: 4,
          endPage: 4,
          content: `${"beta ".repeat(800)}ENDTWO`,
        },
      ],
      "The Lantern Academy",
    );

    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((chunk) => chunk.book === "The Lantern Academy")).toBe(
      true,
    );
    expect(chunks.some((chunk) => chunk.content.includes("ENDONE"))).toBe(true);
    expect(chunks.some((chunk) => chunk.content.includes("ENDTWO"))).toBe(true);
    expect(
      chunks.some(
        (chunk) =>
          chunk.content.includes("ENDONE") && chunk.content.includes("ENDTWO"),
      ),
    ).toBe(false);
    expect(chunks[0]?.chapter).toBe("The Moonstone Key");
    expect(chunks[0]?.page).toBe(2);
  });
});

function createMemoryStores() {
  const documents = new Map<
    string,
    { id: string; checksum: string; title: string }
  >();
  const points: ChunkPoint[] = [];
  const embedded: string[] = [];

  return {
    documents,
    points,
    embedded,
    store: {
      findDocument: async (sourcePath: string) =>
        documents.get(sourcePath) ?? null,
      insertDocument: async (input: {
        id: string;
        title: string;
        sourcePath: string;
        format: string;
        checksum: string;
      }) => {
        const id = input.id;
        documents.set(input.sourcePath, {
          id,
          checksum: input.checksum,
          title: input.title,
        });
        return { id };
      },
      updateDocument: async (
        id: string,
        patch: { checksum: string; title: string },
      ) => {
        for (const [sourcePath, document] of documents) {
          if (document.id === id) {
            documents.set(sourcePath, { ...document, ...patch });
          }
        }
      },
    },
    vectors: {
      upsert: async (next: ChunkPoint[]) => {
        points.push(...next);
      },
      deleteByDocumentId: async (documentId: string) => {
        for (let index = points.length - 1; index >= 0; index -= 1) {
          if (points[index]?.payload.documentId === documentId) {
            points.splice(index, 1);
          }
        }
      },
    },
    embedder: {
      embedDocuments: async (texts: string[]) => {
        embedded.push(...texts);
        return texts.map((text, index) => {
          const vector = Array.from({ length: 1536 }, () => 0);
          vector[0] = text.length / 10_000;
          vector[1] = index / 1000;
          return vector;
        });
      },
    },
  };
}

describe("ingestPreparedBook", () => {
  it("inserts a new book and upserts chunk points", async () => {
    const memory = createMemoryStores();
    const result = await ingestPreparedBook(FIXTURE_BOOK, memory);

    expect(result).toMatchObject({ status: "inserted", chunks: 2 });
    expect(memory.documents.size).toBe(1);
    expect(memory.points).toHaveLength(2);
    expect(memory.embedded[0]).toContain(
      "The Lantern Academy — The Moonstone Key",
    );
    expect(memory.points[0]?.payload.content).not.toContain(
      "The Lantern Academy —",
    );
    expect(memory.points[0]?.payload.chapter).toBe("The Moonstone Key");
    expect(memory.points[0]?.vector).toHaveLength(1536);
  });

  it("skips unchanged books before embedding", async () => {
    const memory = createMemoryStores();
    await ingestPreparedBook(FIXTURE_BOOK, memory);
    memory.embedded.length = 0;

    const result = await ingestPreparedBook(FIXTURE_BOOK, memory);

    expect(result.status).toBe("skipped");
    expect(memory.embedded).toEqual([]);
    expect(memory.points).toHaveLength(2);
  });

  it("replaces Qdrant points after a checksum change", async () => {
    const memory = createMemoryStores();
    await ingestPreparedBook(FIXTURE_BOOK, memory);
    const document = [...memory.documents.values()][0];
    if (!document) {
      throw new Error("missing document");
    }
    document.checksum = "old-checksum";

    const result = await ingestPreparedBook(FIXTURE_BOOK, memory);

    expect(result.status).toBe("replaced");
    expect(memory.points).toHaveLength(2);
    expect(
      memory.points.every((point) => point.payload.documentId === document.id),
    ).toBe(true);
  });

  it("leaves old points intact when embedding fails", async () => {
    const memory = createMemoryStores();
    await ingestPreparedBook(FIXTURE_BOOK, memory);
    const document = [...memory.documents.values()][0];
    if (!document) {
      throw new Error("missing document");
    }
    document.checksum = "old-checksum";
    const previousPoints = [...memory.points];

    await expect(
      ingestPreparedBook(FIXTURE_BOOK, {
        ...memory,
        embedder: {
          embedDocuments: async () => {
            throw new Error("openai down");
          },
        },
      }),
    ).rejects.toThrow(/openai down/);

    expect(memory.points).toEqual(previousPoints);
  });
});

describe("ingestPreparedBooks", () => {
  it("summarizes inserted books", async () => {
    const memory = createMemoryStores();
    const summary = await ingestPreparedBooks(
      path.dirname(FIXTURE_BOOK),
      memory,
    );

    expect(summary).toEqual({
      inserted: 1,
      replaced: 0,
      skipped: 0,
      chunks: 2,
    });
  });
});
