# Configuration

← [Codebase guide](../codebase-guide.md)

**Purpose:** Environment validation and tunable RAG / quota parameters.

---

## Files

| File | Purpose |
|------|---------|
| `src/env.ts` | Zod-validated app env (DB, Qdrant, OpenAI, auth, RAG tuning). |
| `scripts/lib/ingest-env.ts` | Ingest CLI env subset. |
| `.env.example` | Template for all variables. |

---

## Key variables

| Variable | Default | Effect |
|----------|---------|--------|
| `DATABASE_URL` | — | Postgres connection (Neon in prod) |
| `QDRANT_URL` | — | Qdrant REST endpoint |
| `OPENAI_API_KEY` | — | Embeddings + chat + topic guard |
| `AUTH_SECRET` | — | JWT signing (Auth.js + guest handoff) |
| `GOOGLE_CLIENT_ID` / `SECRET` | — | Google OAuth |
| `DAILY_MESSAGE_LIMIT` | `5` | Messages per user per UTC day |
| `RAG_TOP_K` | `6` | Passages retrieved per question |
| `RAG_SCORE_THRESHOLD` | `0.72` | Min cosine score or refuse |
| `POTTERHEAD_E2E` | — | Enable test RAG + e2e-admin auth |

---

## Load order

`src/db/env.ts` → `.env.local` overrides process env overrides `.env`.

App code imports validated config from `src/env.ts` at startup — missing required vars fail fast.

---

## Related

- [RAG](./rag.md) — threshold and top-k usage
- [Usage](./usage.md) — daily limit
- [Tests](./tests.md) — `POTTERHEAD_E2E`
