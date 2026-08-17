import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("landing page", () => {
  it("points its primary chat call to action at the login page", () => {
    render(<Home />);

    expect(
      screen.getByRole("link", { name: /start a conversation/i }),
    ).toHaveAttribute("href", "/login");
  });

  it("names the product in its only top-level heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: /potterheadgpt/i }),
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
