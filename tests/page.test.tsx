import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element -- test stub
    return <img alt={alt} />;
  },
}));

describe("Home page", () => {
  it("renders the getting started heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: /to get started/i }),
    ).toBeInTheDocument();
  });
});
