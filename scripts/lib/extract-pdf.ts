import { readFile } from "node:fs/promises";
import type { OutlineEntry, PdfPage } from "./types";

type PdfJsTextItem = {
  str?: string;
  width?: number;
  hasEOL?: boolean;
  transform?: number[];
};

type PdfJsRef = {
  num: number;
  gen: number;
};

type PdfJsOutlineNode = {
  title: string;
  dest?: string | unknown[] | null;
  items?: PdfJsOutlineNode[];
};

type PdfJsDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getTextContent: () => Promise<{ items: unknown[] }>;
  }>;
  getOutline: () => Promise<PdfJsOutlineNode[] | null>;
  getDestination: (id: string) => Promise<unknown[] | null>;
  getPageIndex: (ref: PdfJsRef) => Promise<number>;
};

type PdfJsModule = {
  getDocument: (options: {
    data: Uint8Array;
    disableWorker?: boolean;
    isEvalSupported?: boolean;
  }) => { promise: Promise<PdfJsDocument> };
};

export function itemsToText(items: unknown[]): string {
  let result = "";
  let lastY: number | null = null;
  let lastEndX = 0;

  for (const raw of items) {
    const item = raw as PdfJsTextItem;
    if (!item.str && !item.hasEOL) {
      continue;
    }

    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    const width = item.width ?? item.str?.length ?? 0;

    if (lastY !== null && Math.abs(y - lastY) > 2) {
      if (!result.endsWith("\n")) {
        result += "\n";
      }
      lastEndX = 0;
    } else if (
      result.length > 0 &&
      !result.endsWith("\n") &&
      item.str &&
      x > lastEndX + 1.5
    ) {
      result += " ";
    }

    result += item.str ?? "";
    if (item.hasEOL && !result.endsWith("\n")) {
      result += "\n";
      lastEndX = 0;
      lastY = y;
      continue;
    }

    lastY = y;
    lastEndX = x + width;
  }

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

async function loadPdf(filePath: string): Promise<PdfJsDocument> {
  const pdfjs = (await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  )) as PdfJsModule;
  const data = new Uint8Array(await readFile(filePath));
  return pdfjs.getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
  }).promise;
}

async function resolveDestPage(
  document: PdfJsDocument,
  dest: PdfJsOutlineNode["dest"],
): Promise<number | null> {
  let explicit: unknown = dest;
  if (typeof dest === "string") {
    explicit = await document.getDestination(dest);
  }
  if (!Array.isArray(explicit) || explicit.length === 0) {
    return null;
  }
  const ref = explicit[0] as PdfJsRef | undefined;
  if (!ref || typeof ref.num !== "number") {
    return null;
  }
  const pageIndex = await document.getPageIndex(ref);
  return pageIndex + 1;
}

function flattenOutline(nodes: PdfJsOutlineNode[] | null): PdfJsOutlineNode[] {
  if (!nodes) {
    return [];
  }
  return nodes.flatMap((node) => [
    node,
    ...flattenOutline(node.items ?? []),
  ]);
}

export async function extractPdfPages(filePath: string): Promise<PdfPage[]> {
  const document = await loadPdf(filePath);
  const pages: PdfPage[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push({
      page: pageNumber,
      text: itemsToText(content.items),
    });
  }
  return pages;
}

export async function extractPdfOutline(
  filePath: string,
): Promise<OutlineEntry[]> {
  const document = await loadPdf(filePath);
  const entries: OutlineEntry[] = [];

  for (const node of flattenOutline(await document.getOutline())) {
    const startPage = await resolveDestPage(document, node.dest);
    const title = node.title.trim();
    if (!startPage || !title) {
      continue;
    }
    entries.push({ title, startPage });
  }

  return entries.sort((left, right) => left.startPage - right.startPage);
}
