import type { ConversationSummary } from "@/db/queries/conversations";
import { conversationIdSchema } from "@/db/queries/conversations";
import type { ConversationWithMessages } from "@/db/queries/messages";
import type { ApiErrorCode } from "@/lib/http";

export type SessionUser = {
  user: {
    id: string;
  };
} | null;

export type ListConversationsResult =
  | { status: 401; body: { code: ApiErrorCode } }
  | { status: 200; body: { conversations: ConversationSummary[] } };

export type GetConversationResult =
  | { status: 401; body: { code: ApiErrorCode } }
  | { status: 400; body: { code: ApiErrorCode } }
  | { status: 404; body: { code: ApiErrorCode } }
  | { status: 200; body: ConversationWithMessages };

export async function handleListConversations(
  session: SessionUser,
  deps: {
    listConversations: (userId: string) => Promise<ConversationSummary[]>;
  },
): Promise<ListConversationsResult> {
  if (!session?.user.id) {
    return { status: 401, body: { code: "unauthorized" } };
  }

  const conversations = await deps.listConversations(session.user.id);
  return { status: 200, body: { conversations } };
}

export async function handleGetConversation(
  session: SessionUser,
  conversationId: string,
  deps: {
    getConversation: (
      userId: string,
      conversationId: string,
    ) => Promise<ConversationWithMessages | null>;
  },
): Promise<GetConversationResult> {
  if (!session?.user.id) {
    return { status: 401, body: { code: "unauthorized" } };
  }

  if (!conversationIdSchema.safeParse(conversationId).success) {
    return { status: 400, body: { code: "invalid_request" } };
  }

  const conversation = await deps.getConversation(
    session.user.id,
    conversationId,
  );
  if (!conversation) {
    return { status: 404, body: { code: "conversation_not_found" } };
  }

  return { status: 200, body: conversation };
}
