import { auth } from "@/auth/config";
import { prepareChatRequest } from "@/chat/handle-chat";
import { toChatHttpResponse, toLiveChatResponse } from "@/chat/stream";
import { db } from "@/db";
import {
  createConversation,
  findOwnedConversation,
} from "@/db/queries/conversations";
import { listRecentTurns, persistExchange } from "@/db/queries/messages";
import { env } from "@/env";
import {
  createRequestId,
  logApiRequest,
  readJsonBody,
  safeErrorResponse,
} from "@/lib/http";
import { resolveGroundedAnswerGenerator } from "@/rag/provider";
import { releaseMessage, reserveMessage } from "@/usage/daily-limit";

export const dynamic = "force-dynamic";

const generate = resolveGroundedAnswerGenerator({
  openaiApiKey: env.OPENAI_API_KEY,
  qdrantUrl: env.QDRANT_URL,
  qdrantApiKey: env.QDRANT_API_KEY,
  collection: env.QDRANT_COLLECTION,
  topK: env.RAG_TOP_K,
  scoreThreshold: env.RAG_SCORE_THRESHOLD,
});

export async function POST(request: Request) {
  const requestId = createRequestId();
  const started = Date.now();
  let status = 500;
  let errorCode: Parameters<typeof logApiRequest>[0]["errorCode"];
  let userId: string | undefined;

  try {
    const session = await auth();
    userId = session?.user?.id;

    const parsedBody = await readJsonBody(request);
    if (!parsedBody.ok) {
      status = 400;
      errorCode = parsedBody.code;
      return safeErrorResponse(parsedBody.code, 400);
    }

    const prepared = await prepareChatRequest(session, parsedBody.body, {
      findConversation: (ownerId, conversationId) =>
        findOwnedConversation(db, ownerId, conversationId),
      createConversation: (ownerId, firstQuestion) =>
        createConversation(db, ownerId, firstQuestion),
      listRecentTurns: (ownerId, conversationId, limit) =>
        listRecentTurns(db, ownerId, conversationId, limit),
      persistExchange: (input) => persistExchange(db, input),
      reserveMessage: (ownerId, role) =>
        reserveMessage(db, {
          userId: ownerId,
          role,
          limit: env.DAILY_MESSAGE_LIMIT,
        }),
      releaseMessage: (ownerId, role) =>
        releaseMessage(db, {
          userId: ownerId,
          role,
          limit: env.DAILY_MESSAGE_LIMIT,
        }),
      generate,
    });

    if (!prepared.ok) {
      status = prepared.response.status;
      errorCode = prepared.response.body.code;
      return toChatHttpResponse(prepared.response);
    }

    status = 200;
    return toLiveChatResponse(prepared.prepared, {
      generate,
      persistExchange: (input) => persistExchange(db, input),
      releaseMessage: (ownerId, role) =>
        releaseMessage(db, {
          userId: ownerId,
          role,
          limit: env.DAILY_MESSAGE_LIMIT,
        }),
    });
  } finally {
    logApiRequest({
      requestId,
      route: "/api/chat",
      userId,
      status,
      latencyMs: Date.now() - started,
      errorCode,
    });
  }
}
