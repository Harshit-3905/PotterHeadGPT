import { auth } from "@/auth/config";
import { db } from "@/db";
import { env } from "@/env";
import {
  createRequestId,
  logApiRequest,
  safeErrorResponse,
  safeJsonResponse,
} from "@/lib/http";
import { getUsageStatus } from "@/usage/daily-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = createRequestId();
  const started = Date.now();
  let status = 500;
  let errorCode: Parameters<typeof logApiRequest>[0]["errorCode"];
  let userId: string | undefined;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      status = 401;
      errorCode = "unauthorized";
      return safeErrorResponse("unauthorized", 401);
    }

    userId = session.user.id;
    const usage = await getUsageStatus(db, {
      userId: session.user.id,
      role: session.user.role,
      limit: env.DAILY_MESSAGE_LIMIT,
    });

    status = 200;
    return safeJsonResponse(usage);
  } finally {
    logApiRequest({
      requestId,
      route: "/api/usage",
      userId,
      status,
      latencyMs: Date.now() - started,
      errorCode,
    });
  }
}
