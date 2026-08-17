// @vitest-environment node
import { describe, expect, it } from "vitest";
import { itemsToText } from "../../scripts/lib/extract-pdf";

describe("itemsToText", () => {
  it("uses a single newline between visual lines even when hasEOL and y both change", () => {
    const text = itemsToText([
      {
        str: "The lantern keeps",
        width: 80,
        hasEOL: true,
        transform: [1, 0, 0, 1, 0, 100],
      },
      {
        str: "its key.",
        width: 40,
        hasEOL: true,
        transform: [1, 0, 0, 1, 0, 88],
      },
    ]);

    expect(text).toBe("The lantern keeps\nits key.");
  });
});
