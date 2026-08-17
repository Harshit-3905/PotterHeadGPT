import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatComposer } from "@/components/chat/chat-composer";

describe("ChatComposer", () => {
  it("submits a trimmed question and clears the field", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatComposer remaining={5} onSubmit={onSubmit} />);

    const field = screen.getByRole("textbox", { name: /ask the books/i });
    await user.type(field, "  Where is the key?  ");
    await user.click(screen.getByRole("button", { name: /ask/i }));

    expect(onSubmit).toHaveBeenCalledWith("Where is the key?");
    expect(field).toHaveValue("");
  });

  it("disables sending when the daily limit is spent", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatComposer remaining={0} onSubmit={onSubmit} />);

    expect(screen.getByRole("textbox", { name: /ask the books/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /ask/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /ask/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks duplicate submits while disabled", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ChatComposer remaining={3} disabled onSubmit={onSubmit} />);

    expect(screen.getByRole("textbox", { name: /ask the books/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /ask/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
