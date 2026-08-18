# Chat

← [Codebase guide](../codebase-guide.md)

**Purpose:** Validate requests, enforce quotas, stream answers, persist history, render citations.

---

## Server logic (`src/chat/`)

| File | Key functions | Responsibility |
|------|---------------|----------------|
| `handle-chat.ts` | `prepareChatRequest()`, `handleChatRequest()`, `chatRequestSchema` | Auth check, Zod validation (max 2000 chars), ownership, quota reserve, conversation create. |
| `stream.ts` | `toLiveChatResponse()`, `toChatHttpResponse()`, `chunkText()` | NDJSON streaming; security headers on responses. |
| `conversations.ts` | `handleListConversations()`, `handleGetConversation()` | History API handlers. |
| `load-shell.ts` | `loadChatShell()` | SSR props for chat pages (session, usage, threads, corpus flag). |
| `read-ndjson.ts` | `readChatNdjson()` | Client async iterator over fetch body lines. |
| `title.ts` | `conversationTitle()` | Truncate first question to 120 chars for sidebar title. |

---

## API routes

| Route | Method | Handler flow |
|-------|--------|--------------|
| `src/app/api/chat/route.ts` | `POST` | `readJsonBody` → `prepareChatRequest` → `toLiveChatResponse` → audit log |
| `src/app/api/conversations/route.ts` | `GET` | List caller's threads |
| `src/app/api/conversations/[conversationId]/route.ts` | `GET` | Single thread + messages + citation snapshots |
| `src/app/api/usage/route.ts` | `GET` | Daily quota status |

---

## UI components (`src/components/chat/`)

| Component | Role |
|-----------|------|
| `chat-shell.tsx` | Main layout: sidebar, message list, composer, quota banner, guest upgrade CTA. Calls `/api/chat`, updates URL on new thread. |
| `chat-composer.tsx` | Textarea + Ask button; disabled when quota exhausted or corpus empty. |
| `message-list.tsx` | Renders thread or empty-state example questions. |
| `message-bubble.tsx` | User vs assistant styling; streaming placeholder. |
| `message-content.tsx` | Parses `[n]` markers → `CitationMark` + `CitationFootnotes`. |
| `citation-footnotes.tsx` | Expandable passage panel with quote snapshot. |
| `quota-banner.tsx` | "X of 5 messages remaining" (hidden for admin). |
| `conversation-sidebar.tsx` | Thread list with active highlight. |

---

## NDJSON stream events

| Event | When | Payload |
|-------|------|---------|
| `start` | Stream opens | `conversationId`, `userMessageId` |
| `token` | LLM chunk | `value` (text fragment) |
| `citations` | After generation | `CitationPayload[]` |
| `usage` | After reserve | `UsageStatus` |
| `done` | Persist complete | `assistantMessageId`, optional `content` |
| `error` | Failure | `code`, `message` |

---

## Request flow (one question)

```
POST /api/chat { message, conversationId? }
  → prepareChatRequest()     validate, auth, ownership, reserve quota
  → generateGroundedAnswer() RAG pipeline
  → persistExchange()        save messages + citations
  → NDJSON stream            token / citations / usage / done
  → readChatNdjson()         client parses events
  → MessageContent           renders [n] footnotes
```

---

## Design choices

- **Reserve quota before OpenAI call:** Prevents cost abuse; `releaseMessage` on failure.
- **NDJSON over SSE:** Typed events (`citations`, `usage`) without parsing markdown in the stream.
- **Client-side URL update:** `history.replaceState` when a new conversation id arrives mid-stream.

---

## Related

- [RAG](./rag.md) — answer generation
- [Usage](./usage.md) — quota reservation
- [HTTP / security](./http-security.md) — API error handling
- [Interview questions — Frontend & streaming](./interview-questions.md#frontend--streaming)
