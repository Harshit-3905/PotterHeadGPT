// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const verifyGuestHandoffToken = vi.fn();
const mergeGuestIntoUser = vi.fn();

vi.mock("@/auth/config", () => ({ auth: () => auth() }));
vi.mock("@/auth/guest-handoff", () => ({
  verifyGuestHandoffToken: (token: string) =>
    verifyGuestHandoffToken(token),
}));
vi.mock("@/auth/merge-guest", () => ({
  mergeGuestIntoUser: (input: unknown) => mergeGuestIntoUser(input),
}));

import { GET } from "@/app/auth/complete/route";
import { GUEST_HANDOFF_COOKIE } from "@/auth/constants";

const guestId = "4f4c2b1e-4e2a-4a5f-9d51-1f2c3b4a5d6e";
const googleUserId = "9a2b3c4d-5555-4666-8777-888899990000";

afterEach(() => {
  vi.clearAllMocks();
});

describe("auth completion page", () => {
  it("verifies and consumes a valid handoff before entering chat", async () => {
    auth.mockResolvedValue({
      user: { id: googleUserId, isGuest: false, role: "user" },
    });
    verifyGuestHandoffToken.mockResolvedValue(guestId);
    mergeGuestIntoUser.mockResolvedValue(undefined);

    const response = await GET(requestWithHandoff("signed-handoff"));

    expect(mergeGuestIntoUser).toHaveBeenCalledWith({
      guestId,
      userId: googleUserId,
    });
    expect(response.headers.get("location")).toBe("http://localhost/chat");
    expect(response.headers.get("set-cookie")).toContain(
      `${GUEST_HANDOFF_COOKIE}=`,
    );
    expect(response.headers.get("set-cookie")).toContain(
      "Expires=Thu, 01 Jan 1970",
    );
  });

  it("does not merge a forged or expired handoff", async () => {
    auth.mockResolvedValue({
      user: { id: googleUserId, isGuest: false, role: "user" },
    });
    verifyGuestHandoffToken.mockResolvedValue(null);

    const response = await GET(requestWithHandoff("invalid-handoff"));

    expect(mergeGuestIntoUser).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost/chat");
    expect(response.headers.get("set-cookie")).toContain(
      "Expires=Thu, 01 Jan 1970",
    );
  });

  it("requires the completed Google session before merging", async () => {
    auth.mockResolvedValue(null);

    const response = await GET(requestWithHandoff("signed-handoff"));

    expect(verifyGuestHandoffToken).not.toHaveBeenCalled();
    expect(mergeGuestIntoUser).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost/login");
    expect(response.headers.get("set-cookie")).toContain(
      "Expires=Thu, 01 Jan 1970",
    );
  });
});

function requestWithHandoff(token: string): NextRequest {
  return new NextRequest("http://localhost/auth/complete", {
    headers: { cookie: `${GUEST_HANDOFF_COOKIE}=${token}` },
  });
}
