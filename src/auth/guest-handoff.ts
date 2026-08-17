import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

const ISSUER = "potterheadgpt";
const AUDIENCE = "guest-upgrade";
const MAX_AGE_SECONDS = 10 * 60;
const ALGORITHM = "HS256";

const guestIdSchema = z.uuid();

function signingKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set; cannot sign guest handoff tokens.",
    );
  }

  return new TextEncoder().encode(secret);
}

/**
 * Signs a short-lived proof that the caller owned a given guest session, so the
 * post-Google-sign-in merge can trust the guest id without accepting it raw
 * from the client.
 */
export async function createGuestHandoffToken(
  guestId: string,
  now: Date = new Date(),
): Promise<string> {
  const key = signingKey();
  const expiresAt = new Date(now.getTime() + MAX_AGE_SECONDS * 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(guestIdSchema.parse(guestId))
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(key);
}

/** Returns the guest id carried by a valid token, or `null` for any failure. */
export async function verifyGuestHandoffToken(
  token: string,
  now: Date = new Date(),
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
      maxTokenAge: MAX_AGE_SECONDS,
      clockTolerance: 0,
      currentDate: now,
      requiredClaims: ["sub", "iat", "exp"],
    });
    const guestId = guestIdSchema.safeParse(payload.sub);

    return guestId.success ? guestId.data : null;
  } catch {
    return null;
  }
}
