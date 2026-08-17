"use server";

import { cookies } from "next/headers";
import { auth, signIn, signOut } from "./config";
import {
  GUEST_HANDOFF_COOKIE,
  GUEST_HANDOFF_MAX_AGE_SECONDS,
} from "./constants";
import { createGuestHandoffToken } from "./guest-handoff";

export async function beginGoogleUpgrade(): Promise<void> {
  const session = await auth();

  if (!session?.user?.id || !session.user.isGuest) {
    throw new Error("A guest session is required to start an account upgrade.");
  }

  const handoff = await createGuestHandoffToken(session.user.id);
  const cookieStore = await cookies();
  cookieStore.set(GUEST_HANDOFF_COOKIE, handoff, {
    httpOnly: true,
    maxAge: GUEST_HANDOFF_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  // Auth.js treats a live session as "link this OAuth account onto the current
  // user". The guest JWT has to be gone before Google starts, or Google is
  // attached to the guest row and `/auth/complete` never sees a mergeable user.
  await signOut({ redirect: false });
  await signIn("google", { redirectTo: "/auth/complete" });
}

export async function signOutToLogin(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
