// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const signIn = vi.fn();
const signOut = vi.fn();
const setCookie = vi.fn();
const createGuestHandoffToken = vi.fn();

vi.mock("@/auth/config", () => ({
  auth: () => auth(),
  signIn: (...args: unknown[]) => signIn(...args),
  signOut: (...args: unknown[]) => signOut(...args),
}));
vi.mock("@/auth/guest-handoff", () => ({
  createGuestHandoffToken: (guestId: string) =>
    createGuestHandoffToken(guestId),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: setCookie }),
}));

import {
  beginGoogleUpgrade,
  signOutToLogin,
} from "@/auth/actions";
import { GUEST_HANDOFF_COOKIE } from "@/auth/constants";

const guestId = "4f4c2b1e-4e2a-4a5f-9d51-1f2c3b4a5d6e";

afterEach(() => {
  vi.clearAllMocks();
});

describe("beginGoogleUpgrade", () => {
  it("stores a short-lived httpOnly handoff and starts Google OAuth", async () => {
    auth.mockResolvedValue({
      user: { id: guestId, isGuest: true, role: "user" },
    });
    createGuestHandoffToken.mockResolvedValue("signed-handoff");
    signOut.mockResolvedValue(undefined);
    signIn.mockResolvedValue(undefined);

    await beginGoogleUpgrade();

    expect(createGuestHandoffToken).toHaveBeenCalledWith(guestId);
    expect(setCookie).toHaveBeenCalledWith(
      GUEST_HANDOFF_COOKIE,
      "signed-handoff",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 600,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      }),
    );
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(signIn).toHaveBeenCalledWith("google", {
      redirectTo: "/auth/complete",
    });
    expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(
      signIn.mock.invocationCallOrder[0],
    );
  });

  it("refuses to create a handoff without an authenticated guest", async () => {
    auth.mockResolvedValue({
      user: { id: randomUserId(), isGuest: false, role: "user" },
    });

    await expect(beginGoogleUpgrade()).rejects.toThrow(
      "A guest session is required",
    );
    expect(setCookie).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });
});

describe("signOutToLogin", () => {
  it("clears the Auth.js session and returns to login", async () => {
    signOut.mockResolvedValue(undefined);

    await signOutToLogin();

    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });
});

function randomUserId(): string {
  return "9a2b3c4d-5555-4666-8777-888899990000";
}
