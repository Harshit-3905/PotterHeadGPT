# Scripts

← [Codebase guide](../codebase-guide.md)

**Purpose:** Offline CLIs for corpus preparation, vector ingest, and RAG evaluation.

---

## Entry points

| Script | Command | Purpose |
|--------|---------|---------|
| `prepare-books.ts` | `pnpm prepare-books` | Raw PDF/txt → cleaned chapter files + manifest. |
| `ingest.ts` | `pnpm ingest` | Embed prepared books → Qdrant + `documents` table. |
| `eval.ts` | `pnpm eval` | Run golden dataset; report retrieval/citation/refusal metrics. |

---

## Supporting libraries (`scripts/lib/`)

| File | Responsibility |
|------|----------------|
| `chunk.ts` | Split chapter text into overlapping chunks for embedding. |
| `ingest.ts` | Orchestrate per-book ingest: checksum, delete old points, embed, upsert. |
| `prepare-book.ts` | PDF/txt extraction, chapter detection, text cleaning. |
| `eval-metrics.ts` | Score retrieval hits, citation markers, refusal strings. |
| `eval-types.ts` | Golden-set TypeScript types. |
| `ingest-env.ts` | Zod-validated env subset for ingest CLI. |

---

## Flow — prepare then ingest

```
pnpm prepare-books -- --path books/raw --out books/prepared
  → extract PDF/txt, detect chapters, clean text
  → books/prepared/{slug}/manifest.json + chapter .txt files

pnpm ingest -- --path books/prepared
  → ensureBookChunksCollection()     [qdrant/collections.ts]
  → for each book: checksum skip/replace
  → splitChapterChunks() + embed     [scripts/lib/chunk.ts]
  → upsertChunks() → Qdrant          [qdrant/chunks.ts]
  → insertDocument() → Postgres      [db/queries/corpus.ts]
```

---

## Eval

```
pnpm eval -- --dataset evals/golden.fixture.json
  → for each case: run RAG pipeline (or fixture bypass)
  → eval-metrics: retrieval / citation / refusal scores
  → print summary to stdout
```

See [../evals/README.md](../../evals/README.md) for golden-set schema.

---

## Design choices

- **Ingest is CLI, not API:** Keeps attack surface small; books are prepared locally then pushed to Qdrant.
- **Checksum idempotency:** Unchanged source files skip re-embed; changed files replace Qdrant points by `documentId`.
- **Eval separate from unit tests:** Golden set measures end-to-end RAG quality, not just function correctness.

---

## Related

- [Qdrant](./qdrant.md)
- [Database — corpus](./database.md)
- [RAG](./rag.md)
- [Tests](./tests.md)
