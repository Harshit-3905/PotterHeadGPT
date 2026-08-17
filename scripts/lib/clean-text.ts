import type { PdfPage } from "./types";

const LIGATURES: Record<string, string> = {
  "\u00C6": "AE",
  "\u00E6": "ae",
  "\u0152": "OE",
  "\u0153": "oe",
  "\uFB00": "ff",
  "\uFB01": "fi",
  "\uFB02": "fl",
  "\uFB03": "ffi",
  "\uFB04": "ffl",
};

export function cleanChapterTitle(title: string): string {
  return title.replace(/\s*[·•]\s*\d+\s*$/, "").trim();
}

export function toTitleCase(value: string): string {
  return cleanChapterTitle(value)
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function titleFromSourcePath(sourcePath: string): string {
  const base = sourcePath.split(/[\\/]/).pop() ?? sourcePath;
  const withoutExt = base.replace(/\.[^.]+$/, "");
  const withoutIndex = withoutExt.replace(/^\d+[-_]+/, "");
  return toTitleCase(withoutIndex.replace(/[-_]+/g, " "));
}

export function slugFromSourcePath(sourcePath: string): string {
  const base = sourcePath.split(/[\\/]/).pop() ?? sourcePath;
  return base.replace(/\.[^.]+$/, "");
}

function expandLigatures(text: string): string {
  return text.replace(
    /[\u00C6\u00E6\u0152\u0153\uFB00-\uFB04]/g,
    (char) => LIGATURES[char] ?? char,
  );
}

function collapseSpacedLetters(line: string): string {
  return line.replace(
    /(?:[A-Z]\s+){2,}[A-Z]/g,
    (run) => run.replace(/\s+/g, ""),
  );
}

export function normalizePdfText(text: string): string {
  let next = text.normalize("NFC");
  next = expandLigatures(next);
  next = next.replace(/[\u0091\u2018\u201B]/g, "'");
  next = next.replace(/[\u0092\u2019]/g, "'");
  next = next.replace(/[\u0093\u201C]/g, '"');
  next = next.replace(/[\u0094\u201D]/g, '"');
  next = next.replace(/\u00AD/g, "");
  next = next.replace(/[\u200B-\u200D\uFEFF]/g, "");
  next = next.replace(/\r\n|\r/g, "\n");
  next = next.replace(/\f/g, "\n");
  next = next
    .split("\n")
    .map((line) => collapseSpacedLetters(line).replace(/[ \t]+/g, " ").trimEnd())
    .join("\n");
  next = next.replace(/(\p{L})-\n+(\p{L})/gu, "$1$2");
  next = next.replace(/\n{3,}/g, "\n\n");
  return next.trim();
}

function unwrapParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join(" "),
    )
    .join("\n\n")
    .trim();
}

function reflowFalseParagraphs(text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
  const merged: string[] = [];

  for (const paragraph of paragraphs) {
    const previous = merged.at(-1);
    if (!previous) {
      merged.push(paragraph);
      continue;
    }

    const previousIncomplete = /[A-Za-z]-$/.test(previous) || !/[.!?]["']?$/.test(previous);
    const nextContinues = /^["']?[a-z]/.test(paragraph);
    if (!previousIncomplete && !nextContinues) {
      merged.push(paragraph);
      continue;
    }

    if (/[A-Za-z]-$/.test(previous)) {
      merged[merged.length - 1] = previous.slice(0, -1) + paragraph.replace(/^\s+/, "");
      continue;
    }

    merged[merged.length - 1] = `${previous} ${paragraph}`;
  }

  return merged.join("\n\n");
}

export function cleanExtractedText(text: string): string {
  return reflowFalseParagraphs(unwrapParagraphs(normalizePdfText(text)));
}

function isPageNumberLine(line: string): boolean {
  return (
    /^\d+$/.test(line) ||
    /^[ivxlcdm]+$/i.test(line) ||
    /^['"`•·\s]*\d+['"`•·\s]*$/.test(line)
  );
}

function isEbookPageHeader(line: string, bookTitle: string): boolean {
  const compact = line.replace(/\s+/g, " ").trim();
  if (/^p(?:age|\s*a\s*g\s*e)\s*\|?\s*\d+/i.test(compact)) {
    return true;
  }

  const normalizedLine = compact.replace(/[^a-z0-9]+/gi, "").toLowerCase();
  const normalizedTitle = bookTitle.replace(/[^a-z0-9]+/gi, "").toLowerCase();
  if (!normalizedTitle || normalizedLine.length < 12) {
    return false;
  }

  const mentionsBook = normalizedLine.includes(normalizedTitle);
  const mentionsAuthor = /jkrowling/i.test(normalizedLine);
  return mentionsBook && (mentionsAuthor || compact.length < normalizedTitle.length + 40);
}

function stripPageChrome(text: string, bookTitle: string): string {
  const lines = text.split("\n");
  const kept: string[] = [];

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line) {
      kept.push("");
      continue;
    }
    const atEdge = index <= 1 || index >= lines.length - 2;
    if (atEdge && (isPageNumberLine(line) || isEbookPageHeader(line, bookTitle))) {
      continue;
    }
    if (isPageNumberLine(line) || isEbookPageHeader(line, bookTitle)) {
      continue;
    }
    kept.push(rawLine);
  }

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function cleanPages(pages: PdfPage[], bookTitle: string): PdfPage[] {
  return pages.flatMap((page) => {
    const text = stripPageChrome(normalizePdfText(page.text), bookTitle);
    if (!text) {
      return [];
    }
    return [{ page: page.page, text }];
  });
}
