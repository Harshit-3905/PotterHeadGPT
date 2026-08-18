import type { GenerateInput } from "./generate";
import {
  createGroundedAnswerGenerator,
  type GroundedAnswerGeneratorConfig,
} from "./pipeline";
import type { GroundedAnswer } from "./types";

export const E2E_CHUNK_ID = "e2e00000-0000-4000-8000-000000000001";

const E2E_QUOTE =
  "The Lantern Academy keeps its moonstone key beneath the eastern observatory.";

const E2E_ANSWER =
  "The moonstone key is kept beneath the eastern observatory. [1]";

function chunkAnswer(text: string, size = 8): string[] {
  const chars = Array.from(text);
  const chunks: string[] = [];
  for (let index = 0; index < chars.length; index += size) {
    chunks.push(chars.slice(index, index + size).join(""));
  }
  return chunks;
}

/** True when Vitest or Playwright e2e runs with the server-side test provider. */
export function isTestRagProvider(): boolean {
  return (
    process.env.NODE_ENV === "test" || process.env.POTTERHEAD_E2E === "1"
  );
}

export function createTestGroundedAnswerGenerator(): (
  input: GenerateInput,
) => Promise<GroundedAnswer> {
  return async (input) => {
    for (const token of chunkAnswer(E2E_ANSWER, 8)) {
      input.onToken?.(token);
    }

    return {
      answer: E2E_ANSWER,
      citations: [
        {
          ordinal: 1,
          chunkId: E2E_CHUNK_ID,
          quote: E2E_QUOTE,
          book: "The Lantern Academy",
          chapter: "The Moonstone Key",
        },
      ],
      refused: false,
    };
  };
}

export function resolveGroundedAnswerGenerator(
  config: GroundedAnswerGeneratorConfig,
): (input: GenerateInput) => Promise<GroundedAnswer> {
  if (isTestRagProvider()) {
    return createTestGroundedAnswerGenerator();
  }

  return createGroundedAnswerGenerator(config);
}
