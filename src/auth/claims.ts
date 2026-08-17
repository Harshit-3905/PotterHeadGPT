import { isUserRole, type UserRole } from "./roles";

export type UserClaims = {
  role: UserRole;
  isGuest: boolean;
};

export type UserClaimsLoader = (userId: string) => Promise<UserClaims | null>;

export type TokenClaims = UserClaims & { id: string };

/**
 * Auth.js tokens are `Record<string, unknown>` at runtime, so every claim is
 * treated as untrusted input until `readTokenClaims` validates it.
 */
type ClaimedToken = {
  id?: unknown;
  sub?: unknown;
  role?: unknown;
  isGuest?: unknown;
};

function readTokenClaims(token: ClaimedToken): TokenClaims | null {
  const { id, role, isGuest } = token;

  return typeof id === "string" &&
    id !== "" &&
    isUserRole(role) &&
    typeof isGuest === "boolean"
    ? { id, role, isGuest }
    : null;
}

function readUserId(candidate: unknown): string | null {
  return typeof candidate === "string" && candidate !== "" ? candidate : null;
}

/**
 * Re-reads `role` and `isGuest` from the database on every JWT callback so a
 * manual `update users set role = 'admin'` takes effect on the next request
 * instead of waiting for the user to sign out and back in.
 *
 * The three outcomes are deliberately distinct:
 * - the user row is gone (`loadClaims` resolves `null`): return `null` so
 *   Auth.js drops the session cookie, e.g. after a guest is merged away;
 * - the lookup throws (database blip): keep an already-established session
 *   alive on its existing validated claims, since a transient outage should not
 *   sign everyone out;
 * - the lookup throws and there are no trustworthy claims yet (first sign-in,
 *   corrupt token, or a token for a different user): fail closed.
 */
export async function refreshTokenClaims<Token extends ClaimedToken>({
  token,
  userId,
  loadClaims,
}: {
  token: Token;
  userId?: string | null;
  loadClaims: UserClaimsLoader;
}): Promise<Token | null> {
  const resolvedUserId =
    readUserId(userId) ?? readUserId(token.id) ?? readUserId(token.sub);

  if (!resolvedUserId) {
    return null;
  }

  let claims: UserClaims | null;

  try {
    claims = await loadClaims(resolvedUserId);
  } catch {
    const established = readTokenClaims(token);

    return established?.id === resolvedUserId ? token : null;
  }

  if (!claims) {
    return null;
  }

  token.id = resolvedUserId;
  token.role = claims.role;
  token.isGuest = claims.isGuest;

  return token;
}

export function applyClaimsToSession<
  Session extends { user: { id: string; role: UserRole; isGuest: boolean } },
>({ session, token }: { session: Session; token: ClaimedToken }): Session {
  const claims = readTokenClaims(token);

  if (!claims) {
    // `refreshTokenClaims` returns null rather than a claimless token, so a
    // session token without claims means the two callbacks fell out of sync.
    throw new Error("Session token is missing database-backed claims.");
  }

  session.user.id = claims.id;
  session.user.role = claims.role;
  session.user.isGuest = claims.isGuest;

  return session;
}
