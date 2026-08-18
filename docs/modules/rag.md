# RAG

← [Codebase guide](../codebase-guide.md)

**Purpose:** Retrieve relevant passages, generate grounded answers with `[n]` citations, or refuse honestly.

---

## Pipeline overview

```
question
  → classifyTopic()           off-topic? → OFF_TOPIC_REFUSAL
  → retrievePassages()        embed query → Qdrant top-k
  → score threshold           max(score) < threshold? → BOOKS_REFUSAL
  → buildGroundedPrompt()     numbered passages + history
  → LLM stream (gpt-4o-mini)
  → extractCitationOrdinals() missing/invalid [n]? → BOOKS_REFUSAL
  → buildCitationPayload()    map ordinals → passages
```

---

## Files and functions

| File | Key exports | Responsibility |
|------|-------------|----------------|
| `provider.ts` | `resolveGroundedAnswerGenerator()`, `isTestRagProvider()` | Production → OpenAI + Qdrant; test/e2e → deterministic fixture answers. |
| `pipeline.ts` | `createGroundedAnswerGenerator()` | Wires embeddings, Qdrant search, topic guard, chat model. |
| `generate.ts` | `generateGroundedAnswer()`, `readModelStream()` | Core RAG orchestration; streams tokens via `onToken`. |
| `retrieve.ts` | `retrievePassages()`, `toRetrievedPassage()` | Embed question, search Qdrant, map hits to `RetrievedPassage`. |
| `topic-guard.ts` | `classifyTopic()`, `TOPIC_GUARD_SYSTEM` | LLM classifier: Harry Potter vs everything else. |
| `prompt.ts` | `buildGroundedPrompt()` | System + numbered passage blocks + conversation history. |
| `citations.ts` | `extractCitationOrdinals()`, `stripInvalidCitationMarkers()`, `buildCitationPayload()` | Parse and validate `[1]`…`[n]` against retrieved set. |
| `copy.ts` | `BOOKS_REFUSAL`, `OFF_TOPIC_REFUSAL` | Exact refusal strings (also used in evals). |
| `models.ts` | `createEmbeddings()`, `createChatModel()`, `createTopicClassifier()` | LangChain OpenAI wrappers. |
| `stream-events.ts` | `ChatStreamEvent`, `encodeEvent()`, `parseEvent()` | Typed NDJSON event union for chat stream. |
| `types.ts` | `GroundedAnswer`, `RetrievedPassage`, `CitationPayload`, `ChatTurn` | Shared RAG types. |
| `tracing.ts` | LangSmith helpers | Optional observability (disabled in tests). |

---

## Design choices

- **Threshold refusal before generation:** Saves cost and prevents hallucination when retrieval is weak.
- **Post-generation citation validation:** Model can omit `[n]`; server refuses rather than showing uncited lore.
- **Topic guard before retrieval:** Off-topic questions skip embedding + Qdrant entirely.
- **Test provider via env, not HTTP:** `POTTERHEAD_E2E=1` or `NODE_ENV=test` — no public API switch to fake answers.

---

## Related

- [Qdrant](./qdrant.md) — vector search
- [Chat](./chat.md) — streams RAG output to the browser
- [Tests](./tests.md) — unit mocks and E2E test provider
- [Interview questions — RAG & retrieval](./interview-questions.md#rag--retrieval)
