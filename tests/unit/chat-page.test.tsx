import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ChatPage from "@/app/chat/page";

const auth = vi.fn();
const redirect = vi.fn((destination: string) => {
  throw new Error(`NEXT_REDIRECT:${destination}`);
});

vi.mock("@/auth/config", () => ({ auth: () => auth() }));
vi.mock("@/auth/actions", () => ({
  beginGoogleUpgrade: vi.fn(),
  signOutToLogin: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (destination: string) => redirect(destination),
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@/chat/load-shell", () => ({
  loadChatShell: async (session: {
    user: {
      id: string;
      role: "user" | "admin";
      isGuest: boolean;
      name?: string | null;
      email?: string | null;
    };
  }) => ({
    session: {
      id: session.user.id,
      role: session.user.role,
      isGuest: session.user.isGuest,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
    },
    usage: {
      limit: 5,
      used: 0,
      remaining: 5,
      resetsAt: "2026-08-18T00:00:00.000Z",
      unlimited: false,
    },
    conversations: [],
    conversation: null,
    hasCorpus: true,
  }),
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
    expect(
      screen.getByRole("button", { name: /sign in with google/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it("renders the shell for a Google session", async () => {
    auth.mockResolvedValue(googleSession);

    render(await ChatPage());

    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByText(/hermione granger/i)).toBeInTheDocument();
    expect(screen.queryByText(/guest session/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /sign in with google/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });
});
