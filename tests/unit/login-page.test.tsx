import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";

const auth = vi.fn();
const redirect = vi.fn((destination: string) => {
  // The real `redirect` throws to abort the render; tests rely on that to prove
  // the page stops instead of rendering sign-in buttons to a signed-in user.
  throw new Error(`NEXT_REDIRECT:${destination}`);
});

vi.mock("@/auth/config", () => ({ auth: () => auth() }));
vi.mock("next/navigation", () => ({
  redirect: (destination: string) => redirect(destination),
}));
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));

const guestSession = {
  user: {
    id: "6f1c1f0e-1111-4222-8333-444455556666",
    role: "user" as const,
    isGuest: true,
    name: "Guest",
  },
  expires: "2026-09-16T07:44:28.628Z",
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("login page", () => {
  it("sends an already authenticated visitor to the chat", async () => {
    auth.mockResolvedValue(guestSession);

    await expect(LoginPage()).rejects.toThrow("NEXT_REDIRECT:/chat");
    expect(redirect).toHaveBeenCalledWith("/chat");
  });

  it("offers guest and Google sign-in to a visitor with no session", async () => {
    auth.mockResolvedValue(null);

    render(await LoginPage());

    expect(redirect).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { level: 1, name: /enter the library/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue as guest/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });
});
