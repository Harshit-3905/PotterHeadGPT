import type { CitationPayload, RetrievedPassage } from "./types";

const CITATION_MARKER = /\[(\d+)\]/g;
const MAX_CITATION_ORDINAL = 12;

function parseOrdinal(digits: string): number | null {
  if (!/^\d+$/.test(digits)) {
    return null;
  }
  const value = Number(digits);
  return Number.isInteger(value) ? value : null;
}

function isPlausibleCitationOrdinal(value: number): boolean {
  return value >= 0 && value <= MAX_CITATION_ORDINAL;
}

export function extractCitationOrdinals(
  answer: string,
  sourceCount: number,
): number[] {
  const seen = new Set<number>();
  const ordinals: number[] = [];

  for (const match of answer.matchAll(CITATION_MARKER)) {
    const value = parseOrdinal(match[1] ?? "");
    if (value === null || value < 1 || value > sourceCount || seen.has(value)) {
      continue;
    }
    seen.add(value);
    ordinals.push(value);
  }

  return ordinals;
}

export function stripInvalidCitationMarkers(
  answer: string,
  sourceCount: number,
): string {
  return answer.replace(CITATION_MARKER, (full, digits: string) => {
    const value = parseOrdinal(digits);
    if (value === null || !isPlausibleCitationOrdinal(value)) {
      return full;
    }
    if (value >= 1 && value <= sourceCount) {
      return full;
    }
    return "";
  });
}

export function buildCitationPayload(
  ordinals: number[],
  passages: RetrievedPassage[],
): CitationPayload[] {
  return ordinals.flatMap((ordinal) => {
    const passage = passages[ordinal - 1];
    if (!passage) {
      return [];
    }
    return [
      {
        ordinal,
        chunkId: passage.chunkId,
        quote: passage.content,
        book: passage.metadata.book,
        chapter: passage.metadata.chapter,
        page: passage.metadata.page,
      },
    ];
  });
}
