# Interview questions

← [Codebase guide](../codebase-guide.md)

Questions a reviewer or interviewer might ask about this project, with concise answers grounded in the actual implementation.

---

## Architecture & system design

**Q: Why a monolith instead of separate ingest and chat services?**  
A: One repo deploys to Vercel with a single mental model. Ingest is a CLI run locally; chat is serverless API routes. Splitting would add ops cost without benefit at this scale — no multi-hop agents or heavy async jobs yet.

**Q: Why Postgres and Qdrant instead of pgvector alone?**  
A: Postgres owns ACID transactions for auth, merge, and quotas. Qdrant owns vector indexing and makes re-ingest trivial (delete points by `documentId`). Keeping vectors out of Postgres avoids bloating the OLTP schema and migration surface.

**Q: How do you prevent hallucinated citations?**  
A: Three layers: (1) similarity threshold — refuse if `max(score) < RAG_SCORE_THRESHOLD`; (2) prompt requires `[n]` markers tied to provided passages; (3) server-side validation — `extractCitationOrdinals` must find at least one valid marker or the answer becomes `BOOKS_REFUSAL`.

**Q: What happens when the corpus is re-ingested?**  
A: Changed checksum → delete Qdrant points for that `documentId`, upsert new chunks, update `documents` row. Old assistant messages still show correct footnotes via `message_citations.quoteSnapshot` stored at answer time.

---

## Auth & identity

**Q: Why JWT sessions instead of database sessions?**  
A: Auth.js requires JWT when using a Credentials provider for guests. Google users also get JWTs; the Drizzle adapter still persists `users` and `accounts` in Postgres.

**Q: How does guest → Google merge work without history theft?**  
A: Before OAuth, `createGuestHandoffToken` signs the guest user id into an httpOnly cookie. After Google callback, `/auth/complete` verifies the JWT (10-minute TTL, HS256 with `AUTH_SECRET`). Only then does `mergeGuestIntoUser` reassign conversations. Raw guest ids from the client are never trusted.

**Q: Why sign out the guest before Google OAuth?**  
A: Auth.js would otherwise link Google to the guest user row. The merge expects a fresh Google user as the destination.

**Q: How is admin access granted?**  
A: Only via SQL: `UPDATE users SET role = 'admin' WHERE email = '…'`. JWT refresh reads role from DB every request — client claims are ignored (`roleFromDatabase`, `refreshTokenClaims`).

---

## RAG & retrieval

**Q: Walk through the RAG pipeline for one question.**  
A: Topic guard → embed question (`text-embedding-3-small`, 1536d) → Qdrant top-k cosine search → threshold check → build prompt with numbered passages + last 6 turns → stream `gpt-4o-mini` → validate citation ordinals → persist answer + citation snapshots.

**Q: Why a topic guard if retrieval already filters irrelevant content?**  
A: Saves embedding and Qdrant cost on clearly off-topic input (e.g. "capital of France"). Returns a fixed refusal without touching the vector store.

**Q: How would you improve retrieval quality?**  
A: Hybrid BM25 + vector search, reranking (cross-encoder), metadata filters (book/chapter), query expansion, or tuning chunk size/overlap via the eval suite (`pnpm eval`).

**Q: What embedding model and why?**  
A: OpenAI `text-embedding-3-small` at 1536 dimensions — good cost/quality tradeoff; matches Qdrant collection config in `ensureBookChunksCollection`.

---

## Quotas, security & abuse

**Q: How do daily limits work under concurrent requests?**  
A: `reserveMessage` uses Postgres `INSERT … ON CONFLICT DO UPDATE SET message_count = message_count + 1 WHERE message_count < limit RETURNING …`. If no row returns, the request gets 429 before OpenAI is called.

**Q: What if generation fails after quota is reserved?**  
A: `releaseMessage` decrements the counter in a `finally`-style path so failed attempts don't permanently consume quota.

**Q: How do you isolate user data?**  
A: Every conversation query includes `userId` from the session. Another user's id returns 404 (not 403). Invalid UUIDs rejected early.

**Q: What do you log in production?**  
A: Request id, hashed user id, route, status, latency, error code — never prompts, answers, passage text, or secrets (`logApiRequest` in `src/lib/http.ts`).

---

## Frontend & streaming

**Q: Why NDJSON instead of Server-Sent Events?**  
A: Typed discrete events (`citations`, `usage`, `done`) are easier to parse than interleaving metadata into an SSE text stream. Client uses `readChatNdjson` async iterator.

**Q: How does the UI show citations?**  
A: Assistant markdown contains `[1]` markers. `tokenizeMessageContent` splits text vs markers. `CitationFootnotes` renders expandable panels from persisted `CitationPayload` (quote + book/chapter).

---

## Testing & quality

**Q: How do you test RAG without OpenAI in CI?**  
A: `isTestRagProvider()` activates when `POTTERHEAD_E2E=1`. `createTestGroundedAnswerGenerator` returns deterministic cited answers. Playwright runs against this; unit tests mock `GenerateDeps` directly.

**Q: What does the eval suite measure?**  
A: Retrieval hit rate (expected terms in retrieved content), citation presence (`[n]` markers when expected), refusal accuracy (exact refusal strings). See [evals/README.md](../../evals/README.md).

**Q: How would you add conversation memory beyond 6 turns?**  
A: Increase `HISTORY_TURN_LIMIT` in `messages.ts` or add summarization — trade-off is prompt size vs coherence. Currently last 6 turns are passed to `buildGroundedPrompt`.

---

## Trade-offs & extensions

**Q: What would you add next?**  
A: Chapter/book filters, hybrid search, reranking, admin ingest UI, or LangGraph for multi-hop retrieval — each deferred in the design spec to keep v1 shippable.

**Q: What are the main limitations?**  
A: Single similarity pass (no rerank), shared 5/day quota for guests and users, no upload UI, English-only corpus assumed, topic guard adds latency on every question.

**Q: Why LangChain.js instead of calling OpenAI directly?**  
A: Document loaders, text splitters, embedding wrappers, and streaming abstractions speed up ingest and RAG wiring; LangSmith tracing is optional via `tracing.ts`.

---

## Module cross-reference

| Topic | Deep dive |
|-------|-----------|
| Auth flows | [auth.md](./auth.md) |
| RAG pipeline | [rag.md](./rag.md) |
| Streaming / UI | [chat.md](./chat.md) |
| Quotas | [usage.md](./usage.md) |
| Security | [http-security.md](./http-security.md) |
| CI / E2E | [tests.md](./tests.md) |
