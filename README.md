# PotterHeadGPT

**A multi-user cited RAG chat over the Harry Potter books — every answer links to the passages it was drawn from, or refuses honestly when the text does not support an answer.**

**Live demo:** [potterheadgpt.vercel.app](https://potterheadgpt.vercel.app)

---

## Screenshot

The landing page shows the cited-answer UX: inline `[1]` footnotes, hover excerpts, and a grounded refusal when retrieval confidence is too low.

![PotterHeadGPT landing page with cited answer specimen](./public/social-card.png)

---

## Technical highlights

- **Cited RAG pipeline** — LangChain.js retrieval → numbered-passage prompt → streamed `gpt-4o-mini` answer with validated `[n]` markers
- **Dual-store architecture** — Postgres (Neon) for auth, chat, and quotas; Qdrant for chunk vectors and passage text
- **Grounded refusal** — similarity threshold + citation validation; exact copy: *“I couldn't find this in the books.”*
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

| Role | Daily limit | History |
|------|-------------|---------|
| **Guest** | 5 messages / UTC day | Persists in browser session; merge on sign-in |
| **Signed-in (Google)** | 5 messages / UTC day | Full history across devices |
| **Admin** (`users.role = 'admin'`) | Unlimited | Same as signed-in |

Signing in does **not** raise the quota — it unlocks account continuity.

**Guest → Google merge:** before OAuth redirect, the app mints a short-lived signed JWT bound to the guest user id. After Google callback, `/auth/complete` verifies the token and reassigns conversations in a transaction. Tampered handoffs are rejected.

**Admin promotion:** sign up normally, then `UPDATE users SET role = 'admin' WHERE email = '…'` in Postgres. Role is never accepted from client input.

---

## Local setup

**Requirements:** Node.js 20.9+, pnpm, Postgres, Qdrant (Docker or Cloud), OpenAI API key, Google OAuth credentials.

```bash
git clone https://github.com/<you>/potterhead-gpt.git
cd potterhead-gpt
pnpm install --frozen-lockfile
cp .env.example .env   # fill every variable
pnpm db:migrate
pnpm dev               # http://localhost:3000
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection |
| `QDRANT_URL` / `QDRANT_API_KEY` / `QDRANT_COLLECTION` | Vector store |
| `AUTH_SECRET` | Auth.js + guest handoff signing (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth |
| `OPENAI_API_KEY` | Embeddings + chat |
| `DAILY_MESSAGE_LIMIT` | Default `5` |
| `RAG_TOP_K` / `RAG_SCORE_THRESHOLD` | Retrieval tuning |

### Prepare and ingest books

Book files are **not** in this repository. Use legally obtained `.txt`, `.epub`, or `.pdf` files.

```bash
# 1. Place raw files under books/raw/ (gitignored)
pnpm prepare-books -- --path books/raw --out books/prepared

# 2. Ingest into Qdrant + documents registry
pnpm ingest -- --path books/prepared

# Smoke test with the committed synthetic fixture:
pnpm ingest -- --path tests/fixtures/prepared
```

### Verify quality

```bash
pnpm verify          # lint + typecheck + unit tests + build
pnpm test:e2e        # Playwright smoke tests
pnpm eval -- --dataset evals/golden.local.json   # private golden set (gitignored)
```

See [evals/README.md](./evals/README.md) for golden-set schema and metrics definitions.

---

## Evaluation results

Measured on **2026-08-18** against a 13-case private golden set (`evals/golden.local.json`) run on the ingested synthetic fixture corpus (`tests/fixtures/prepared`). Re-run locally after ingest; do not treat these as production Harry Potter corpus scores unless you author your own `golden.local.json` against your ingested books.

| Metric | Passed | Total | Rate |
|---|---:|---:|---:|
| Retrieval hit | 9 | 10 | 90.0% |
| Citation presence | 9 | 10 | 90.0% |
| Refusal accuracy | 12 | 13 | 92.3% |
| Aggregate pass | 12 | 13 | 92.3% |

One expected miss: *“What does the moonstone key open?”* — the answer term (`archive`) lives in a separate chunk from the key-location passage, so retrieval does not always surface it in top-k.

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

| Choice | Rationale | Cost |
|--------|-----------|------|
| Next.js monolith | One deploy, easy portfolio review | Less isolation than split services |
| Qdrant over pgvector | Dedicated vector indexing, clean re-ingest | Extra managed service |
| Shared 5/day quota for guests + users | Abuse control without sign-in farming | Sign-in is not a quota upgrade |
| Similarity threshold refusal | Simple, effective hallucination guard | May refuse borderline questions |
| JWT guest sessions | Required for Credentials provider | No server-side session revocation for guests |

**Deferred:** chapter/book filters · admin upload UI · hybrid BM25 + vector search · reranking · LangGraph multi-hop · additional OAuth providers

---

## Resume bullets

- Built and deployed a multi-user cited RAG application using Next.js, LangChain.js, Auth.js, OpenAI, and Postgres/Qdrant.
- Implemented grounded refusal, source-linked passage citations, atomic daily quotas, admin bypass, and secure guest-to-Google history migration.
- Golden-set eval (13 cases, synthetic fixture corpus): **90% retrieval hit**, **90% citation compliance**, **92% refusal accuracy**.

---

## License

MIT (application code). Harry Potter book text is not included and remains the property of its rights holders.
