import { z } from "zod";
import type { UserRole } from "@/auth/roles";
import { HISTORY_TURN_LIMIT } from "@/db/queries/messages";
import type { ChatTurn, GroundedAnswer } from "@/rag/types";
import type { UsageStatus } from "@/usage/types";

export const chatRequestSchema = z.object({
  conversationId: z.uuid().optional(),
  message: z.string().trim().min(1).max(2000),
});

export type ChatSession = {
  user: {
    id: string;
    role: UserRole;
  };
} | null;

export type PersistExchangeInput = {
  userId: string;
  conversationId: string;
  question: string;
  answer: GroundedAnswer;
};

export type ChatDeps = {
  findConversation: (
    userId: string,
    conversationId: string,
  ) => Promise<{ id: string } | null>;
  createConversation: (
    userId: string,
    firstQuestion: string,
  ) => Promise<{ id: string }>;
  listRecentTurns: (
    userId: string,
    conversationId: string,
    limit: number,
  ) => Promise<ChatTurn[]>;
  persistExchange: (
    input: PersistExchangeInput,
  ) => Promise<{ userMessageId: string; assistantMessageId: string }>;
  reserveMessage: (
    userId: string,
    role: UserRole,
  ) => Promise<
    | { allowed: true; status: UsageStatus }
    | { allowed: false; status: UsageStatus }
  >;
  releaseMessage: (userId: string, role: UserRole) => Promise<void>;
  generate: (input: {
    question: string;
    history: ChatTurn[];
  }) => Promise<GroundedAnswer>;
};

export type ChatResponse =
  | { status: 401; body: { error: string } }
  | { status: 400; body: { error: string } }
  | { status: 404; body: { error: string } }
  | { status: 429; body: { error: string; usage: UsageStatus } }
  | { status: 502; body: { error: string } }
  | { status: 500; body: { error: string } }
  | {
      status: 200;
      body: {
        conversationId: string;
        userMessageId: string;
        assistantMessageId: string;
        answer: string;
        citations: GroundedAnswer["citations"];
        refused: GroundedAnswer["refused"];
        usage: UsageStatus;
      };
    };

export async function handleChatRequest(
  session: ChatSession,
  body: unknown,
  deps: ChatDeps,
): Promise<ChatResponse> {
  if (!session?.user.id) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return { status: 400, body: { error: "Invalid request" } };
  }

  const { message, conversationId: existingId } = parsed.data;
  const { id: userId, role } = session.user;

  let conversationId = existingId;
  if (conversationId) {
    const owned = await deps.findConversation(userId, conversationId);
    if (!owned) {
      return { status: 404, body: { error: "Conversation not found" } };
    }
  }

  const reservation = await deps.reserveMessage(userId, role);
  if (!reservation.allowed) {
    return {
      status: 429,
      body: {
        error: "Daily message limit reached",
        usage: reservation.status,
      },
    };
  }

  let phase: "setup" | "generate" | "persist" = "setup";
  try {
    if (!conversationId) {
      const created = await deps.createConversation(userId, message);
      conversationId = created.id;
    }

    const history = existingId
      ? await deps.listRecentTurns(userId, conversationId, HISTORY_TURN_LIMIT)
      : [];

    phase = "generate";
    const answer = await deps.generate({
      question: message,
      history,
    });

    phase = "persist";
    const persisted = await deps.persistExchange({
      userId,
      conversationId,
      question: message,
      answer,
    });

    return {
      status: 200,
      body: {
        conversationId,
        userMessageId: persisted.userMessageId,
        assistantMessageId: persisted.assistantMessageId,
        answer: answer.answer,
        citations: answer.citations,
        refused: answer.refused,
        usage: reservation.status,
      },
    };
  } catch {
    await deps.releaseMessage(userId, role);
    return phase === "generate"
      ? { status: 502, body: { error: "Generation failed" } }
      : { status: 500, body: { error: "Something went wrong" } };
  }
}
