# PotterHeadGPT — Codebase Guide

A newcomer-oriented map of every major component: which files exist, what each function does, why it was built that way, and how data moves through the system.

For high-level architecture rationale, see [architecture.md](./architecture.md). For setup and deployment, see the root [README.md](../README.md).

---

## How to read this guide

1. Start with [System at a glance](#system-at-a-glance) and [End-to-end request flows](#end-to-end-request-flows).
2. Open the module doc for your task (links below).
3. Use the [File index](#file-index) as a quick lookup table.
4. Review [Interview questions](./modules/interview-questions.md) when preparing to discuss the project.

---

## Module docs

| Module | Doc | What it covers |
|--------|-----|----------------|
| Auth | [modules/auth.md](./modules/auth.md) | Guest + Google OAuth, JWT claims, guest merge |
| Database | [modules/database.md](./modules/database.md) | Schema, queries, migrations, design choices |
| Qdrant | [modules/qdrant.md](./modules/qdrant.md) | Vector collection, upsert, search |
| RAG | [modules/rag.md](./modules/rag.md) | Retrieval, generation, citations, topic guard |
| Chat | [modules/chat.md](./modules/chat.md) | API routes, streaming, UI components |
| Usage | [modules/usage.md](./modules/usage.md) | Daily quotas, atomic reservation |
| HTTP / security | [modules/http-security.md](./modules/http-security.md) | Error codes, headers, audit logging |
| App pages | [modules/app-pages.md](./modules/app-pages.md) | Routes, layouts, SSR shell loading |
| Scripts | [modules/scripts.md](./modules/scripts.md) | prepare-books, ingest, eval CLIs |
| Tests | [modules/tests.md](./modules/tests.md) | Unit, integration, E2E, eval fixtures |
| Configuration | [modules/configuration.md](./modules/configuration.md) | Env vars and tunables |
| Interview Q&A | [modules/interview-questions.md](./modules/interview-questions.md) | Questions and answers about the project |

---

## System at a glance

PotterHeadGPT is a **Next.js monolith** that answers Harry Potter questions with **cited book passages** or an honest refusal. Four external services do the heavy lifting:

| Service | Role |
|---------|------|
| **Postgres (Neon)** | Users, auth, conversations, messages, citation snapshots, daily usage, document registry |
| **Qdrant** | Chunk text + 1536-d embeddings; cosine similarity search |
| **OpenAI** | `text-embedding-3-small` (retrieve), `gpt-4o-mini` (answer + topic guard) |
| **Google OAuth** | Sign-in and guest → account upgrade |

```
┌─────────────┐     ┌──────────────────────────────────────┐     ┌─────────────┐
│   Browser   │────▶│  Next.js (pages + API routes)        │────▶│  Postgres   │
│  React UI   │◀────│  Auth.js · chat · usage · Drizzle    │◀────│  app data   │
└─────────────┘     └──────────────┬───────────────────────┘     └─────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              ┌─────────┐   ┌───────────┐   ┌──────────┐
              │ Qdrant  │   │  OpenAI   │   │  Google  │
              │ vectors │   │ embed+chat│   │  OAuth   │
              └─────────┘   └───────────┘   └──────────┘

scripts/prepare-books.ts  →  scripts/ingest.ts  →  Postgres + Qdrant
scripts/eval.ts           →  golden-set metrics (local/CI)
```

---

## End-to-end request flows

### Flow 1 — Guest login → first question

```
/login
  LoginActions.start("guest")
    → signIn("guest")                    [next-auth/react]
    → guestProvider.authorize()          [auth/config.ts]
    → createGuestUser()                  [db/queries/users.ts]
    → refreshTokenClaims()               [auth/claims.ts]  — JWT with role, isGuest
  redirect /chat

/chat
  loadChatShell(session)                 [chat/load-shell.ts]
    → getUsageStatus, listConversations, hasIngestedDocuments
  render <ChatShell />

User submits question
  ChatShell.send()
    → POST /api/chat { message }
    → prepareChatRequest()               [chat/handle-chat.ts]
    → reserveMessage()                   [usage/daily-limit.ts]
    → resolveGroundedAnswerGenerator()   [rag/provider.ts]
    → generateGroundedAnswer()           [rag/generate.ts]
    → persistExchange()                  [db/queries/messages.ts]
    → NDJSON stream to browser           [chat/stream.ts]
  readChatNdjson() parses events         [chat/read-ndjson.ts]
  MessageContent renders [1] footnotes   [components/chat/message-content.tsx]
```

See [modules/auth.md](./modules/auth.md), [modules/chat.md](./modules/chat.md), [modules/rag.md](./modules/rag.md).

### Flow 2 — Guest upgrades to Google (history merge)

```
ChatShell → beginGoogleUpgrade()         [auth/actions.ts]
  → createGuestHandoffToken(guestId)     [auth/guest-handoff.ts]
  → set cookie guest_handoff
  → signOut({ redirect: false })        — critical: drop guest JWT before OAuth
  → signIn("google", redirectTo: /auth/complete)

/auth/complete GET                       [app/auth/complete/route.ts]
  → verifyGuestHandoffToken(cookie)
  → mergeGuestIntoUser()                 [auth/merge-guest.ts]
  → redirect /chat
```

See [modules/auth.md](./modules/auth.md).

### Flow 3 — Book ingestion (offline CLI)

```
pnpm prepare-books -- --path books/raw --out books/prepared
  → extract PDF/txt, detect chapters, clean text
  → books/prepared/{slug}/manifest.json + chapter .txt files

pnpm ingest -- --path books/prepared
  → ensureBookChunksCollection()         [qdrant/collections.ts]
  → for each book: checksum skip/replace
  → splitChapterChunks() + embed         [scripts/lib/chunk.ts]
  → upsertChunks() → Qdrant              [qdrant/chunks.ts]
  → insertDocument() → Postgres          [db/queries/corpus.ts]
```

See [modules/scripts.md](./modules/scripts.md), [modules/qdrant.md](./modules/qdrant.md), [modules/database.md](./modules/database.md).

---

## File index

Quick lookup — primary entry point per concern:

| Concern | Start here |
|---------|------------|
| "Where does chat start?" | `src/app/api/chat/route.ts` → `prepareChatRequest` → `generateGroundedAnswer` |
| "Where are citations saved?" | `src/db/queries/messages.ts` → `persistExchange` |
| "Where is retrieval?" | `src/rag/retrieve.ts` → `src/qdrant/chunks.ts` → `searchChunks` |
| "Where is auth configured?" | `src/auth/config.ts` |
| "Where is guest merge?" | `src/auth/merge-guest.ts` + `src/app/auth/complete/route.ts` |
| "Where is the UI stream consumer?" | `src/components/chat/chat-shell.tsx` → `readChatNdjson` |
| "Where is ingest?" | `scripts/ingest.ts` |
| "Where are migrations?" | `drizzle/` + `src/db/migrate.ts` |

---

## Related docs

- [architecture.md](./architecture.md) — design rationale (monolith, dual store, snapshots, quotas)
- [../README.md](../README.md) — setup, deploy, eval results, resume bullets
- [../evals/README.md](../evals/README.md) — golden dataset schema and metrics
