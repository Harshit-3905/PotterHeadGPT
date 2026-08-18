# Tests

← [Codebase guide](../codebase-guide.md)

**Purpose:** Unit, integration, E2E, and eval coverage without OpenAI in CI.

---

## Directory layout

| Directory | What it covers |
|-----------|----------------|
| `tests/unit/` | Pure logic: citations, quotas, auth claims, RAG generate, ingest helpers, UI components. |
| `tests/integration/` | Postgres: guest merge, security adversarial cases. |
| `tests/e2e/` | Playwright: full guest chat flow, admin quota bypass, landing smoke. |
| `evals/golden.fixture.json` | Committed smoke eval set (synthetic corpus). |
| `evals/golden.local.json` | Gitignored private eval set (your ingested books). |

---

## Key test files

| File | Covers |
|------|--------|
| `tests/unit/eval-metrics.test.ts` | Golden-set metric functions |
| `tests/unit/provider.test.ts` | Test RAG provider selection |
| `tests/integration/security.test.ts` | 12 adversarial API cases |
| `tests/e2e/chat.spec.ts` | Guest cited chat, reload, quota, admin bypass |
| `tests/e2e/smoke.spec.ts` | Landing page smoke |
| `tests/e2e/global-setup.ts` | Seed admin user + fixture document |
| `tests/e2e/lib/seed.ts` | DB seed helpers for E2E |

---

## E2E strategy

E2E runs with `POTTERHEAD_E2E=1`:

- `isTestRagProvider()` → deterministic cited answers (no OpenAI)
- `e2e-admin` Credentials provider for admin quota bypass
- Postgres service in CI (`.github/workflows/ci.yml`)
- Playwright excluded from Vitest (`vitest.config.mts`)

---

## Running locally

```bash
pnpm verify          # lint + typecheck + unit + integration
pnpm test:e2e        # Playwright (requires build + DB)
pnpm eval            # golden-set metrics (optional OpenAI)
```

---

## Related

- [RAG — test provider](./rag.md)
- [Auth — e2e](./auth.md)
- [Scripts — eval](./scripts.md)
- [Interview questions — Testing](./interview-questions.md#testing--quality)
