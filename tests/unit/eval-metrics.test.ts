import { describe, expect, it } from "vitest";
import {
  citationPresent,
  evaluateCaseResult,
  formatSummaryTable,
  normalizeForMatch,
  refusalCorrect,
  retrievalHit,
  summarize,
} from "../../scripts/lib/eval-metrics";
import type { EvalCase } from "../../scripts/lib/eval-types";
import { BOOKS_REFUSAL } from "../../src/rag/copy";
import type { GroundedAnswer, RetrievedPassage } from "../../src/rag/types";

const passage = (content: string, score = 0.9): RetrievedPassage => ({
  chunkId: "00000000-0000-4000-8000-000000000001",
  content,
  metadata: { book: "Fixture", chapter: "One" },
  score,
});

describe("normalizeForMatch", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeForMatch("  Eastern   Observatory ")).toBe(
      "eastern observatory",
    );
  });
});

describe("retrievalHit", () => {
  it("passes when any expected term appears in retrieved content", () => {
    expect(
      retrievalHit([passage("The key is beneath the eastern observatory.")], [
        "eastern observatory",
      ]),
    ).toBe(true);
  });

  it("fails when no expected term matches", () => {
    expect(retrievalHit([passage("Starlight only.")], ["archive"])).toBe(false);
  });

  it("passes vacuously when no terms are expected", () => {
    expect(retrievalHit([], [])).toBe(true);
  });
});

describe("citationPresent", () => {
  it("detects valid citation markers", () => {
    const answer: GroundedAnswer = {
      answer: "The key is kept below the observatory [1].",
      citations: [],
      refused: false,
    };
    expect(citationPresent(answer, 2)).toBe(true);
  });

  it("returns false for refusals", () => {
    const answer: GroundedAnswer = {
      answer: BOOKS_REFUSAL,
      citations: [],
      refused: "low_score",
    };
    expect(citationPresent(answer, 2)).toBe(false);
  });
});

describe("refusalCorrect", () => {
  it("matches expected refusal", () => {
    expect(
      refusalCorrect(
        { answer: BOOKS_REFUSAL, citations: [], refused: "low_score" },
        true,
      ),
    ).toBe(true);
  });

  it("matches expected answer", () => {
    expect(
      refusalCorrect(
        { answer: "Found it [1].", citations: [], refused: false },
        false,
      ),
    ).toBe(true);
  });
});

describe("summarize", () => {
  const cases: EvalCase[] = [
    {
      id: "hit",
      question: "q1",
      expectedTerms: ["archive"],
      expectCitation: true,
      expectRefusal: false,
    },
    {
      id: "refuse",
      question: "q2",
      expectedTerms: [],
      expectCitation: false,
      expectRefusal: true,
    },
  ];

  it("computes exact percentages", () => {
    const results = [
      evaluateCaseResult({
        evalCase: cases[0],
        passages: [passage("The archive opens at dusk.")],
        answer: {
          answer: "It opens at dusk [1].",
          citations: [],
          refused: false,
        },
        latencyMs: 10,
      }),
      evaluateCaseResult({
        evalCase: cases[1],
        passages: [],
        answer: {
          answer: BOOKS_REFUSAL,
          citations: [],
          refused: "low_score",
        },
        latencyMs: 5,
      }),
    ];

    const summary = summarize(results, cases);
    expect(summary.retrieval.rate).toBe(100);
    expect(summary.citation.rate).toBe(100);
    expect(summary.refusal.rate).toBe(100);
    expect(summary.aggregate.rate).toBe(100);
  });

  it("returns 100% rates for empty metric denominators", () => {
    const summary = summarize([], []);
    expect(summary.retrieval.rate).toBe(100);
    expect(summary.citation.rate).toBe(100);
    expect(summary.refusal.rate).toBe(100);
  });

  it("formats a markdown table", () => {
    const table = formatSummaryTable(
      summarize(
        [
          evaluateCaseResult({
            evalCase: cases[0],
            passages: [passage("archive")],
            answer: {
              answer: "Yes [1].",
              citations: [],
              refused: false,
            },
            latencyMs: 1,
          }),
        ],
        [cases[0]],
      ),
    );

    expect(table).toContain("| Retrieval hit |");
    expect(table).toContain("100.0%");
  });
});
