import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { createGuestUser, findUserClaims } from "@/db/queries/users";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { applyClaimsToSession, refreshTokenClaims } from "./claims";

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
  providers: [
    Google,
    Credentials({
      id: "guest",
      name: "Guest",
      // A guest signs in with no input at all; there is nothing to submit.
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
    }),
  ],
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
