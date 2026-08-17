import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SignInResponse } from "next-auth/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginActions } from "@/components/auth/login-actions";

const signIn = vi.fn();
const navigate = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signIn(...args),
}));

function guestButton() {
  return screen.getByRole("button", { name: /continue as guest/i });
}

function googleButton() {
  return screen.getByRole("button", { name: /continue with google/i });
}

function response({
  ok,
  url = null,
  error,
}: {
  ok: boolean;
  url?: string | null;
  error?: string;
}): SignInResponse {
  return {
    ok,
    url,
    error,
    code: error,
    status: ok ? 200 : 401,
  };
}

/** Keeps the UI pending until the test ends. */
function neverSettles() {
  signIn.mockReturnValue(new Promise(() => {}));
}

beforeEach(() => {
  signIn.mockResolvedValue(response({ ok: false, error: "CredentialsSignin" }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("LoginActions", () => {
  it("offers exactly two ways in", () => {
    render(<LoginActions navigate={navigate} />);

    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(guestButton()).toBeEnabled();
    expect(googleButton()).toBeEnabled();
  });

  it("starts guest sign-in without allowing Auth.js to redirect", async () => {
    neverSettles();
    render(<LoginActions navigate={navigate} />);

    await userEvent.click(guestButton());

    expect(signIn).toHaveBeenCalledWith("guest", {
      redirect: false,
      redirectTo: "/chat",
    });
  });

  it("starts Google sign-in without allowing Auth.js to redirect", async () => {
    neverSettles();
    render(<LoginActions navigate={navigate} />);

    await userEvent.click(googleButton());

    expect(signIn).toHaveBeenCalledWith("google", {
      redirect: false,
      redirectTo: "/auth/complete",
    });
  });

  it("announces the pending action and locks both buttons", async () => {
    neverSettles();
    render(<LoginActions navigate={navigate} />);

    await userEvent.click(guestButton());

    expect(guestButton()).toBeDisabled();
    expect(guestButton()).toHaveAttribute("aria-busy", "true");
    expect(googleButton()).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(/guest/i);
  });

  it("submits once when two clicks dispatch before React commits", () => {
    neverSettles();
    render(<LoginActions navigate={navigate} />);

    const guest = guestButton();

    act(() => {
      guest.click();
      guest.click();
    });

    expect(signIn).toHaveBeenCalledOnce();
  });

  it("does not start a second provider while one is pending", async () => {
    neverSettles();
    render(<LoginActions navigate={navigate} />);

    await userEvent.click(guestButton());
    await userEvent.click(googleButton());

    expect(signIn).toHaveBeenCalledOnce();
    expect(signIn).toHaveBeenCalledWith("guest", {
      redirect: false,
      redirectTo: "/chat",
    });
  });

  it("reopens both buttons for a resolved CredentialsSignin failure", async () => {
    signIn.mockResolvedValue(
      response({ ok: false, error: "CredentialsSignin" }),
    );
    render(<LoginActions navigate={navigate} />);

    await userEvent.click(guestButton());

    expect(googleButton()).toBeEnabled();
    expect(guestButton()).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent(/again/i);
  });

  it("navigates to the URL returned by a successful sign-in", async () => {
    const providerUrl = "https://accounts.google.com/o/oauth2/auth?client=123";
    signIn.mockResolvedValue(response({ ok: true, url: providerUrl }));
    render(<LoginActions navigate={navigate} />);

    await userEvent.click(googleButton());

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(providerUrl));
    expect(screen.getByRole("status")).toHaveTextContent(/google/i);
  });

  it("reports a resolved success without a navigation URL as a failure", async () => {
    signIn.mockResolvedValue(response({ ok: true }));
    render(<LoginActions navigate={navigate} />);

    await userEvent.click(guestButton());

    expect(navigate).not.toHaveBeenCalled();
    expect(guestButton()).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent(/again/i);
  });
});
