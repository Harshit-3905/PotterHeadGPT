// @vitest-environment node
import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createGuestHandoffToken,
  verifyGuestHandoffToken,
} from "@/auth/guest-handoff";

const AUTH_SECRET = "test-auth-secret-value-that-is-long-enough";
const GUEST_ID = "4f4c2b1e-4e2a-4a5f-9d51-1f2c3b4a5d6e";
const NOW = new Date("2026-08-17T12:00:00.000Z");

function minutesAfter(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

async function signCustomToken(payload: {
  subject: string;
  secret?: string;
  issuer?: string;
  audience?: string;
}): Promise<string> {
  const secret = new TextEncoder().encode(payload.secret ?? AUTH_SECRET);

  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.subject)
    .setIssuer(payload.issuer ?? "potterheadgpt")
    .setAudience(payload.audience ?? "guest-upgrade")
    .setIssuedAt(NOW)
    .setExpirationTime(minutesAfter(NOW, 10))
    .sign(secret);
}

describe("guest handoff tokens", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", AUTH_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips the guest id from a fresh token", async () => {
    const token = await createGuestHandoffToken(GUEST_ID, NOW);

    await expect(verifyGuestHandoffToken(token, NOW)).resolves.toBe(GUEST_ID);
  });

  it("rejects a modified token", async () => {
    const token = await createGuestHandoffToken(GUEST_ID, NOW);
    const tampered = token.endsWith("A")
      ? `${token.slice(0, -1)}B`
      : `${token.slice(0, -1)}A`;

    await expect(verifyGuestHandoffToken(tampered, NOW)).resolves.toBeNull();
  });

  it("rejects a token older than ten minutes", async () => {
    const token = await createGuestHandoffToken(GUEST_ID, NOW);

    await expect(
      verifyGuestHandoffToken(token, minutesAfter(NOW, 11)),
    ).resolves.toBeNull();
  });

  it("accepts a token that is still inside the ten minute window", async () => {
    const token = await createGuestHandoffToken(GUEST_ID, NOW);

    await expect(
      verifyGuestHandoffToken(token, minutesAfter(NOW, 9)),
    ).resolves.toBe(GUEST_ID);
  });

  it("rejects a non-UUID payload", async () => {
    const token = await signCustomToken({ subject: "not-a-uuid" });

    await expect(verifyGuestHandoffToken(token, NOW)).resolves.toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signCustomToken({
      subject: GUEST_ID,
      secret: "another-secret-value-that-is-long-enough",
    });

    await expect(verifyGuestHandoffToken(token, NOW)).resolves.toBeNull();
  });

  it("rejects a token issued for a different audience", async () => {
    const token = await signCustomToken({
      subject: GUEST_ID,
      audience: "some-other-audience",
    });

    await expect(verifyGuestHandoffToken(token, NOW)).resolves.toBeNull();
  });

  it("rejects a token issued by a different issuer", async () => {
    const token = await signCustomToken({
      subject: GUEST_ID,
      issuer: "someone-else",
    });

    await expect(verifyGuestHandoffToken(token, NOW)).resolves.toBeNull();
  });

  it("rejects garbage that is not a token at all", async () => {
    await expect(verifyGuestHandoffToken("nonsense", NOW)).resolves.toBeNull();
  });

  it("fails loudly when AUTH_SECRET is missing", async () => {
    vi.stubEnv("AUTH_SECRET", "");

    await expect(createGuestHandoffToken(GUEST_ID, NOW)).rejects.toThrow(
      /AUTH_SECRET/,
    );
  });
});
