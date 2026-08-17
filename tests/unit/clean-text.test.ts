// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  cleanChapterTitle,
  cleanExtractedText,
  cleanPages,
} from "../../scripts/lib/clean-text";

describe("cleanExtractedText", () => {
  it("joins hyphenated line breaks into a single word", () => {
    expect(cleanExtractedText("moon-\nstone")).toBe("moonstone");
  });

  it("unwraps hard line breaks inside a paragraph", () => {
    expect(cleanExtractedText("The lantern\nkeeps its key.")).toBe(
      "The lantern keeps its key.",
    );
  });

  it("keeps paragraph breaks", () => {
    expect(cleanExtractedText("First paragraph.\n\nSecond paragraph.")).toBe(
      "First paragraph.\n\nSecond paragraph.",
    );
  });

  it("collapses spaced-out letters used as PDF headings", () => {
    expect(cleanExtractedText("C H A P T E R\nO N E")).toBe("CHAPTER ONE");
  });

  it("collapses a single-line spaced heading", () => {
    expect(cleanExtractedText("C H A P T E R O N E")).toBe("CHAPTERONE");
  });

  it("does not collapse ordinary words around single-letter tokens", () => {
    expect(cleanExtractedText("was a highly unusual boy")).toBe(
      "was a highly unusual boy",
    );
  });

  it("rejoins words hyphenated across a false paragraph break", () => {
    expect(cleanExtractedText("every-\n\none whispered")).toBe(
      "everyone whispered",
    );
  });

  it("rejoins wrapped lines that were split into fake paragraphs", () => {
    expect(
      cleanExtractedText(
        "The lantern keeps\n\nits key beneath the observatory.",
      ),
    ).toBe("The lantern keeps its key beneath the observatory.");
  });

  it("strips soft hyphens and zero-width characters", () => {
    expect(cleanExtractedText("moon\u00ADstone\u200B key")).toBe(
      "moonstone key",
    );
  });

  it("expands common ligatures", () => {
    expect(cleanExtractedText("ﬁre ﬂame")).toBe("fire flame");
  });
});

describe("cleanChapterTitle", () => {
  it("strips trailing outline page numbers", () => {
    expect(cleanChapterTitle("The Beginning · 716")).toBe("The Beginning");
  });
});

describe("cleanPages", () => {
  it("drops page-number-only lines and repeating book-title headers", () => {
    const cleaned = cleanPages(
      [
        {
          page: 1,
          text: "The Lantern Academy\n12\nThe key waits beneath the observatory.",
        },
        {
          page: 2,
          text: "The Lantern Academy\n13\nRowan hands Mira the moonstone.",
        },
      ],
      "The Lantern Academy",
    );

    expect(cleaned).toEqual([
      {
        page: 1,
        text: "The key waits beneath the observatory.",
      },
      {
        page: 2,
        text: "Rowan hands Mira the moonstone.",
      },
    ]);
  });

  it("drops ebook running headers that include Page and the author", () => {
    const cleaned = cleanPages(
      [
        {
          page: 2,
          text: "P a g e | 2 The Lantern Academy – J.K. Rowling\nThe key waits beneath the observatory.",
        },
      ],
      "The Lantern Academy",
    );

    expect(cleaned).toEqual([
      {
        page: 2,
        text: "The key waits beneath the observatory.",
      },
    ]);
  });

  it("drops pages that are empty after cleaning", () => {
    const cleaned = cleanPages(
      [
        { page: 1, text: "The Lantern Academy\n1" },
        { page: 2, text: "Mira opens the archive." },
      ],
      "The Lantern Academy",
    );

    expect(cleaned).toEqual([{ page: 2, text: "Mira opens the archive." }]);
  });
});
