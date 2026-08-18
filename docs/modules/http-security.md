# HTTP / security

← [Codebase guide](../codebase-guide.md)

**Purpose:** Consistent error responses, request size limits, security headers, and safe audit logging across API routes.

---

## Files and functions

| File | Key exports | Responsibility |
|------|-------------|----------------|
| `src/lib/http.ts` | `safeErrorResponse()`, `readJsonBody()`, `securityHeaders()`, `logApiRequest()` | Stable error codes, 8KB body cap, CSP + no-store, audit logs (hashed user id, no prompts). |

---

## Error codes

API routes return JSON `{ code, message }` with stable `code` values, for example:

| Code | Typical HTTP status | When |
|------|---------------------|------|
| `invalid_request` | 400 | Zod validation failure, malformed JSON |
| `unauthorized` | 401 | No session |
| `conversation_not_found` | 404 | Invalid or foreign conversation id |
| `daily_limit_reached` | 429 | Quota exhausted |
| `internal_error` | 500 | Unexpected server failure |

Clients should branch on `code`, not parse `message` text.

---

## Security headers

Applied via `securityHeaders()` on chat and history responses:

- `Content-Security-Policy` — restrictive default for API responses
- `Cache-Control: no-store` — chat data must not be cached by intermediaries

---

## Audit logging

`logApiRequest()` records:

- Request id, route, status, latency
- Hashed user id (not raw id in logs)
- Error code on failure

**Never logged:** prompts, answers, passage text, secrets, handoff tokens.

---

## Design choices

- **Stable error codes:** Enables client handling and security tests without brittle string matching.
- **8KB body cap:** `readJsonBody()` rejects oversized payloads before parsing.
- **404 over 403 for foreign resources:** Avoids leaking whether a conversation id exists.

---

## Related

- [Chat — API routes](./chat.md)
- [architecture.md](../architecture.md) — security posture section
- [Interview questions — Quotas & security](./interview-questions.md#quotas-security--abuse)
