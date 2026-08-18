import { z } from "zod";
import type { UserRole } from "@/auth/roles";
import { HISTORY_TURN_LIMIT } from "@/db/queries/messages";
import type { ApiErrorCode } from "@/lib/http";
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
    onToken?: (token: string) => void;
  }) => Promise<GroundedAnswer>;
};

export type ChatResponse =
  | { status: 401; body: { code: ApiErrorCode } }
  | { status: 400; body: { code: ApiErrorCode } }
  | { status: 404; body: { code: ApiErrorCode } }
  | { status: 429; body: { code: ApiErrorCode; usage: UsageStatus } }
  | { status: 502; body: { code: ApiErrorCode } }
  | { status: 500; body: { code: ApiErrorCode } }
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

export type PreparedChat = {
  userId: string;
  role: UserRole;
  message: string;
  conversationId: string;
  history: ChatTurn[];
  usage: UsageStatus;
};

export async function prepareChatRequest(
  session: ChatSession,
  body: unknown,
  deps: ChatDeps,
): Promise<
  | { ok: true; prepared: PreparedChat }
  | { ok: false; response: Exclude<ChatResponse, { status: 200 }> }
> {
  if (!session?.user.id) {
    return {
      ok: false,
      response: { status: 401, body: { code: "unauthorized" } },
    };
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: { status: 400, body: { code: "invalid_request" } },
    };
  }

  const { message, conversationId: existingId } = parsed.data;
  const { id: userId, role } = session.user;

  let conversationId = existingId;
  if (conversationId) {
    const owned = await deps.findConversation(userId, conversationId);
    if (!owned) {
      return {
        ok: false,
        response: {
          status: 404,
          body: { code: "conversation_not_found" },
        },
      };
    }
  }

  const reservation = await deps.reserveMessage(userId, role);
  if (!reservation.allowed) {
    return {
      ok: false,
      response: {
        status: 429,
        body: {
          code: "daily_limit_reached",
          usage: reservation.status,
        },
      },
    };
  }

  try {
    if (!conversationId) {
      const created = await deps.createConversation(userId, message);
      conversationId = created.id;
    }

    const history = existingId
      ? await deps.listRecentTurns(userId, conversationId, HISTORY_TURN_LIMIT)
      : [];

    return {
      ok: true,
      prepared: {
        userId,
        role,
        message,
        conversationId,
        history,
        usage: reservation.status,
      },
    };
  } catch {
    await deps.releaseMessage(userId, role);
    return {
      ok: false,
      response: { status: 500, body: { code: "internal_error" } },
    };
  }
}

export async function handleChatRequest(
  session: ChatSession,
  body: unknown,
  deps: ChatDeps,
): Promise<ChatResponse> {
  const prepared = await prepareChatRequest(session, body, deps);
  if (!prepared.ok) {
    return prepared.response;
  }

  const { userId, role, message, conversationId, history, usage } =
    prepared.prepared;
  let phase: "generate" | "persist" = "generate";

  try {
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
        usage,
      },
    };
  } catch {
    await deps.releaseMessage(userId, role);
    return phase === "generate"
      ? { status: 502, body: { code: "generation_failed" } }
      : { status: 500, body: { code: "internal_error" } };
  }
}
