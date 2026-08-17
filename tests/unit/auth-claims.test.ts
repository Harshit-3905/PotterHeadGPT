// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  applyClaimsToSession,
  refreshTokenClaims,
  type UserClaims,
} from "@/auth/claims";
import type { UserRole } from "@/auth/roles";

function loader(claims: UserClaims | null) {
  return vi.fn(async () => claims);
}

describe("refreshTokenClaims", () => {
  it("copies the id and database claims on first sign-in", async () => {
    const loadClaims = loader({ role: "user", isGuest: true });

    const token = await refreshTokenClaims({
      token: { sub: "b3d1f2a4-1111-4222-8333-444455556666" },
      userId: "b3d1f2a4-1111-4222-8333-444455556666",
      loadClaims,
    });

    expect(token).toEqual({
      sub: "b3d1f2a4-1111-4222-8333-444455556666",
      id: "b3d1f2a4-1111-4222-8333-444455556666",
      role: "user",
      isGuest: true,
    });
    expect(loadClaims).toHaveBeenCalledWith(
      "b3d1f2a4-1111-4222-8333-444455556666",
    );
  });

  it("promotes a stale user token when the database role changed to admin", async () => {
    const token = await refreshTokenClaims({
      token: { id: "user-1", sub: "user-1", role: "user", isGuest: false },
      loadClaims: loader({ role: "admin", isGuest: false }),
    });

    expect(token?.role).toBe("admin");
  });

  it("demotes a stale admin token when the database role is user", async () => {
    const token = await refreshTokenClaims({
      token: { id: "user-1", sub: "user-1", role: "admin", isGuest: false },
      loadClaims: loader({ role: "user", isGuest: false }),
    });

    expect(token?.role).toBe("user");
  });

  it("refreshes isGuest from the database after a guest upgrade", async () => {
    const token = await refreshTokenClaims({
      token: { id: "user-1", sub: "user-1", role: "user", isGuest: true },
      loadClaims: loader({ role: "user", isGuest: false }),
    });

    expect(token?.isGuest).toBe(false);
  });

  it("falls back to the subject claim when no id claim is present", async () => {
    const loadClaims = loader({ role: "user", isGuest: false });

    await refreshTokenClaims({ token: { sub: "user-9" }, loadClaims });

    expect(loadClaims).toHaveBeenCalledWith("user-9");
  });

  it("invalidates the token when the user row no longer exists", async () => {
    const token = await refreshTokenClaims({
      token: { id: "deleted-user", sub: "deleted-user", role: "user" },
      loadClaims: loader(null),
    });

    expect(token).toBeNull();
  });

  it("invalidates the token when it carries no user id", async () => {
    const loadClaims = loader({ role: "admin", isGuest: false });

    const token = await refreshTokenClaims({ token: {}, loadClaims });

    expect(token).toBeNull();
    expect(loadClaims).not.toHaveBeenCalled();
  });
});

describe("refreshTokenClaims transient database failures", () => {
  const failingLoader = () =>
    vi.fn(async () => {
      throw new Error("write CONNECTION_ENDED");
    });

  it("keeps an already-claimed session alive when the lookup throws", async () => {
    const token = {
      id: "user-1",
      sub: "user-1",
      role: "admin" as const,
      isGuest: false,
    };

    const result = await refreshTokenClaims({
      token,
      loadClaims: failingLoader(),
    });

    expect(result).toEqual(token);
  });

  it("still clears the session when the user row is missing", async () => {
    const result = await refreshTokenClaims({
      token: {
        id: "user-1",
        sub: "user-1",
        role: "admin" as const,
        isGuest: false,
      },
      loadClaims: loader(null),
    });

    expect(result).toBeNull();
  });

  it("fails closed on first sign-in when the lookup throws", async () => {
    const result = await refreshTokenClaims({
      token: { sub: "user-1" },
      userId: "user-1",
      loadClaims: failingLoader(),
    });

    expect(result).toBeNull();
  });

  it("fails closed when the surviving token has no role", async () => {
    const result = await refreshTokenClaims({
      token: { id: "user-1", sub: "user-1", isGuest: false },
      loadClaims: failingLoader(),
    });

    expect(result).toBeNull();
  });

  it("fails closed when the surviving token carries an unknown role", async () => {
    const result = await refreshTokenClaims({
      token: { id: "user-1", sub: "user-1", role: "root", isGuest: false },
      loadClaims: failingLoader(),
    });

    expect(result).toBeNull();
  });

  it("fails closed when the surviving token has a non-boolean isGuest", async () => {
    const result = await refreshTokenClaims({
      token: { id: "user-1", sub: "user-1", role: "user", isGuest: "yes" },
      loadClaims: failingLoader(),
    });

    expect(result).toBeNull();
  });

  it("fails closed when the surviving token belongs to another user", async () => {
    const result = await refreshTokenClaims({
      token: {
        id: "user-1",
        sub: "user-1",
        role: "admin" as const,
        isGuest: false,
      },
      userId: "user-2",
      loadClaims: failingLoader(),
    });

    expect(result).toBeNull();
  });
});

describe("applyClaimsToSession", () => {
  it("exposes the database-backed claims on the session user", () => {
    const session: {
      user: { id: string; role: UserRole; isGuest: boolean; name: string };
      expires: string;
    } = {
      user: { id: "", role: "user", isGuest: true, name: "Guest" },
      expires: "2026-08-18T12:00:00.000Z",
    };

    const result = applyClaimsToSession({
      session,
      token: { id: "user-7", role: "admin", isGuest: false },
    });

    expect(result.user).toEqual({
      id: "user-7",
      role: "admin",
      isGuest: false,
      name: "Guest",
    });
  });

  it("refuses to build a session from a token without claims", () => {
    const session: {
      user: { id: string; role: UserRole; isGuest: boolean };
      expires: string;
    } = {
      user: { id: "", role: "user", isGuest: true },
      expires: "2026-08-18T12:00:00.000Z",
    };

    expect(() =>
      applyClaimsToSession({ session, token: { sub: "user-7" } }),
    ).toThrow(/claims/);
  });
});
