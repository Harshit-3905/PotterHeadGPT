// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readModelStream } from "@/rag/generate";

describe("readModelStream", () => {
  it("concatenates string chunks and ignores non-text content", async () => {
    async function* chunks() {
      yield { content: "The scar " };
      yield { content: "is from the curse. [1]" };
      yield { content: [{ type: "text", text: "ignored" }] };
    }

    await expect(readModelStream(chunks())).resolves.toBe(
      "The scar is from the curse. [1]",
    );
  });
});
