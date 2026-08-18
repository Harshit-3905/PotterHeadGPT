# PotterHeadGPT

**A multi-user cited RAG chat over the Harry Potter books — every answer links to the passages it was drawn from, or refuses honestly when the text does not support an answer.**

**Live demo:** [potterhead-gpt.harshitjoshi.dev](https://potterhead-gpt.harshitjoshi.dev)

---

## Technical highlights

- **Cited RAG pipeline** — LangChain.js retrieval → numbered-passage prompt → streamed `gpt-4o-mini` answer with validated `[n]` markers
- **Dual-store architecture** — Postgres (Neon) for auth, chat, and quotas; Qdrant for chunk vectors and passage text
- **Grounded refusal** — similarity threshold + citation validation; exact copy: _“I couldn't find this in the books.”_
- **Multi-user auth** — Auth.js with Google OAuth, persistent guest sessions (JWT), signed handoff for history merge
- **Atomic daily quotas** — conditional Postgres upsert enforces 5 messages/day for all non-admins; admin bypass via DB role
- **Idempotent ingest CLI** — checksum-based skip/replace for `.txt` / `.epub` / `.pdf`; no copyrighted corpus in git
- **Eval regression suite** — `pnpm eval` reports retrieval hit rate, citation compliance, and refusal accuracy

**Stack:** Next.js App Router · TypeScript · LangChain.js · Auth.js · Drizzle · Postgres · Qdrant · OpenAI · Tailwind · Vitest · Playwright

---

## Architecture

```
┌──────────────┐      ┌─────────────────────────────────┐      ┌──────────────────┐
│  Browser     │─────▶│  Next.js App Router             │─────▶│  Postgres (Neon) │
│  Chat UI     │◀─────│  Auth.js · API routes · RAG     │◀─────│  app + auth data │
└──────────────┘      └───────────────┬─────────────────┘      └──────────────────┘
                                      │
                                      ├────────────────────────▶┌──────────────────┐
                                      │                         │  Qdrant Cloud    │
                                      │                         │  chunk vectors   │
                                      ▼                         └──────────────────┘
                          ┌───────────────────────┐
                          │  OpenAI               │
                          │  embeddings + chat    │
                          └───────────────────────┘

scripts/ingest.ts  →  prepare → split → embed → upsert Qdrant + documents row
```

Deeper design rationale: [docs/architecture.md](./docs/architecture.md)

New to the codebase? Start at [docs/codebase-guide.md](./docs/codebase-guide.md) — per-module docs in [docs/modules/](./docs/modules/)

---

## RAG flow

1. **Auth + quota** — resolve session (guest or Google); atomically reserve a daily message slot (admins skip).
2. **Topic guard** — off-topic questions get a fixed refusal without retrieval.
3. **Retrieve** — embed the question (`text-embedding-3-small`, 1536-d) → Qdrant top-k cosine search.
4. **Threshold check** — if `max(score) < RAG_SCORE_THRESHOLD` (default 0.72) → grounded refusal, no generation.
5. **Generate** — prompt with numbered passages; stream answer; require valid `[n]` citations mapping to retrieved ordinals.
6. **Persist** — save user + assistant messages; store citation quote snapshots for stable footnotes after re-ingest.
7. **Stream to UI** — NDJSON events: tokens → citations payload → usage status.

Chunking: recursive character splitter, ~800–1200 tokens with ~150–200 overlap. Conversation memory: last N turns included in the prompt.

---

## Users, limits, and guest merge

| Role                               | Daily limit          | History                                       |
| ---------------------------------- | -------------------- | --------------------------------------------- |
| **Guest**                          | 5 messages / UTC day | Persists in browser session; merge on sign-in |
| **Signed-in (Google)**             | 5 messages / UTC day | Full history across devices                   |
| **Admin** (`users.role = 'admin'`) | Unlimited            | Same as signed-in                             |

Signing in does **not** raise the quota — it unlocks account continuity.

**Guest → Google merge:** before OAuth redirect, the app mints a short-lived signed JWT bound to the guest user id. After Google callback, `/auth/complete` verifies the token and reassigns conversations in a transaction. Tampered handoffs are rejected.

**Admin promotion:** sign up normally, then `UPDATE users SET role = 'admin' WHERE email = '…'` in Postgres. Role is never accepted from client input.

---

## Evaluation results

Measured on **2026-08-18** against a 13-case private golden set (`evals/golden.local.json`) run on the ingested synthetic fixture corpus (`tests/fixtures/prepared`). Re-run locally after ingest; do not treat these as production Harry Potter corpus scores unless you author your own `golden.local.json` against your ingested books.

| Metric            | Passed | Total |  Rate |
| ----------------- | -----: | ----: | ----: |
| Retrieval hit     |      9 |    10 | 90.0% |
| Citation presence |      9 |    10 | 90.0% |
| Refusal accuracy  |     12 |    13 | 92.3% |
| Aggregate pass    |     12 |    13 | 92.3% |

One expected miss: _“What does the moonstone key open?”_ — the answer term (`archive`) lives in a separate chunk from the key-location passage, so retrieval does not always surface it in top-k.

```bash
pnpm eval -- --dataset evals/golden.local.json | tee eval-results.txt
```

---

## Security and copyright

**Copyright:** Full Harry Potter texts are never committed. The repo ships a tiny synthetic fixture for CI only. Bring your own legally obtained books for local ingest and production.

**Security (v1):**

- 2,000-character message cap; stable error codes (no stack traces to clients)
- Conversation ownership enforced on every read/write
- Signed guest handoff prevents history theft on merge
- Admin role assigned only in the database
- `Cache-Control: no-store` on auth, chat, and history endpoints
- Production logs omit prompts, answers, passage text, and secrets

**Prompt injection:** the system prompt requires answering only from provided passages; uncited model output is rejected server-side.

---

## Trade-offs and future work

| Choice                                | Rationale                                  | Cost                                         |
| ------------------------------------- | ------------------------------------------ | -------------------------------------------- |
| Next.js monolith                      | One deploy, easy portfolio review          | Less isolation than split services           |
| Qdrant over pgvector                  | Dedicated vector indexing, clean re-ingest | Extra managed service                        |
| Shared 5/day quota for guests + users | Abuse control without sign-in farming      | Sign-in is not a quota upgrade               |
| Similarity threshold refusal          | Simple, effective hallucination guard      | May refuse borderline questions              |
| JWT guest sessions                    | Required for Credentials provider          | No server-side session revocation for guests |

## License

MIT (application code). Harry Potter book text is not included and remains the property of its rights holders.
