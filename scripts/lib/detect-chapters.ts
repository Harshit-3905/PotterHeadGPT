import { cleanExtractedText, toTitleCase } from "./clean-text";
import type { ChapterDocument, OutlineEntry, PdfPage } from "./types";

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
] as const;

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
};

const CHAPTER_HEADING =
  /^(?:chapter)\s*([a-z]+(?:-[a-z]+)?|\d+)\b(?:\s*[:—–-]+\s*(.+))?$/i;
const CHAPTER_ONLY = /^chapter$/i;
const EPILOGUE_HEADING = /^(?:epilogue)\b(?:\s*[:—–-]+\s*(.+))?$/i;
const ORNAMENTAL_PAGE_NUMBER = /^['‘’‛`"“”•·\s]*\d+['‘’‛`"“”•·\s]*$/;

type Heading = {
  index: number | null;
  inlineTitle: string | null;
  kind: "chapter" | "epilogue";
  consumedNext: boolean;
};

function parseWordNumber(raw: string): number | null {
  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric > 0) {
    return numeric;
  }

  const normalized = raw.toLowerCase().replace(/[\s_]+/g, "-");
  const onesIndex = ONES.indexOf(normalized as (typeof ONES)[number]);
  if (onesIndex > 0) {
    return onesIndex;
  }

  const tensMatch = /^(twenty|thirty|forty)(?:-(one|two|three|four|five|six|seven|eight|nine))?$/.exec(
    normalized,
  );
  if (!tensMatch) {
    return null;
  }

  const tens = TENS[tensMatch[1] ?? ""];
  if (tens === undefined) {
    return null;
  }
  const ones = tensMatch[2]
    ? ONES.indexOf(tensMatch[2] as (typeof ONES)[number])
    : 0;
  return tens + Math.max(ones, 0);
}

function parseHeading(line: string, nextLine?: string): Heading | null {
  const trimmed = line.trim();
  if (/\.{3,}|…/.test(trimmed)) {
    return null;
  }

  const epilogue = EPILOGUE_HEADING.exec(trimmed);
  if (epilogue) {
    return {
      index: null,
      inlineTitle: epilogue[1]?.trim() || null,
      kind: "epilogue",
      consumedNext: false,
    };
  }

  const consumedNext = CHAPTER_ONLY.test(trimmed) && Boolean(nextLine);
  const combined = consumedNext ? `chapter ${nextLine?.trim()}` : trimmed;
  const chapter = CHAPTER_HEADING.exec(combined);
  if (!chapter) {
    return null;
  }

  const index = parseWordNumber(chapter[1] ?? "");
  if (index === null) {
    return null;
  }

  return {
    index,
    inlineTitle: chapter[2]?.trim() || null,
    kind: "chapter",
    consumedNext,
  };
}

function matchesCurrentTitle(line: string, title: string): boolean {
  const candidate = toTitleCase(line.trim());
  if (!candidate || !title) {
    return false;
  }
  return (
    candidate === title ||
    title.startsWith(candidate) ||
    candidate.startsWith(title)
  );
}

function isOrnamentalLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length === 0 || ORNAMENTAL_PAGE_NUMBER.test(trimmed);
}

function isTitleLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) {
    return false;
  }
  if (/[.!?]$/.test(trimmed)) {
    return false;
  }
  if (parseHeading(trimmed)) {
    return false;
  }
  const words = trimmed.split(/\s+/);
  if (words.length === 0 || words.length > 10) {
    return false;
  }
  const letters = trimmed.replace(/[^\p{L}]/gu, "");
  if (letters.length < 3) {
    return false;
  }
  const uppercase = letters.replace(/[^\p{Lu}]/gu, "");
  if (uppercase.length < letters.length * 0.8) {
    return false;
  }
  return /^[\p{L}\d'’:,\- ]+$/u.test(trimmed);
}

function joinPageParts(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join("\n\n");
}

function stripLeadingTitle(content: string, title: string): string {
  const lines = content.split("\n");
  const first = lines[0]?.trim() ?? "";
  if (first.replace(/['’]/g, "'").toLowerCase() === title.replace(/['’]/g, "'").toLowerCase()) {
    return lines.slice(1).join("\n").trim();
  }
  return content;
}

function headingIndex(
  heading: Heading,
  lastIndex: number,
): number {
  if (heading.kind === "epilogue") {
    return lastIndex + 1;
  }
  return heading.index ?? lastIndex + 1;
}

function finalizeChapters(chapters: ChapterDocument[]): ChapterDocument[] {
  if (chapters.length === 0) {
    throw new Error("No chapter headings found");
  }

  return chapters.map((chapter) => ({
    ...chapter,
    content: cleanExtractedText(chapter.content),
  }));
}

export function splitChapters(pages: PdfPage[]): ChapterDocument[] {
  const chapters: ChapterDocument[] = [];
  let current: {
    index: number;
    title: string;
    startPage: number;
    endPage: number;
    parts: string[];
  } | null = null;

  const flush = () => {
    if (!current) {
      return;
    }
    const content = joinPageParts(current.parts);
    if (content) {
      chapters.push({
        index: current.index,
        title: current.title,
        startPage: current.startPage,
        endPage: current.endPage,
        content,
      });
    }
    current = null;
  };

  for (const page of pages) {
    const lines = page.text.split("\n");
    const headingCount = lines.filter((line, index) =>
      Boolean(parseHeading(line, lines[index + 1])),
    ).length;
    if (headingCount >= 3) {
      continue;
    }

    let pending: string[] = [];

    const pushPending = () => {
      const block = pending.join("\n").trim();
      pending = [];
      if (!block || !current) {
        return;
      }
      current.parts.push(block);
      current.endPage = page.page;
    };

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? "";
      const nextLine = lines[index + 1];
      const heading = parseHeading(line, nextLine);
      if (!heading) {
        if (current && isOrnamentalLine(line) && pending.length === 0) {
          continue;
        }
        if (
          current &&
          isTitleLine(line) &&
          matchesCurrentTitle(line, current.title)
        ) {
          continue;
        }
        pending.push(line);
        continue;
      }

      const chapterIndex = headingIndex(heading, current?.index ?? chapters.at(-1)?.index ?? 0);
      const isNewChapter = current === null || chapterIndex > current.index;

      if (heading.consumedNext) {
        index += 1;
      }

      if (!isNewChapter) {
        while (index + 1 < lines.length) {
          const candidate = lines[index + 1] ?? "";
          if (isOrnamentalLine(candidate) || (current && isTitleLine(candidate) && matchesCurrentTitle(candidate, current.title))) {
            index += 1;
            continue;
          }
          break;
        }
        continue;
      }

      pushPending();
      flush();

      const titleParts: string[] = [];
      if (heading.inlineTitle) {
        titleParts.push(heading.inlineTitle);
      }
      while (index + 1 < lines.length) {
        const candidate = lines[index + 1] ?? "";
        if (isOrnamentalLine(candidate)) {
          index += 1;
          continue;
        }
        if (isTitleLine(candidate) && titleParts.length < 3) {
          titleParts.push(candidate.trim());
          index += 1;
          continue;
        }
        break;
      }

      current = {
        index: chapterIndex,
        title: toTitleCase(
          titleParts.join(" ") ||
            (heading.kind === "epilogue" ? "Epilogue" : `Chapter ${chapterIndex}`),
        ),
        startPage: page.page,
        endPage: page.page,
        parts: [],
      };
    }

    pushPending();
  }

  flush();
  return finalizeChapters(chapters);
}

export function splitByOutline(
  pages: PdfPage[],
  outline: OutlineEntry[],
): ChapterDocument[] {
  if (outline.length === 0) {
    throw new Error("No chapter headings found");
  }

  const sorted = [...outline].sort((left, right) => left.startPage - right.startPage);
  const lastPage = pages.at(-1)?.page ?? sorted.at(-1)?.startPage ?? 1;
  const byPage = new Map(pages.map((page) => [page.page, page]));

  const chapters: ChapterDocument[] = sorted.map((entry, index) => {
    const nextStart = sorted[index + 1]?.startPage;
    const endPage = (nextStart ?? lastPage + 1) - 1;
    const parts: string[] = [];
    let actualEnd = entry.startPage;
    for (let pageNumber = entry.startPage; pageNumber <= endPage; pageNumber += 1) {
      const page = byPage.get(pageNumber);
      if (page?.text.trim()) {
        parts.push(page.text);
        actualEnd = pageNumber;
      }
    }

    return {
      index: index + 1,
      title: toTitleCase(entry.title),
      startPage: entry.startPage,
      endPage: actualEnd,
      content: stripLeadingTitle(joinPageParts(parts), entry.title),
    };
  });

  return finalizeChapters(chapters.filter((chapter) => chapter.content.length > 0));
}
