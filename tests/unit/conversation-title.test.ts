// @vitest-environment node
import { describe, expect, it } from "vitest";
import { conversationTitle } from "@/chat/title";

describe("conversationTitle", () => {
  it("collapses whitespace and keeps short questions intact", () => {
    expect(conversationTitle("  Why   did Harry  survive?  ")).toBe(
      "Why did Harry survive?",
    );
  });

  it("truncates to 80 visible characters without calling an LLM", () => {
    const question = `${"a".repeat(90)} leftover`;

    expect(conversationTitle(question)).toBe("a".repeat(80));
    expect(conversationTitle(question)).toHaveLength(80);
  });
});
