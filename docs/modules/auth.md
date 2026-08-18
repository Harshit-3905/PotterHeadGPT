# Auth

← [Codebase guide](../codebase-guide.md)

**Purpose:** Identify users (guest or Google), enforce roles from the database, and securely merge guest history into a real account.

---

## Files and functions

| File | Key exports | What it does |
|------|-------------|--------------|
| `src/auth/config.ts` | `handlers`, `auth`, `signIn`, `signOut` | NextAuth v5 setup: Google OAuth, guest Credentials provider, optional `e2e-admin` (test only). JWT session strategy + Drizzle adapter. |
| `src/auth/claims.ts` | `refreshTokenClaims()`, `applyClaimsToSession()` | On every JWT callback, re-reads `role` and `isGuest` from Postgres so admin promotion/demotion takes effect without re-login. |
| `src/auth/roles.ts` | `roleFromDatabase()`, `isAdmin()`, `ignoreClientRoleClaim()` | Role is **never** taken from client/OAuth profile — only from `users.role` column. |
| `src/auth/guest-handoff.ts` | `createGuestHandoffToken()`, `verifyGuestHandoffToken()` | Short-lived HS256 JWT proving the caller owned a guest session before Google OAuth. |
| `src/auth/merge-guest.ts` | `mergeGuestIntoUser()`, `mergeGuestIntoUserWithDatabase()` | Transaction: reassign conversations, sum daily usage, delete guest user. |
| `src/auth/actions.ts` | `beginGoogleUpgrade()`, `signOutToLogin()` | Server actions: mint handoff cookie, sign out guest, start Google OAuth. |
| `src/auth/constants.ts` | `GUEST_HANDOFF_COOKIE`, `GUEST_HANDOFF_MAX_AGE_SECONDS` | Cookie name and 10-minute handoff TTL. |
| `src/auth/e2e.ts` | `E2E_ADMIN_ID`, `isE2eAuthEnabled()` | Test-only admin sign-in when `POTTERHEAD_E2E=1`. |
| `src/app/auth/complete/route.ts` | `GET` | Post-OAuth landing: verify handoff, merge, redirect `/chat`. |
| `src/app/api/auth/[...nextauth]/route.ts` | `GET`, `POST` | Auth.js HTTP handlers. |
| `src/components/auth/login-actions.tsx` | `LoginActions` | Client buttons: guest, Google, e2e-admin (test). |

---

## Flow — guest login

```
/login → LoginActions.start("guest")
  → signIn("guest")
  → guestProvider.authorize() in config.ts
  → createGuestUser() in db/queries/users.ts
  → refreshTokenClaims() — JWT with role, isGuest
  → redirect /chat
```

---

## Flow — guest → Google upgrade

```
ChatShell → beginGoogleUpgrade() in auth/actions.ts
  → createGuestHandoffToken(guestId)
  → set httpOnly cookie guest_handoff
  → signOut({ redirect: false })   ← drop guest JWT before OAuth
  → signIn("google", redirectTo: /auth/complete)

/auth/complete GET
  → verifyGuestHandoffToken(cookie)
  → mergeGuestIntoUser()
  → redirect /chat
```

---

## Design choices

- **JWT sessions, not DB sessions:** Auth.js requires JWT when using a Credentials-style guest provider. Guests are still persisted as `users` rows.
- **Sign out before Google OAuth:** If the guest JWT stays active during OAuth, Google gets linked to the guest row and merge breaks.
- **Handoff token, not raw guest id:** Prevents an attacker from submitting someone else's guest id after sign-in.
- **DB refresh on every request:** Stale JWT admin claims are demoted if `users.role` changes in SQL.

---

## Related

- [Database](./database.md) — `users`, `accounts` tables
- [Chat](./chat.md) — guest upgrade CTA in `ChatShell`
- [Interview questions — Auth & identity](./interview-questions.md#auth--identity)
