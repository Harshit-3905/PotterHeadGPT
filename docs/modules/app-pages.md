# App pages

← [Codebase guide](../codebase-guide.md)

**Purpose:** Next.js App Router pages, layouts, and SSR entry points for the UI.

---

## Routes

| Path | File | Behavior |
|------|------|----------|
| `/` | `src/app/page.tsx` | Landing page (`LandingPage`). |
| `/login` | `src/app/login/page.tsx` | Login; redirects if session exists. |
| `/chat` | `src/app/chat/page.tsx` | New chat shell. |
| `/chat/[conversationId]` | `src/app/chat/[conversationId]/page.tsx` | Existing thread shell. |

---

## Auth routes

| Path | File | Behavior |
|------|------|----------|
| `/auth/complete` | `src/app/auth/complete/route.ts` | Post-OAuth: verify guest handoff, merge, redirect `/chat`. |
| `/api/auth/[...nextauth]` | `src/app/api/auth/[...nextauth]/route.ts` | Auth.js handlers. |

---

## SSR shell loading

Both `/chat` and `/chat/[conversationId]` call `loadChatShell(session)` from `src/chat/load-shell.ts` before rendering `<ChatShell />`. That loads:

- Session user id and role
- Daily usage status
- Conversation list for sidebar
- Whether any documents are ingested (empty-corpus banner)

---

## Layout

| File | Role |
|------|------|
| `src/app/layout.tsx` | Root layout, fonts, providers |
| `src/app/globals.css` | Global styles |

---

## Related

- [Auth](./auth.md) — login and OAuth complete
- [Chat](./chat.md) — `ChatShell` and components
