import {
  check,
  date,
  integer,
  pgTable,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";
import { sql, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import { users } from "./auth";

export const dailyUsage = pgTable(
  "daily_usage",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    usageDate: date("usage_date", { mode: "string" }).notNull(),
    messageCount: integer("message_count").default(0).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.usageDate] }),
    check("daily_usage_message_count_nonnegative", sql`${table.messageCount} >= 0`),
  ],
);

export type DailyUsage = InferSelectModel<typeof dailyUsage>;
export type NewDailyUsage = InferInsertModel<typeof dailyUsage>;
