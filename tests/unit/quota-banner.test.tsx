import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuotaBanner } from "@/components/chat/quota-banner";

describe("QuotaBanner", () => {
  it("shows remaining messages for a capped user", () => {
    render(
      <QuotaBanner
        usage={{
          limit: 5,
          used: 2,
          remaining: 3,
          resetsAt: "2026-08-18T00:00:00.000Z",
          unlimited: false,
        }}
      />,
    );

    expect(
      screen.getByText("3 of 5 messages remaining today."),
    ).toBeInTheDocument();
  });

  it("discloses the UTC reset when the limit is spent", () => {
    render(
      <QuotaBanner
        usage={{
          limit: 5,
          used: 5,
          remaining: 0,
          resetsAt: "2026-08-18T00:00:00.000Z",
          unlimited: false,
        }}
      />,
    );

    expect(
      screen.getByText("Daily limit reached. Resets at 00:00 UTC."),
    ).toBeInTheDocument();
  });

  it("renders nothing for unlimited admins", () => {
    const { container } = render(
      <QuotaBanner
        usage={{
          limit: 5,
          used: 0,
          remaining: 5,
          resetsAt: "2026-08-18T00:00:00.000Z",
          unlimited: true,
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
