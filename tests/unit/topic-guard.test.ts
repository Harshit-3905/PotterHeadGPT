// @vitest-environment node
import { describe, expect, it } from "vitest";
import { classifyTopic } from "../../src/rag/topic-guard";

describe("classifyTopic", () => {
  it("maps allow:true to harry_potter", async () => {
    await expect(
      classifyTopic("Who is Dumbledore?", {
        classify: async () => ({ allow: true }),
      }),
    ).resolves.toBe("harry_potter");
  });

  it("maps allow:false to other", async () => {
    await expect(
      classifyTopic("What is the weather in London?", {
        classify: async () => ({ allow: false }),
      }),
    ).resolves.toBe("other");
  });

  it("throws when structured output is invalid", async () => {
    await expect(
      classifyTopic("Who is Dumbledore?", {
        classify: async () => ({}) as { allow: boolean },
      }),
    ).rejects.toThrow(/invalid/i);
  });
});
