import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MessageContent } from "@/components/chat/message-content";

const citations = [
  {
    ordinal: 1,
    chunkId: "chunk-id",
    quote: "The moonstone key rests beneath the eastern observatory.",
    book: "Sample Book",
    chapter: "Chapter 1",
  },
];

describe("MessageContent", () => {
  it("keeps [1] in the answer as text and puts the citation control in Sources", () => {
    render(
      <MessageContent
        content="The key is beneath the observatory [1]."
        citations={citations}
      />,
    );

    const sources = screen.getByRole("list", { name: /sources/i });
    const marker = within(sources).getByRole("button", { name: /citation 1/i });
    expect(marker).toHaveAccessibleName(/citation 1/i);
    marker.focus();
    expect(marker).toHaveFocus();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("lists sources under the answer without dumping the passage", () => {
    render(
      <MessageContent
        content="The key is beneath the observatory [1]."
        citations={citations}
      />,
    );

    const sources = screen.getByRole("list", { name: /sources/i });
    expect(sources).toHaveTextContent("[1]");
    expect(sources).toHaveTextContent("Sample Book");
    expect(sources).toHaveTextContent("Chapter 1");
    expect(sources).not.toHaveTextContent(
      "The moonstone key rests beneath the eastern observatory.",
    );
  });

  it("expands the passage under the message and collapses it with Escape", async () => {
    const user = userEvent.setup();
    render(
      <MessageContent
        content="The key is beneath the observatory [1]."
        citations={citations}
      />,
    );

    const sources = screen.getByRole("list", { name: /sources/i });
    await user.click(within(sources).getByRole("button", { name: /citation 1/i }));

    const passage = screen.getByRole("region", { name: /sample book/i });
    expect(passage).toBeVisible();
    expect(passage).toHaveTextContent("Chapter 1");
    expect(passage).toHaveTextContent(
      "The moonstone key rests beneath the eastern observatory.",
    );

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(
        screen.queryByRole("region", { name: /sample book/i }),
      ).not.toBeInTheDocument();
    });
  });
});
