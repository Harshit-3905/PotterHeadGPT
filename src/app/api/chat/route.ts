import { auth } from "@/auth/config";
import { handleChatRequest } from "@/chat/handle-chat";
import { toChatHttpResponse } from "@/chat/stream";
import { db } from "@/db";
import {
  createConversation,
  findOwnedConversation,
} from "@/db/queries/conversations";
import { listRecentTurns, persistExchange } from "@/db/queries/messages";
import { env } from "@/env";
import { createGroundedAnswerGenerator } from "@/rag/pipeline";
import { releaseMessage, reserveMessage } from "@/usage/daily-limit";

const generate = createGroundedAnswerGenerator({
  openaiApiKey: env.OPENAI_API_KEY,
  qdrantUrl: env.QDRANT_URL,
  qdrantApiKey: env.QDRANT_API_KEY,
  collection: env.QDRANT_COLLECTION,
  topK: env.RAG_TOP_K,
  scoreThreshold: env.RAG_SCORE_THRESHOLD,
});

export async function POST(request: Request) {
  const session = await auth();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const result = await handleChatRequest(session, body, {
    findConversation: (userId, conversationId) =>
      findOwnedConversation(db, userId, conversationId),
    createConversation: (userId, firstQuestion) =>
      createConversation(db, userId, firstQuestion),
    listRecentTurns: (userId, conversationId, limit) =>
      listRecentTurns(db, userId, conversationId, limit),
    persistExchange: (input) => persistExchange(db, input),
    reserveMessage: (userId, role) =>
      reserveMessage(db, {
        userId,
        role,
        limit: env.DAILY_MESSAGE_LIMIT,
      }),
    releaseMessage: (userId, role) =>
      releaseMessage(db, {
        userId,
        role,
        limit: env.DAILY_MESSAGE_LIMIT,
      }),
    generate,
  });

  return toChatHttpResponse(result);
}
