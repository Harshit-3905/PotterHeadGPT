"use client";

import type { CitationPayload } from "@/rag/types";

export function Citation({
  citation,
  open,
  onOpen,
}: {
  citation: CitationPayload;
  open: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="citation-mark mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-gold/15 px-1 align-super text-[0.65rem] font-medium text-gold-bright transition-colors hover:bg-gold/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
      aria-label={`Citation ${citation.ordinal}`}
      aria-expanded={open}
      onClick={onOpen}
    >
      [{citation.ordinal}]
    </button>
  );
}
