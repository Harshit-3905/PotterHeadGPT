import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "@/db/client";
import { conversations, dailyUsage, users } from "@/db/schema";

export type MergeGuestInput = {
  guestId: string;
  userId: string;
  today?: string;
};

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function mergeGuestIntoUser(
  input: MergeGuestInput,
): Promise<void> {
  const { db } = await import("@/db");

  await mergeGuestIntoUserWithDatabase(db, input);
}

export async function mergeGuestIntoUserWithDatabase(
  database: Database,
  input: MergeGuestInput,
): Promise<void> {
  if (input.guestId === input.userId) {
    return;
  }

  await database.transaction(async (transaction) => {
    const lockedUsers = await transaction
      .select({ id: users.id, isGuest: users.isGuest })
      .from(users)
      .where(inArray(users.id, [input.guestId, input.userId]))
      .orderBy(users.id)
      .for("update");
    const guest = lockedUsers.find((user) => user.id === input.guestId);
    const destination = lockedUsers.find((user) => user.id === input.userId);

    if (!guest) {
      return;
    }
    if (!destination) {
      throw new Error("Guest merge destination user does not exist.");
    }
    if (!guest.isGuest) {
      throw new Error("Guest merge source user is not a guest.");
    }
    if (destination.isGuest) {
      throw new Error("Guest merge destination user is still a guest.");
    }

    await transaction
      .update(conversations)
      .set({ userId: input.userId })
      .where(eq(conversations.userId, input.guestId));

    const today = input.today ?? utcToday();
    const usageRows = await transaction
      .select({
        userId: dailyUsage.userId,
        messageCount: dailyUsage.messageCount,
      })
      .from(dailyUsage)
      .where(
        and(
          inArray(dailyUsage.userId, [input.guestId, input.userId]),
          eq(dailyUsage.usageDate, today),
        ),
      )
      .for("update");
    const guestUsage =
      usageRows.find((row) => row.userId === input.guestId)?.messageCount ?? 0;

    if (guestUsage > 0) {
      await transaction
        .insert(dailyUsage)
        .values({
          userId: input.userId,
          usageDate: today,
          messageCount: guestUsage,
        })
        .onConflictDoUpdate({
          target: [dailyUsage.userId, dailyUsage.usageDate],
          set: {
            messageCount: sql`${dailyUsage.messageCount} + ${guestUsage}`,
          },
        });
    }

    await transaction
      .delete(dailyUsage)
      .where(eq(dailyUsage.userId, input.guestId));
    await transaction.delete(users).where(eq(users.id, input.guestId));
  });
}
