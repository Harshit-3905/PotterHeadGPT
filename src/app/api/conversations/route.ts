import { auth } from "@/auth/config";
import { handleListConversations } from "@/chat/conversations";
import { db } from "@/db";
import { listConversations } from "@/db/queries/conversations";
import {
  createRequestId,
  logApiRequest,
  safeErrorResponse,
  safeJsonResponse,
} from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = createRequestId();
  const started = Date.now();
  let status = 500;
  let errorCode: Parameters<typeof logApiRequest>[0]["errorCode"];
  let userId: string | undefined;

  try {
    const session = await auth();
    userId = session?.user?.id;
    const result = await handleListConversations(session, {
      listConversations: (ownerId) => listConversations(db, ownerId),
    });

    status = result.status;
    if (result.status !== 200) {
      errorCode = result.body.code;
      return safeErrorResponse(result.body.code, result.status);
    }

    return safeJsonResponse(result.body);
  } finally {
    logApiRequest({
      requestId,
      route: "/api/conversations",
      userId,
      status,
      latencyMs: Date.now() - started,
      errorCode,
    });
  }
}
