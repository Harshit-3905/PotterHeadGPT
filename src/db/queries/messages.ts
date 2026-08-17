import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { CitationPayload, ChatTurn, GroundedAnswer } from "@/rag/types";
import type { Database } from "../client";
import {
  conversations,
  messageCitations,
  messages,
} from "../schema/chat";

export const HISTORY_TURN_LIMIT = 6;

export type PersistExchangeInput = {
  userId: string;
  conversationId: string;
  question: string;
  answer: GroundedAnswer;
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
  citations: CitationPayload[];
};

export type ConversationWithMessages = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ConversationMessage[];
};

export async function listRecentTurns(
  db: Database,
  userId: string,
  conversationId: string,
  limit = HISTORY_TURN_LIMIT,
): Promise<ChatTurn[]> {
  const rows = await db
    .select({
      role: messages.role,
      content: messages.content,
    })
    .from(messages)
    .innerJoin(
      conversations,
      eq(messages.conversationId, conversations.id),
    )
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
        inArray(messages.role, ["user", "assistant"]),
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return rows
    .slice()
    .reverse()
    .map((row) => ({
      role: row.role as "user" | "assistant",
      content: row.content,
    }));
}

export async function persistExchange(
  db: Database,
  input: PersistExchangeInput,
): Promise<{ userMessageId: string; assistantMessageId: string }> {
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(conversations.id, input.conversationId),
          eq(conversations.userId, input.userId),
        ),
      )
      .returning({ id: conversations.id });

    if (updated.length === 0) {
      throw new Error("Conversation not found");
    }

    const [userMessage] = await tx
      .insert(messages)
      .values({
        conversationId: input.conversationId,
        role: "user",
        content: input.question,
      })
      .returning({ id: messages.id });

    const [assistantMessage] = await tx
      .insert(messages)
      .values({
        conversationId: input.conversationId,
        role: "assistant",
        content: input.answer.answer,
      })
      .returning({ id: messages.id });

    if (!userMessage || !assistantMessage) {
      throw new Error("Failed to persist messages");
    }

    if (!input.answer.refused && input.answer.citations.length > 0) {
      await tx.insert(messageCitations).values(
        input.answer.citations.map((citation) => ({
          messageId: assistantMessage.id,
          chunkId: citation.chunkId,
          ordinal: citation.ordinal,
          quoteSnapshot: citation.quote,
          metadataSnapshot: {
            book: citation.book,
            chapter: citation.chapter,
          },
        })),
      );
    }

    return {
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
    };
  });
}

export async function getConversationWithMessages(
  db: Database,
  userId: string,
  conversationId: string,
): Promise<ConversationWithMessages | null> {
  const [conversation] = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId),
      ),
    )
    .limit(1);

  if (!conversation) {
    return null;
  }

  const messageRows = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  const citationRows =
    messageRows.length === 0
      ? []
      : await db
          .select({
            messageId: messageCitations.messageId,
            chunkId: messageCitations.chunkId,
            ordinal: messageCitations.ordinal,
            quoteSnapshot: messageCitations.quoteSnapshot,
            metadataSnapshot: messageCitations.metadataSnapshot,
          })
          .from(messageCitations)
          .where(
            inArray(
              messageCitations.messageId,
              messageRows.map((row) => row.id),
            ),
          )
          .orderBy(asc(messageCitations.ordinal));

  const citationsByMessage = new Map<string, CitationPayload[]>();
  for (const row of citationRows) {
    const list = citationsByMessage.get(row.messageId) ?? [];
    list.push({
      ordinal: row.ordinal,
      chunkId: row.chunkId,
      quote: row.quoteSnapshot,
      book: row.metadataSnapshot.book,
      chapter: row.metadataSnapshot.chapter,
    });
    citationsByMessage.set(row.messageId, list);
  }

  return {
    ...conversation,
    messages: messageRows.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.createdAt,
      citations: citationsByMessage.get(row.id) ?? [],
    })),
  };
}
