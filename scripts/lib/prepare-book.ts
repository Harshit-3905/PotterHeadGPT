import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  cleanPages,
  slugify,
  slugFromSourcePath,
  titleFromSourcePath,
  toTitleCase,
} from "./clean-text";
import { splitByOutline, splitChapters } from "./detect-chapters";
import { discoverBooks } from "./discover-books";
import { extractPdfOutline, extractPdfPages } from "./extract-pdf";
import type {
  ChapterDocument,
  ChecksumFn,
  ExtractOutline,
  ExtractPages,
  OutlineEntry,
  PreparedBook,
} from "./types";

const MIN_MEANINGFUL_CHARS = 20;

export async function fileChecksum(filePath: string): Promise<string> {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

function isGenericChapterTitle(title: string): boolean {
  return /^Chapter \d+$/i.test(title);
}

async function applyOutlineTitles(
  chapters: ChapterDocument[],
  filePath: string,
  extractOutline: ExtractOutline,
): Promise<ChapterDocument[]> {
  if (!chapters.some((chapter) => isGenericChapterTitle(chapter.title))) {
    return chapters;
  }

  const outline = await extractOutline(filePath);
  if (outline.length === 0) {
    return chapters;
  }

  return chapters.map((chapter) => {
    if (!isGenericChapterTitle(chapter.title)) {
      return chapter;
    }

    let nearest: OutlineEntry | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const entry of outline) {
      const distance = Math.abs(entry.startPage - chapter.startPage);
      if (distance < nearestDistance) {
        nearest = entry;
        nearestDistance = distance;
      }
    }

    if (!nearest || nearestDistance > 5) {
      return chapter;
    }

    return { ...chapter, title: toTitleCase(nearest.title) };
  });
}

function assertExtractable(
  originalCount: number,
  cleanedCount: number,
  totalChars: number,
): void {
  if (cleanedCount === 0 || totalChars < MIN_MEANINGFUL_CHARS) {
    throw new Error("PDF has almost no extractable text");
  }
  if (originalCount >= 10 && cleanedCount / originalCount < 0.2) {
    throw new Error("PDF has almost no extractable text");
  }
}

export function chapterFileName(chapter: ChapterDocument): string {
  return `${String(chapter.index).padStart(2, "0")}-${slugify(chapter.title)}.txt`;
}

export async function writePreparedBook(
  book: PreparedBook,
  outRoot: string,
): Promise<{ dir: string; files: string[] }> {
  const dir = path.join(outRoot, book.slug);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const chapters = [...book.chapters].sort(
    (left, right) => left.index - right.index,
  );
  const files: string[] = [];
  const manifestChapters = [];

  for (const chapter of chapters) {
    const file = chapterFileName(chapter);
    await writeFile(
      path.join(dir, file),
      `${chapter.content.trim()}\n`,
      "utf8",
    );
    files.push(file);
    manifestChapters.push({
      index: chapter.index,
      title: chapter.title,
      file,
      startPage: chapter.startPage,
      endPage: chapter.endPage,
    });
  }

  const manifestName = "manifest.json";
  await writeFile(
    path.join(dir, manifestName),
    `${JSON.stringify(
      {
        title: book.title,
        slug: book.slug,
        sourcePath: book.sourcePath,
        checksum: book.checksum,
        chapterCount: chapters.length,
        chapters: manifestChapters,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  files.push(manifestName);

  return { dir, files: files.sort((left, right) => left.localeCompare(right)) };
}

export async function prepareBook(
  filePath: string,
  deps: {
    extractPages?: ExtractPages;
    extractOutline?: ExtractOutline;
    checksum?: ChecksumFn;
  } = {},
): Promise<PreparedBook> {
  const extractPages = deps.extractPages ?? extractPdfPages;
  const extractOutline = deps.extractOutline ?? extractPdfOutline;
  const checksum = deps.checksum ?? fileChecksum;
  const title = titleFromSourcePath(filePath);
  const pages = await extractPages(filePath);
  const cleaned = cleanPages(pages, title);
  const totalChars = cleaned.reduce((sum, page) => sum + page.text.length, 0);
  assertExtractable(pages.length, cleaned.length, totalChars);

  let chapters: ChapterDocument[];
  try {
    chapters = splitChapters(cleaned);
  } catch (error) {
    const outline = await extractOutline(filePath);
    if (outline.length === 0) {
      throw error;
    }
    chapters = splitByOutline(cleaned, outline);
  }

  chapters = await applyOutlineTitles(chapters, filePath, extractOutline);

  return {
    title,
    slug: slugFromSourcePath(filePath),
    sourcePath: filePath,
    checksum: await checksum(filePath),
    chapters,
  };
}

export async function prepareBooks(options: {
  sourceDir: string;
  outDir: string;
  extractPages?: ExtractPages;
  extractOutline?: ExtractOutline;
  checksum?: ChecksumFn;
}): Promise<{ books: number; chapters: number }> {
  const paths = await discoverBooks(options.sourceDir);
  if (paths.length === 0) {
    throw new Error(`No PDF files found in ${options.sourceDir}`);
  }

  await mkdir(options.outDir, { recursive: true });

  let chapters = 0;
  for (const filePath of paths) {
    const prepared = await prepareBook(filePath, {
      extractPages: options.extractPages,
      extractOutline: options.extractOutline,
      checksum: options.checksum,
    });
    await writePreparedBook(prepared, options.outDir);
    chapters += prepared.chapters.length;
    console.log(
      `PREPARED ${prepared.slug} (${prepared.chapters.length} chapters)`,
    );
  }

  return { books: paths.length, chapters };
}
