import type { CitationPayload } from "@/rag/types";

export function citationSourceLabel(citation: CitationPayload): string {
  return citation.chapter
    ? `${citation.book} · ${citation.chapter}`
    : citation.book;
}
