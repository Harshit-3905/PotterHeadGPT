import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import { db } from "@/db";
import { createGuestUser, findUserClaims } from "@/db/queries/users";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { E2E_ADMIN_ID, isE2eAuthEnabled } from "./e2e";
import { applyClaimsToSession, refreshTokenClaims } from "./claims";

const guestProvider = Credentials({
  id: "guest",
  name: "Guest",
  credentials: {},
  authorize: async () => {
    const guest = await createGuestUser();

    return {
      id: guest.id,
      name: "Guest",
      isGuest: guest.isGuest,
      role: guest.role,
    };
  },
});

const e2eAdminProvider = Credentials({
  id: "e2e-admin",
  name: "E2E Admin",
  credentials: {},
  authorize: async () => {
    const [admin] = await db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        isGuest: users.isGuest,
      })
      .from(users)
      .where(eq(users.id, E2E_ADMIN_ID))
      .limit(1);

    if (!admin) {
      return null;
    }

    return {
      id: admin.id,
      name: admin.name ?? "E2E Admin",
      isGuest: admin.isGuest,
      role: admin.role,
    };
  },
});

const providers: Provider[] = [Google, guestProvider];
if (isE2eAuthEnabled()) {
  providers.push(e2eAdminProvider);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // The guest provider is credentials-based, which Auth.js only supports with
  // JWT sessions.
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    jwt: ({ token, user }) =>
      refreshTokenClaims({
        token,
        userId: user?.id,
        loadClaims: findUserClaims,
      }),
    session: ({ session, token }) => applyClaimsToSession({ session, token }),
  },
});
