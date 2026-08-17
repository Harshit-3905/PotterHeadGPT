// @vitest-environment node
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { discoverBooks } from "../../scripts/lib/discover-books";
import {
  prepareBook,
  prepareBooks,
  writePreparedBook,
} from "../../scripts/lib/prepare-book";
import type { PdfPage } from "../../scripts/lib/types";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "potterhead-prepare-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("discoverBooks", () => {
  it("returns supported files in sorted order and ignores other extensions", async () => {
    const dir = await makeTempDir();
    await writeFile(path.join(dir, "02-later.pdf"), "b");
    await writeFile(path.join(dir, "01-first.pdf"), "a");
    await writeFile(path.join(dir, "notes.md"), "nope");

    await expect(discoverBooks(dir)).resolves.toEqual([
      path.join(dir, "01-first.pdf"),
      path.join(dir, "02-later.pdf"),
    ]);
  });
});

describe("writePreparedBook", () => {
  it("writes chapter files in index order plus a manifest", async () => {
    const outRoot = await makeTempDir();
    const written = await writePreparedBook(
      {
        title: "The Lantern Academy",
        slug: "01-the-lantern-academy",
        sourcePath: "/books/01-the-lantern-academy.pdf",
        checksum: "abc123",
        chapters: [
          {
            index: 2,
            title: "Starlight",
            startPage: 4,
            endPage: 4,
            content: "The archive opens at dusk.",
          },
          {
            index: 1,
            title: "The Moonstone Key",
            startPage: 2,
            endPage: 3,
            content: "Professor Rowan hides the key.",
          },
        ],
      },
      outRoot,
    );

    const files = await readdir(written.dir);
    expect(files).toEqual([
      "01-the-moonstone-key.txt",
      "02-starlight.txt",
      "manifest.json",
    ]);

    await expect(
      readFile(path.join(written.dir, "01-the-moonstone-key.txt"), "utf8"),
    ).resolves.toBe("Professor Rowan hides the key.\n");

    const manifest = JSON.parse(
      await readFile(path.join(written.dir, "manifest.json"), "utf8"),
    ) as { title: string; chapters: { file: string; index: number }[] };
    expect(manifest.title).toBe("The Lantern Academy");
    expect(manifest.chapters.map((chapter) => chapter.file)).toEqual([
      "01-the-moonstone-key.txt",
      "02-starlight.txt",
    ]);
  });
});

describe("prepareBook", () => {
  it("cleans pages, drops front matter, and returns sorted chapters", async () => {
    const pages: PdfPage[] = [
      { page: 1, text: "The Lantern Academy\n1\nCopyright notice." },
      {
        page: 2,
        text: "The Lantern Academy\n2\nCHAPTER ONE\nTHE MOON-\nSTONE KEY\nThe lantern\nkeeps its key.",
      },
      {
        page: 3,
        text: "CHAPTER TWO\nSTARLIGHT\nRowan hands Mira the moonstone.",
      },
    ];

    const prepared = await prepareBook("/books/01-the-lantern-academy.pdf", {
      extractPages: async () => pages,
      checksum: async () => "deadbeef",
    });

    expect(prepared.title).toBe("The Lantern Academy");
    expect(prepared.slug).toBe("01-the-lantern-academy");
    expect(prepared.chapters.map((chapter) => chapter.title)).toEqual([
      "The Moonstone Key",
      "Starlight",
    ]);
    expect(prepared.chapters[0]?.content).toBe("The lantern keeps its key.");
  });

  it("fails when almost no extractable text is present", async () => {
    await expect(
      prepareBook("/books/scan.pdf", {
        extractPages: async () => [
          { page: 1, text: "" },
          { page: 2, text: " " },
        ],
        checksum: async () => "x",
      }),
    ).rejects.toThrow(/extractable/i);
  });

  it("fills generic Chapter N titles from the PDF outline", async () => {
    const prepared = await prepareBook("/books/04-the-lantern-academy.pdf", {
      extractPages: async () => [
        {
          page: 1,
          text: "CHAPTER ONE\nThe archive waits in the dark for Mira.",
        },
      ],
      extractOutline: async () => [
        { title: "COVER", startPage: 99 },
        { title: "THE MOONSTONE KEY", startPage: 1 },
      ],
      checksum: async () => "generic",
    });

    expect(prepared.chapters[0]?.title).toBe("The Moonstone Key");
    expect(prepared.chapters[0]?.content).toContain("The archive waits");
  });

  it("falls back to PDF outlines when chapter headings are missing", async () => {
    const prepared = await prepareBook("/books/03-the-lantern-academy.pdf", {
      extractPages: async () => [
        { page: 1, text: "Copyright notice for the academy." },
        { page: 8, text: "Owls arrive before breakfast." },
        { page: 20, text: "The lamp explodes in the hall." },
      ],
      extractOutline: async () => [
        { title: "OWL POST", startPage: 8 },
        { title: "AUNT MARGE", startPage: 20 },
      ],
      checksum: async () => "outline",
    });

    expect(prepared.chapters.map((chapter) => chapter.title)).toEqual([
      "Owl Post",
      "Aunt Marge",
    ]);
    expect(prepared.chapters[0]?.content).toBe("Owls arrive before breakfast.");
  });
});

describe("prepareBooks", () => {
  it("prepares each discovered PDF into a book directory", async () => {
    const sourceDir = await makeTempDir();
    const outDir = await makeTempDir();
    await writeFile(path.join(sourceDir, "01-the-lantern-academy.pdf"), "pdf");

    const result = await prepareBooks({
      sourceDir,
      outDir,
      extractPages: async () => [
        {
          page: 1,
          text: "CHAPTER ONE\nTHE KEY\nThe archive waits.",
        },
      ],
      checksum: async () => "ff",
    });

    expect(result).toEqual({ books: 1, chapters: 1 });
    await expect(
      readFile(
        path.join(outDir, "01-the-lantern-academy", "01-the-key.txt"),
        "utf8",
      ),
    ).resolves.toBe("The archive waits.\n");
  });
});
