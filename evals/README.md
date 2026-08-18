# Evaluation datasets

PotterHeadGPT ships a **synthetic fixture dataset** for CI and local smoke tests. It targets the public `tests/fixtures/prepared/` corpus (The Lantern Academy), not copyrighted Harry Potter text.

## Files

| File | Committed | Purpose |
|------|-----------|---------|
| `golden.fixture.json` | Yes | Three smoke cases for `pnpm eval` in CI |
| `golden.local.json` | No (gitignored) | Your private 10–20 question set against a real ingested corpus |

## Create a private golden set

1. Ingest your legally obtained books into Qdrant (see root README).
2. Copy the fixture schema and author 10–20 questions with expected retrieval terms:

```json
[
  {
    "id": "scar-lightning",
    "question": "How did Harry get his scar?",
    "expectedTerms": ["lightning", "scar"],
    "expectCitation": true,
    "expectRefusal": false
  },
  {
    "id": "unsupported-fact",
    "question": "What is Hermione's middle name in book seven?",
    "expectedTerms": [],
    "expectCitation": false,
    "expectRefusal": true
  }
]
```

3. Save as `evals/golden.local.json` (never commit this file).
4. Run:

```bash
pnpm eval -- --dataset evals/golden.local.json | tee eval-results.txt
```

Paste **aggregate metrics only** into the README. Do not publish copyrighted passage text or full question lists.

## Metrics

| Metric | Meaning |
|--------|---------|
| Retrieval hit | At least one retrieved chunk contains an expected term (cases with `expectedTerms`) |
| Citation presence | Answer includes valid `[n]` markers when `expectCitation` is true |
| Refusal accuracy | Grounded refusal matches `expectRefusal` for every case |
| Aggregate pass | All three checks pass for a case |

Exit code is `1` when aggregate pass rate falls below `--threshold` (default 80%).
