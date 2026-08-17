// @vitest-environment node
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { describe, expect, it } from "vitest";
import { buildGroundedPrompt } from "../../src/rag/prompt";
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
];

describe("buildGroundedPrompt", () => {
  it("puts passages in the system message and the question in a human message", () => {
    const messages = buildGroundedPrompt(
      "Where is the key?",
      passages,
      [],
    );

    const system = messages.find((message) => SystemMessage.isInstance(message));
    const human = messages.find((message) => HumanMessage.isInstance(message));

    expect(system?.content).toContain('id="1"');
    expect(system?.content).toContain('book="The Lantern Academy"');
    expect(system?.content).toContain('chapter="The Moonstone Key"');
    expect(system?.content).toContain("moonstone key");
    expect(system?.content).not.toContain("Where is the key?");
    expect(human?.content).toBe("Where is the key?");
  });

  it("escapes passage XML attributes", () => {
    const messages = buildGroundedPrompt(
      "q",
      [
        {
          ...passages[0]!,
          metadata: {
            book: 'Lantern & "Academy"',
            chapter: "A <B>",
          },
          content: "1 < 2",
        },
      ],
      [],
    );
    const system = messages.find((message) => SystemMessage.isInstance(message));
    expect(String(system?.content)).toContain("Lantern &amp; &quot;Academy&quot;");
    expect(String(system?.content)).toContain("A &lt;B&gt;");
    expect(String(system?.content)).toContain("1 &lt; 2");
  });
});
