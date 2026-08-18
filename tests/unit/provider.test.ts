// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createTestGroundedAnswerGenerator,
  resolveGroundedAnswerGenerator,
  isTestRagProvider,
} from "@/rag/provider";

describe("isTestRagProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("activates in Vitest", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("POTTERHEAD_E2E", "");
    expect(isTestRagProvider()).toBe(true);
  });

  it("activates for Playwright e2e without exposing an HTTP switch", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("POTTERHEAD_E2E", "1");
    expect(isTestRagProvider()).toBe(true);
  });

  it("stays off in production runtime", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("POTTERHEAD_E2E", "");
    expect(isTestRagProvider()).toBe(false);
  });
});

describe("createTestGroundedAnswerGenerator", () => {
  it("streams deterministic cited fixture answers", async () => {
    const tokens: string[] = [];
    const generate = createTestGroundedAnswerGenerator();
    const result = await generate({
      question: "Where is the moonstone key kept?",
      onToken: (token) => {
        tokens.push(token);
      },
    });

    expect(tokens.join("")).toContain("eastern observatory");
    expect(result.refused).toBe(false);
    expect(result.answer).toContain("[1]");
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]?.quote).toContain("moonstone key");
  });
});

describe("resolveGroundedAnswerGenerator", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the deterministic generator in test mode", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const generate = resolveGroundedAnswerGenerator({
      openaiApiKey: "unused",
      qdrantUrl: "http://127.0.0.1:6333",
      collection: "book_chunks",
      topK: 6,
      scoreThreshold: 0.72,
    });

    const result = await generate({ question: "fixture" });
    expect(result.refused).toBe(false);
    expect(result.citations).toHaveLength(1);
  });
});
