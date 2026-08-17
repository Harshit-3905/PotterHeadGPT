import { and, desc, eq } from "drizzle-orm";
import { conversationTitle } from "@/chat/title";
import type { Database } from "../client";
import {
  conversations,
  type Conversation,
} from "../schema/chat";

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function createConversation(
  db: Database,
  userId: string,
  firstQuestion: string,
): Promise<Conversation> {
  const [conversation] = await db
    .insert(conversations)
    .values({
      userId,
      title: conversationTitle(firstQuestion),
    })
    .returning();

  if (!conversation) {
    throw new Error("Failed to create conversation");
  }

  return conversation;
}

export async function findOwnedConversation(
  db: Database,
  userId: string,
  conversationId: string,
): Promise<{ id: string } | null> {
  const [conversation] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )
    .limit(1);

  return conversation ?? null;
}

export async function listConversations(
  db: Database,
  userId: string,
): Promise<ConversationSummary[]> {
  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}
