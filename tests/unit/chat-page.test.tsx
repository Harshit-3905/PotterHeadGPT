import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ChatPage from "@/app/chat/page";

const auth = vi.fn();
const redirect = vi.fn((destination: string) => {
  // The real `redirect` throws to abort the render; tests rely on that to prove
  // an unauthenticated visitor never receives the protected markup.
  throw new Error(`NEXT_REDIRECT:${destination}`);
});

vi.mock("@/auth/config", () => ({ auth: () => auth() }));
vi.mock("next/navigation", () => ({
  redirect: (destination: string) => redirect(destination),
}));

const guestSession = {
  user: {
    id: "6f1c1f0e-1111-4222-8333-444455556666",
    role: "user" as const,
    isGuest: true,
    name: "Guest",
  },
  expires: "2026-09-16T07:44:28.628Z",
};

const googleSession = {
  user: {
    id: "9a2b3c4d-5555-4666-8777-888899990000",
    role: "user" as const,
    isGuest: false,
    name: "Hermione Granger",
    email: "hermione@example.com",
  },
  expires: "2026-09-16T07:44:28.628Z",
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("chat page", () => {
  it("sends an unauthenticated visitor to the login page", async () => {
    auth.mockResolvedValue(null);

    await expect(ChatPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("renders the shell for a guest session", async () => {
    auth.mockResolvedValue(guestSession);

    render(await ChatPage());

    expect(redirect).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { level: 1, name: /potterheadgpt/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/guest session/i)).toBeInTheDocument();
  });

  it("renders the shell for a Google session", async () => {
    auth.mockResolvedValue(googleSession);

    render(await ChatPage());

    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByText(/hermione granger/i)).toBeInTheDocument();
    expect(screen.queryByText(/guest session/i)).not.toBeInTheDocument();
  });
});
