// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  BOOKS_REFUSAL,
  OFF_TOPIC_REFUSAL,
} from "../../src/rag/copy";
import { generateGroundedAnswer } from "../../src/rag/generate";
import type { RetrievedPassage } from "../../src/rag/types";

const strongPassage: RetrievedPassage = {
  chunkId: "chunk-1",
  content: "The moonstone key is kept beneath the observatory.",
  metadata: {
    book: "The Lantern Academy",
    chapter: "The Moonstone Key",
  },
  score: 0.9,
};

describe("generateGroundedAnswer", () => {
  it("returns the off-topic refusal without retrieving", async () => {
    const retrievePassages = vi.fn();
    const complete = vi.fn();

    const result = await generateGroundedAnswer(
      { question: "What is the weather in London?" },
      {
        classifyTopic: async () => "other",
        retrievePassages,
        complete,
        scoreThreshold: 0.72,
      },
    );

    expect(result).toEqual({
      answer: OFF_TOPIC_REFUSAL,
      citations: [],
      refused: "off_topic",
    });
    expect(retrievePassages).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });

  it("returns the books refusal when the best score is below threshold", async () => {
    const complete = vi.fn();

    const result = await generateGroundedAnswer(
      { question: "Where is the key?" },
      {
        classifyTopic: async () => "harry_potter",
        retrievePassages: async () => [{ ...strongPassage, score: 0.4 }],
        complete,
        scoreThreshold: 0.72,
      },
    );

    expect(result).toEqual({
      answer: BOOKS_REFUSAL,
      citations: [],
      refused: "low_score",
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it("replaces uncited answers with the books refusal", async () => {
    const result = await generateGroundedAnswer(
      { question: "Where is the key?" },
      {
        classifyTopic: async () => "harry_potter",
        retrievePassages: async () => [strongPassage],
        complete: async () => "It is under the observatory.",
        scoreThreshold: 0.72,
      },
    );

    expect(result).toEqual({
      answer: BOOKS_REFUSAL,
      citations: [],
      refused: "uncited",
    });
  });

  it("forwards model chunks to onToken before generation finishes", async () => {
    const seen: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    async function* complete() {
      yield { content: "The key " };
      await gate;
      yield { content: "is beneath the observatory. [1]" };
    }

    const pending = generateGroundedAnswer(
      {
        question: "Where is the key?",
        onToken: (token) => {
          seen.push(token);
        },
      },
      {
        classifyTopic: async () => "harry_potter",
        retrievePassages: async () => [strongPassage],
        complete,
        scoreThreshold: 0.72,
      },
    );

    await vi.waitFor(() => {
      expect(seen).toEqual(["The key "]);
    });

    release();
    const result = await pending;
    expect(seen).toEqual([
      "The key ",
      "is beneath the observatory. [1]",
    ]);
    expect(result.answer).toBe("The key is beneath the observatory. [1]");
  });

  it("returns cited answers with book and chapter metadata", async () => {
    const result = await generateGroundedAnswer(
      { question: "Where is the key?" },
      {
        classifyTopic: async () => "harry_potter",
        retrievePassages: async () => [strongPassage],
        complete: async () => "It is kept beneath the observatory. [1]",
        scoreThreshold: 0.72,
      },
    );

    expect(result.refused).toBe(false);
    expect(result.answer).toContain("[1]");
    expect(result.citations).toEqual([
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
