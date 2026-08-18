import { createHash, randomUUID } from "node:crypto";

export type ApiErrorCode =
  | "unauthorized"
  | "invalid_request"
  | "conversation_not_found"
  | "daily_limit_reached"
  | "generation_failed"
  | "internal_error";

export const MAX_JSON_BODY_BYTES = 8_192;

const SECURITY_HEADER_VALUES = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://vitals.vercel-insights.com",
    "frame-src https://accounts.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
} as const;

export function securityHeaders(): HeadersInit {
  return { ...SECURITY_HEADER_VALUES };
}

export function applySecurityHeaders(response: Response): Response {
  for (const [name, value] of Object.entries(SECURITY_HEADER_VALUES)) {
    response.headers.set(name, value);
  }
  return response;
}

export function safeErrorResponse(
  code: ApiErrorCode,
  status: number,
  extra?: Record<string, unknown>,
): Response {
  return applySecurityHeaders(
    Response.json({ code, ...extra }, { status, headers: securityHeaders() }),
  );
}

export function safeJsonResponse(
  body: unknown,
  status = 200,
  extraHeaders?: HeadersInit,
): Response {
  return applySecurityHeaders(
    Response.json(body, {
      status,
      headers: {
        ...securityHeaders(),
        ...extraHeaders,
      },
    }),
  );
}

export async function readJsonBody(
  request: Request,
  maxBytes = MAX_JSON_BODY_BYTES,
): Promise<
  { ok: true; body: unknown } | { ok: false; code: "invalid_request" }
> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > maxBytes) {
    return { ok: false, code: "invalid_request" };
  }

  const raw = await request.text();
  if (raw.length > maxBytes) {
    return { ok: false, code: "invalid_request" };
  }

  if (raw.length === 0) {
    return { ok: false, code: "invalid_request" };
  }

  try {
    return { ok: true, body: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, code: "invalid_request" };
  }
}

export function createRequestId(): string {
  return randomUUID();
}

export function hashUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 12);
}

export type ApiAuditLog = {
  requestId: string;
  route: string;
  userId?: string;
  status: number;
  latencyMs: number;
  errorCode?: ApiErrorCode;
  tokenUsage?: number;
};

export function logApiRequest(entry: ApiAuditLog): void {
  const payload = {
    requestId: entry.requestId,
    route: entry.route,
    userIdHash: entry.userId ? hashUserId(entry.userId) : undefined,
    status: entry.status,
    latencyMs: entry.latencyMs,
    errorCode: entry.errorCode,
    tokenUsage: entry.tokenUsage,
  };

  if (entry.status >= 500) {
    console.error("[api]", JSON.stringify(payload));
    return;
  }

  console.info("[api]", JSON.stringify(payload));
}

export function sanitizeErrorBody(body: unknown): string {
  return JSON.stringify(body);
}

/** Returns true when serialized error output may expose secrets or corpus text. */
export function errorBodyLeaksSensitiveData(serialized: string): boolean {
  const lower = serialized.toLowerCase();
  const blocked = [
    "postgresql://",
    "sk-",
    "api_key",
    "apikey",
    "auth_secret",
    "stack",
    "at object.",
    "drizzle",
    "syntax error",
    "connection refused",
    "the moonstone key is kept beneath",
    "eastern observatory",
  ];

  return blocked.some((needle) => lower.includes(needle));
}
