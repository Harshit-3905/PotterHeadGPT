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
    <section className="mt-5 border-t border-gold/20 pt-4" aria-labelledby={headingId}>
      <h3
        id={headingId}
        className="text-[0.62rem] font-medium uppercase tracking-[0.22em] text-gold"
      >
        Sources
      </h3>
      <ol className="mt-3 flex flex-col gap-2" aria-labelledby={headingId}>
        {citations.map((citation) => {
          const open = openOrdinal === citation.ordinal;
          const titleId = `${headingId}-${citation.ordinal}`;
          return (
            <li key={citation.chunkId}>
              <button
                type="button"
                aria-label={`Citation ${citation.ordinal}`}
                aria-expanded={open}
                aria-controls={titleId}
                onClick={() => onToggle(citation.ordinal)}
                className="flex w-full items-baseline gap-2.5 rounded-sm px-1.5 py-1.5 text-left text-sm leading-6 text-parchment-dim transition-colors hover:bg-gold/10 hover:text-parchment focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
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
                  className="manuscript corner-frame mt-2 px-4 py-4"
                >
                  <p className="font-display text-xl font-light leading-tight text-parchment">
                    {citation.book}
                  </p>
                  {citation.chapter ? (
                    <p className="mt-1 text-[0.62rem] uppercase tracking-[0.18em] text-gold">
                      {citation.chapter}
                    </p>
                  ) : null}
                  <p className="mt-3 max-h-40 overflow-y-auto font-serif text-[0.95rem] leading-7 text-parchment-dim italic">
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
