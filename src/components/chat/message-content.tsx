"use client";

import { useState } from "react";
import type { CitationPayload } from "@/rag/types";
import { Citation } from "./citation";
import { CitationFootnotes } from "./citation-footnotes";
import { tokenizeMessageContent } from "./tokenize";

export function MessageContent({
  content,
  citations,
}: {
  content: string;
  citations: CitationPayload[];
}) {
  const [openOrdinal, setOpenOrdinal] = useState<number | null>(null);
  const byOrdinal = new Map(
    citations.map((citation) => [citation.ordinal, citation]),
  );

  if (citations.length === 0) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  function toggle(ordinal: number) {
    setOpenOrdinal((current) => (current === ordinal ? null : ordinal));
  }

  return (
    <span className="block">
      <span className="whitespace-pre-wrap">
        {tokenizeMessageContent(content).map((token, index) => {
          if (token.type === "text") {
            return <span key={index}>{token.value}</span>;
          }

          const citation = byOrdinal.get(token.ordinal);
          if (!citation) {
            return <span key={index}>[{token.ordinal}]</span>;
          }

          return (
            <Citation
              key={index}
              citation={citation}
              open={openOrdinal === citation.ordinal}
              onOpen={() => toggle(citation.ordinal)}
            />
          );
        })}
      </span>

      <CitationFootnotes
        citations={citations}
        openOrdinal={openOrdinal}
        onToggle={toggle}
      />
    </span>
  );
}
