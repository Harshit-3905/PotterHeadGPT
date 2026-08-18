# Database

← [Codebase guide](../codebase-guide.md)

**Purpose:** Relational storage for identity, chat history, citation snapshots, usage counters, and ingest metadata.

---

## Schema (`src/db/schema/`)

| File | Tables | Notes |
|------|--------|-------|
| `auth.ts` | `users`, `accounts`, `sessions`, `verification_tokens` | Auth.js adapter tables. `users.role` enum: `user` \| `admin`. `users.isGuest` bool. |
| `chat.ts` | `conversations`, `messages`, `message_citations` | Citations store `quoteSnapshot` + `metadataSnapshot`; `chunkId` is Qdrant UUID (no SQL FK). |
| `corpus.ts` | `documents` | Registry of ingested books (checksum, source path). Vectors live in Qdrant, not here. |
| `usage.ts` | `daily_usage` | `(userId, usageDate)` unique; atomic quota enforcement. |

---

## Queries (`src/db/queries/`)

| File | Key functions | Responsibility |
|------|---------------|----------------|
| `users.ts` | `findUserClaims()`, `createGuestUser()` | Load role/isGuest for JWT; insert anonymous guest rows. |
| `conversations.ts` | `createConversation()`, `findOwnedConversation()`, `listConversations()` | Ownership checks on every read/write; invalid UUID → not found. |
| `messages.ts` | `listRecentTurns()`, `persistExchange()`, `getConversationWithMessages()` | Saves user + assistant messages and citation rows; loads last 6 turns for prompt history. |
| `corpus.ts` | `hasIngestedDocuments()`, `findDocumentBySourcePath()`, `insertDocument()` | Empty-corpus detection for UI; ingest idempotency via checksum. |

---

## Infrastructure

| File | Key exports |
|------|-------------|
| `client.ts` | `getDatabaseConnection()` — singleton postgres.js + Drizzle |
| `migrate.ts` | Runs Drizzle migrations from `drizzle/` |
| `env.ts` | `loadEnvFiles()` — `.env.local` > process env > `.env` |

---

## Design choices

- **No pgvector:** Vectors in Qdrant keep OLTP schema small and re-ingest simple (delete points by `documentId`).
- **Quote snapshots:** Re-ingesting replaces Qdrant points; snapshots keep old footnotes stable.
- **Ownership in queries, not routes:** `findOwnedConversation` always filters by `userId` so cross-user access returns 404, not 403 (no information leak).

---

## Related

- [Qdrant](./qdrant.md) — vectors stored outside Postgres
- [Usage](./usage.md) — `daily_usage` table
- [Auth](./auth.md) — `users` / `accounts`
- [Interview questions — Architecture](./interview-questions.md#architecture--system-design)
