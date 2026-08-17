// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildCitationPayload,
  extractCitationOrdinals,
  stripInvalidCitationMarkers,
} from "../../src/rag/citations";
import type { RetrievedPassage } from "../../src/rag/types";

const passages: RetrievedPassage[] = [
  {
    chunkId: "chunk-1",
    content: "The moonstone key is kept beneath the observatory.",
    metadata: {
      book: "The Lantern Academy",
      chapter: "The Moonstone Key",
    },
    score: 0.9,
  },
  {
    chunkId: "chunk-2",
    content: "The archive opens only when touched by starlight.",
    metadata: { book: "The Lantern Academy", chapter: "Starlight" },
    score: 0.8,
  },
];

describe("extractCitationOrdinals", () => {
  it("collects valid ordinals in first-seen order", () => {
    expect(extractCitationOrdinals("A fact [1] and another [2].", 2)).toEqual([
      1, 2,
    ]);
  });

  it("deduplicates repeated ordinals", () => {
    expect(extractCitationOrdinals("Repeated [1] [1].", 2)).toEqual([1]);
  });

  it("drops zero and out-of-range ordinals", () => {
    expect(extractCitationOrdinals("Invalid [0] [3].", 2)).toEqual([]);
  });

  it("does not treat years as citations", () => {
    expect(extractCitationOrdinals("Year [1998].", 4)).toEqual([]);
  });
});

describe("stripInvalidCitationMarkers", () => {
  it("removes out-of-range citation markers and keeps years", () => {
    expect(stripInvalidCitationMarkers("A [1] then [3] in [1998].", 2)).toBe(
      "A [1] then  in [1998].",
    );
  });
});

describe("buildCitationPayload", () => {
  it("includes book and chapter from passage metadata", () => {
    expect(buildCitationPayload([2, 1], passages)).toEqual([
      {
        ordinal: 2,
        chunkId: "chunk-2",
        quote: "The archive opens only when touched by starlight.",
        book: "The Lantern Academy",
        chapter: "Starlight",
      },
      {
        ordinal: 1,
        chunkId: "chunk-1",
        quote: "The moonstone key is kept beneath the observatory.",
        book: "The Lantern Academy",
        chapter: "The Moonstone Key",
      },
    ]);
  });
});
