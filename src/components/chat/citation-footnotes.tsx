"use client";

import { useEffect, useId } from "react";
import type { CitationPayload } from "@/rag/types";
import { citationSourceLabel } from "./citation-source";

export function CitationFootnotes({
  citations,
  openOrdinal,
  onToggle,
}: {
  citations: CitationPayload[];
  openOrdinal: number | null;
  onToggle: (ordinal: number) => void;
}) {
  const headingId = useId();

  useEffect(() => {
    if (openOrdinal === null) {
      return;
    }

    const ordinal = openOrdinal;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onToggle(ordinal);
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openOrdinal, onToggle]);

  return (
    <section className="mt-4 border-t border-ink-edge/80 pt-3" aria-labelledby={headingId}>
      <h3
        id={headingId}
        className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-gold"
      >
        Sources
      </h3>
      <ol className="mt-2 flex flex-col gap-2" aria-labelledby={headingId}>
        {citations.map((citation) => {
          const open = openOrdinal === citation.ordinal;
          const titleId = `${headingId}-${citation.ordinal}`;
          return (
            <li key={citation.chunkId}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={titleId}
                onClick={() => onToggle(citation.ordinal)}
                className="flex w-full items-baseline gap-2 rounded-md px-1 py-1 text-left text-xs leading-5 text-parchment-dim transition-colors hover:bg-gold/10 hover:text-parchment focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
              >
                <span className="shrink-0 font-medium text-gold">
                  [{citation.ordinal}]
                </span>
                <span className="min-w-0 truncate">
                  {citationSourceLabel(citation)}
                </span>
              </button>
              {open ? (
                <div
                  id={titleId}
                  role="region"
                  aria-label={citation.book}
                  className="mt-2 rounded-lg border border-ink-edge bg-ink/50 px-3 py-3"
                >
                  <p className="font-display text-lg font-light text-parchment">
                    {citation.book}
                  </p>
                  {citation.chapter ? (
                    <p className="mt-0.5 text-[0.65rem] uppercase tracking-[0.16em] text-gold">
                      {citation.chapter}
                    </p>
                  ) : null}
                  <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-parchment-dim">
                    {citation.quote}
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
