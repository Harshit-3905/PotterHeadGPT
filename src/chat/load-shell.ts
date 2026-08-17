import type { Session } from "next-auth";
import { db } from "@/db";
import { listConversations } from "@/db/queries/conversations";
import { hasIngestedDocuments } from "@/db/queries/corpus";
import { getConversationWithMessages } from "@/db/queries/messages";
import { env } from "@/env";
import { getUsageStatus } from "@/usage/daily-limit";
import type {
  ChatConversationView,
  ChatSessionView,
  ChatThreadSummary,
} from "@/components/chat/types";
import type { UsageStatus } from "@/usage/types";

export type ChatShellData = {
  session: ChatSessionView;
  usage: UsageStatus;
  conversations: ChatThreadSummary[];
  conversation: ChatConversationView | null;
  hasCorpus: boolean;
};

export async function loadChatShell(
  session: Session,
  conversationId?: string,
): Promise<ChatShellData> {
  const [usage, conversations, hasCorpus, conversation] = await Promise.all([
    getUsageStatus(db, {
      userId: session.user.id,
      role: session.user.role,
      limit: env.DAILY_MESSAGE_LIMIT,
    }),
    listConversations(db, session.user.id),
    hasIngestedDocuments(db),
    conversationId
      ? getConversationWithMessages(db, session.user.id, conversationId)
      : Promise.resolve(null),
  ]);

  return {
    session: {
      id: session.user.id,
      role: session.user.role,
      isGuest: session.user.isGuest,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
    },
    usage,
    hasCorpus,
    conversations: conversations.map((thread) => ({
      id: thread.id,
      title: thread.title,
      updatedAt: thread.updatedAt.toISOString(),
    })),
    conversation: conversation
      ? {
          id: conversation.id,
          title: conversation.title,
          messages: conversation.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
            citations: message.citations,
          })),
        }
      : null,
  };
}
