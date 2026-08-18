# Architecture

Design notes for PotterHeadGPT — why the system is shaped the way it is.

## Monolith over microservices

PotterHeadGPT is a single Next.js App Router application: UI, Auth.js, API routes, Drizzle queries, retrieval, and generation all live in one deployable unit on Vercel.

**Why:** A portfolio RAG project needs to be cloneable, runnable, and reviewable in one sitting. Splitting ingest workers, vector services, and chat APIs across repos adds operational surface without improving the demo story. LangChain.js runs comfortably inside route handlers and CLI scripts; there is no multi-hop agent graph that would justify LangGraph or a separate Python worker.

```
Browser ──▶ Next.js (UI + API + Auth.js)
                ├──▶ Postgres (Neon)     users, sessions, chat, usage
                ├──▶ Qdrant Cloud        chunk vectors + passage text
                └──▶ OpenAI              embeddings + gpt-4o-mini
scripts/ingest.ts ──▶ same Postgres + Qdrant + OpenAI
```

## Postgres for app data, Qdrant for vectors

Relational data — users, OAuth accounts, conversations, messages, daily usage counters, and a `documents` registry — lives in Postgres via Drizzle. Chunk text and 1536-dimensional embeddings live in a Qdrant collection (`book_chunks`).

**Why split stores:**

| Concern | Postgres | Qdrant |
|---------|----------|--------|
| ACID transactions for auth, merge, quotas | ✓ | |
| Foreign keys on chat history | ✓ | |
| Cosine similarity at scale | | ✓ |
| Payload filters on book/chapter | | ✓ |
| Re-ingest without touching chat schema | | ✓ |

pgvector was considered early but dropped: Qdrant gives dedicated vector indexing, simpler re-ingestion (delete points by `documentId`), and keeps the OLTP schema small. The `documents` table tracks checksums and metadata; Qdrant point IDs are UUIDs referenced from `message_citations` without a SQL foreign key.

## Quote snapshots for citation integrity

When an assistant message is saved, each citation stores:

- `chunkId` — Qdrant point UUID at answer time
- `quoteSnapshot` — the passage text shown to the user
- `metadataSnapshot` — book and chapter labels

**Why:** Re-ingesting a book replaces Qdrant points. Without snapshots, old answers would point at missing or different chunks. Snapshots make historical citations stable and auditable even when the corpus changes underneath.

## Atomic usage reservation

Non-admin users share a daily message budget (`DAILY_MESSAGE_LIMIT`, default 5). Before generation starts, the chat API calls `reserveMessage`, which upserts a `daily_usage` row with:

```sql
INSERT … ON CONFLICT DO UPDATE
  SET message_count = message_count + 1
  WHERE message_count < limit
  RETURNING message_count
```

If the update matches zero rows (already at cap), the request returns 429 without calling OpenAI. Admins skip the counter entirely. On generation failure, `releaseMessage` decrements the count so a failed attempt does not consume quota.

**Why:** Increment-then-check races allow burst overages under concurrent requests. The conditional upsert makes the cap enforcement atomic in Postgres.

## JWT sessions for guests

Auth.js uses JWT sessions (not database sessions) because the guest provider is Credentials-based — Auth.js requires JWT strategy for Credentials providers.

Guests are real `users` rows with `isGuest = true`. Signed-in users use Google OAuth through the Drizzle adapter. Both paths expose `role` on the session for API and UI checks.

## Signed handoff for guest → Google merge

When a guest clicks “Continue with Google”, the app mints a short-lived HS256 JWT (`createGuestHandoffToken`) bound to the guest user id. After OAuth completes, `/auth/complete` verifies the token before calling `mergeGuestIntoUser`.

**Why:** The client must not supply a raw guest id — an attacker could attach someone else’s history. The signed token proves the caller owned the guest session within a 10-minute window. Tampered or expired tokens are rejected; merge is skipped safely.

Merge runs in a transaction: reassign conversations, sum today’s usage into the destination user, delete the guest user row. Running twice is idempotent.

## Low-score retrieval refusal

Every question follows:

1. Topic guard — off-topic questions get a fixed refusal without retrieval cost when possible.
2. Embed the question → Qdrant top-k search.
3. If `max(score) < RAG_SCORE_THRESHOLD` (default 0.72) → exact refusal: *“I couldn’t find this in the books.”*
4. Otherwise → prompt with numbered passages, stream an answer, validate `[n]` markers against retrieved ordinals.
5. If the model omits valid citations → treat as uncited and refuse.

**Why:** Similarity threshold is the primary hallucination guardrail. Citation validation catches models that answer confidently without grounding markers. Together they prioritize “I don’t know” over invented lore.

## Module map

| Module | Responsibility |
|--------|----------------|
| `src/db` | Drizzle schema, migrations, queries |
| `src/qdrant` | Collection ensure, chunk upsert/search |
| `src/auth` | Auth.js config, guest handoff, merge, roles |
| `src/usage` | Daily counters and quota status |
| `scripts/ingest` | Prepare → chunk → embed → upsert |
| `src/rag` | Retrieve, prompt, generate, cite, refuse |
| `src/chat` | Stream handler, persistence orchestration |
| `src/app/api` | HTTP boundaries with validation |
| `scripts/eval` | Golden-set regression metrics |

## Security posture (v1)

- Request body capped at 2,000 characters; stable error codes, no stack traces to clients.
- Conversation reads/writes scoped to session user id.
- Admin role set only via SQL — never from client input or env allowlists.
- Auth, chat, and history responses use `Cache-Control: no-store`.
- Production logs record request id and latency, not prompts, answers, or passage text.

See the implementation plan for deferred work: hybrid search, reranking, chapter filters, admin upload UI, LangGraph multi-hop.
