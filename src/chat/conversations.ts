import { z } from "zod";
import type { ConversationSummary } from "@/db/queries/conversations";
import type { ConversationWithMessages } from "@/db/queries/messages";

const conversationIdSchema = z.uuid();

export type SessionUser = {
  user: {
    id: string;
  };
} | null;

export type ListConversationsResult =
  | { status: 401; body: { error: string } }
  | { status: 200; body: { conversations: ConversationSummary[] } };

export type GetConversationResult =
  | { status: 401; body: { error: string } }
  | { status: 404; body: { error: string } }
  | { status: 200; body: ConversationWithMessages };

export async function handleListConversations(
  session: SessionUser,
  deps: {
    listConversations: (userId: string) => Promise<ConversationSummary[]>;
  },
): Promise<ListConversationsResult> {
  if (!session?.user.id) {
    return { status: 401, body: { error: "Unauthorized" } };
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
    return { status: 401, body: { error: "Unauthorized" } };
  }

  if (!conversationIdSchema.safeParse(conversationId).success) {
    return { status: 404, body: { error: "Conversation not found" } };
  }

  const conversation = await deps.getConversation(
    session.user.id,
    conversationId,
  );
  if (!conversation) {
    return { status: 404, body: { error: "Conversation not found" } };
  }

  return { status: 200, body: conversation };
}
