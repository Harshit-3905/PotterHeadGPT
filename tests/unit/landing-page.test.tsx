import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("landing page", () => {
  it("points its primary chat call to action at the chat page", () => {
    render(<Home />);

    expect(
      screen.getByRole("link", { name: /ask the books/i }),
    ).toHaveAttribute("href", "/chat");
  });

  it("names the product in its only top-level heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: /potterheadgpt/i }),
    ).toBeInTheDocument();
  });

  it("shows a cited chat specimen with sources at the end of the answer", () => {
    render(<Home />);

    expect(
      screen.getByText(/why does the sorting hat consider slytherin for harry/i),
    ).toBeInTheDocument();

    const sources = screen.getByRole("list", { name: /sources/i });
    expect(
      within(sources).getByRole("button", { name: /citation 5/i }),
    ).toBeInTheDocument();
  });

  it("drops the create-next-app boilerplate", () => {
    render(<Home />);

    expect(screen.queryByText(/to get started, edit/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /deploy now/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: /next\.js logo/i }),
    ).not.toBeInTheDocument();
  });
});

