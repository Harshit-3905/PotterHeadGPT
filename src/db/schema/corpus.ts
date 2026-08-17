import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import {
  char,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    sourcePath: text("source_path").notNull(),
    format: varchar("format", { length: 8 }).notNull(),
    checksum: char("checksum", { length: 64 }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("documents_source_path_unique").on(table.sourcePath),
  ],
);

export type Document = InferSelectModel<typeof documents>;
export type NewDocument = InferInsertModel<typeof documents>;
