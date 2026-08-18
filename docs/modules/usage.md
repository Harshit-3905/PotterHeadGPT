# Usage

← [Codebase guide](../codebase-guide.md)

**Purpose:** Enforce daily message limits for all non-admin users.

---

## Files and functions

| File | Key functions | Responsibility |
|------|---------------|----------------|
| `daily-limit.ts` | `reserveMessage()`, `releaseMessage()`, `getUsageStatus()` | Conditional upsert: increment only if `messageCount < limit`. Admins skip entirely. |
| `types.ts` | `UsageStatus` | `{ limit, used, remaining, resetsAt, unlimited }`. |

---

## Flow in chat

```
prepareChatRequest()
  → reserveMessage(userId)     atomic increment; 429 if at cap
  → generateGroundedAnswer()   OpenAI call
  → on failure: releaseMessage()
  → stream usage event to client
```

`getUsageStatus()` is called at SSR (`loadChatShell`) and exposed via `GET /api/usage`.

---

## Design choices

- **Same cap for guest and signed-in:** Sign-in unlocks persistence, not more quota.
- **UTC midnight reset:** `usageDate` is UTC date string; `resetsAt` is next UTC midnight ISO.
- **Atomic upsert:** Concurrent requests cannot exceed the cap (Postgres `ON CONFLICT … WHERE message_count < limit`).

---

## Related

- [Database — usage schema](./database.md) — `daily_usage` table
- [Chat](./chat.md) — quota banner and composer disable
- [Auth](./auth.md) — admins bypass limits
- [Interview questions — Quotas & security](./interview-questions.md#quotas-security--abuse)
