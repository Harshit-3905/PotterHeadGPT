// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  groundedAnswerTraceOutputs,
  questionOnlyInputs,
  retrievalTraceOutputs,
} from "../../src/rag/tracing";
import type { RetrievedPassage } from "../../src/rag/types";

const passages: RetrievedPassage[] = [
  {
    chunkId: "chunk-1",
    content: "The moonstone key is kept beneath the observatory.",
    metadata: {
      book: "The Lantern Academy",
      chapter: "The Moonstone Key",
    },
    score: 0.91,
  },
  {
    chunkId: "chunk-2",
    content: "The archive opens only when touched by starlight.",
    metadata: { book: "The Lantern Academy", chapter: "Starlight" },
    score: 0.8,
  },
];

describe("retrievalTraceOutputs", () => {
  it("keeps passage text, book, chapter, and scores", () => {
    expect(retrievalTraceOutputs(passages)).toEqual({
      count: 2,
      bestScore: 0.91,
      scores: [0.91, 0.8],
      passages: [
        {
          chunkId: "chunk-1",
          score: 0.91,
          book: "The Lantern Academy",
          chapter: "The Moonstone Key",
          content: "The moonstone key is kept beneath the observatory.",
        },
        {
          chunkId: "chunk-2",
          score: 0.8,
          book: "The Lantern Academy",
          chapter: "Starlight",
          content: "The archive opens only when touched by starlight.",
        },
      ],
    });
  });
});

describe("groundedAnswerTraceOutputs", () => {
  it("records refusal and citations", () => {
    expect(
      groundedAnswerTraceOutputs({
        answer: "It is kept beneath the observatory. [1]",
        refused: false,
        citations: [
          {
            ordinal: 1,
            chunkId: "chunk-1",
            quote: passages[0]!.content,
            book: "The Lantern Academy",
            chapter: "The Moonstone Key",
          },
        ],
      }),
    ).toMatchObject({
      refused: false,
      citationCount: 1,
    });
  });
});

describe("questionOnlyInputs", () => {
  it("drops injected deps from two-argument calls", () => {
    expect(
      questionOnlyInputs({
        args: ["Where is the key?", { embedQuery: () => undefined }],
      }),
    ).toEqual({ question: "Where is the key?" });
  });
});
