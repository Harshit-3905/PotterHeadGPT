// @vitest-environment node
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mergeGuestIntoUserWithDatabase } from "@/auth/merge-guest";
import { loadDatabaseUrl } from "@/db/env";
import * as schema from "@/db/schema";

const client = postgres(loadDatabaseUrl(), {
  prepare: false,
  max: 1,
});
const database = drizzle(client, { schema });
const { conversations, dailyUsage, users } = schema;
const createdUserIds: string[] = [];

async function createUser(isGuest: boolean): Promise<string> {
  const id = randomUUID();
  createdUserIds.push(id);
  await database.insert(users).values({
    id,
    isGuest,
    name: isGuest ? "Guest" : "Integration Test User",
    email: isGuest ? null : `${id}@example.test`,
  });
  return id;
}

beforeAll(async () => {
  await database.execute(sql`select 1`);
});

afterAll(async () => {
  if (createdUserIds.length > 0) {
    await database.delete(users).where(inArray(users.id, createdUserIds));
  }
  await client.end();
});

describe("mergeGuestIntoUserWithDatabase", { timeout: 30_000 }, () => {
  it("moves conversations, sums today's usage, and deletes the guest", async () => {
    const guestId = await createUser(true);
    const userId = await createUser(false);
    const today = "2026-08-17";
    const conversationIds = [randomUUID(), randomUUID()];

    await database.insert(conversations).values(
      conversationIds.map((id, index) => ({
        id,
        userId: guestId,
        title: `Guest conversation ${index}`,
      })),
    );
    await database.insert(dailyUsage).values([
      { userId: guestId, usageDate: today, messageCount: 3 },
      { userId, usageDate: today, messageCount: 2 },
      { userId: guestId, usageDate: "2026-08-16", messageCount: 4 },
    ]);

    await mergeGuestIntoUserWithDatabase(database, {
      guestId,
      userId,
      today,
    });

    const movedConversations = await database
      .select({ id: conversations.id, userId: conversations.userId })
      .from(conversations)
      .where(inArray(conversations.id, conversationIds));
    const usageRows = await database
      .select()
      .from(dailyUsage)
      .where(
        and(
          inArray(dailyUsage.userId, [guestId, userId]),
          eq(dailyUsage.usageDate, today),
        ),
      );
    const [guest] = await database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, guestId));

    expect(movedConversations).toHaveLength(2);
    expect(movedConversations.every((row) => row.userId === userId)).toBe(true);
    expect(usageRows).toEqual([
      { userId, usageDate: today, messageCount: 5 },
    ]);
    expect(guest).toBeUndefined();
  });

  it("is idempotent when the guest was already merged", async () => {
    const guestId = await createUser(true);
    const userId = await createUser(false);
    const today = "2026-08-17";
    await database
      .insert(dailyUsage)
      .values({ userId: guestId, usageDate: today, messageCount: 2 });

    await Promise.all([
      mergeGuestIntoUserWithDatabase(database, { guestId, userId, today }),
      mergeGuestIntoUserWithDatabase(database, { guestId, userId, today }),
    ]);

    const [usage] = await database
      .select()
      .from(dailyUsage)
      .where(
        and(
          eq(dailyUsage.userId, userId),
          eq(dailyUsage.usageDate, today),
        ),
      );

    expect(usage.messageCount).toBe(2);
  });

  it("rejects a non-guest source without mutating either user", async () => {
    const sourceId = await createUser(false);
    const userId = await createUser(false);

    await expect(
      mergeGuestIntoUserWithDatabase(database, {
        guestId: sourceId,
        userId,
        today: "2026-08-17",
      }),
    ).rejects.toThrow("source user is not a guest");

    const remaining = await database
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, [sourceId, userId]));
    expect(remaining).toHaveLength(2);
  });

  it("does nothing when both ids are the same", async () => {
    const guestId = await createUser(true);

    await mergeGuestIntoUserWithDatabase(database, {
      guestId,
      userId: guestId,
      today: "2026-08-17",
    });

    const [guest] = await database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, guestId));
    expect(guest).toEqual({ id: guestId });
  });
});
