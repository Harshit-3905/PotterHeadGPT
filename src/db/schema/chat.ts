import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const messageRole = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("conversations_user_id_idx").on(table.userId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("messages_conversation_id_idx").on(table.conversationId)],
);

export type CitationMetadataSnapshot = {
  book: string;
  chapter: string | null;
};

export const messageCitations = pgTable(
  "message_citations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    chunkId: uuid("chunk_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    quoteSnapshot: text("quote_snapshot").notNull(),
    metadataSnapshot: jsonb("metadata_snapshot")
      .$type<CitationMetadataSnapshot>()
      .notNull(),
  },
  (table) => [
    index("message_citations_message_id_idx").on(table.messageId),
    unique("message_citations_message_id_ordinal_unique").on(
      table.messageId,
      table.ordinal,
    ),
  ],
);

export type Conversation = InferSelectModel<typeof conversations>;
export type NewConversation = InferInsertModel<typeof conversations>;
export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;
export type MessageCitation = InferSelectModel<typeof messageCitations>;
export type NewMessageCitation = InferInsertModel<typeof messageCitations>;
