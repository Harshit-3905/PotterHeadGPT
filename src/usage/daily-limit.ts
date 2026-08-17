import { and, eq, sql } from "drizzle-orm";
import { isAdmin, type UserRole } from "@/auth/roles";
import type { Database } from "@/db/client";
import { dailyUsage } from "@/db/schema/usage";
import type { UsageStatus } from "./types";

export type UsageLookup = {
  userId: string;
  role: UserRole;
  limit: number;
  now?: Date;
};

export function utcDateString(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function nextUtcMidnightIso(now: Date): string {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
    ),
  ).toISOString();
}

export function toUsageStatus(input: {
  limit: number;
  used: number;
  unlimited: boolean;
  now: Date;
}): UsageStatus {
  return {
    limit: input.limit,
    used: input.unlimited ? 0 : input.used,
    remaining: input.unlimited
      ? input.limit
      : Math.max(input.limit - input.used, 0),
    resetsAt: nextUtcMidnightIso(input.now),
    unlimited: input.unlimited,
  };
}

function clock(now?: Date): Date {
  return now ?? new Date();
}

export async function getUsageStatus(
  db: Database,
  input: UsageLookup,
): Promise<UsageStatus> {
  const now = clock(input.now);
  if (isAdmin(input.role)) {
    return toUsageStatus({
      limit: input.limit,
      used: 0,
      unlimited: true,
      now,
    });
  }

  const usageDate = utcDateString(now);
  const [row] = await db
    .select({ messageCount: dailyUsage.messageCount })
    .from(dailyUsage)
    .where(
      and(
        eq(dailyUsage.userId, input.userId),
        eq(dailyUsage.usageDate, usageDate),
      ),
    )
    .limit(1);

  return toUsageStatus({
    limit: input.limit,
    used: row?.messageCount ?? 0,
    unlimited: false,
    now,
  });
}

export async function reserveMessage(
  db: Database,
  input: UsageLookup,
): Promise<
  { allowed: true; status: UsageStatus } | { allowed: false; status: UsageStatus }
> {
  const now = clock(input.now);
  if (isAdmin(input.role)) {
    return {
      allowed: true,
      status: toUsageStatus({
        limit: input.limit,
        used: 0,
        unlimited: true,
        now,
      }),
    };
  }

  const usageDate = utcDateString(now);
  const [row] = await db
    .insert(dailyUsage)
    .values({
      userId: input.userId,
      usageDate,
      messageCount: 1,
    })
    .onConflictDoUpdate({
      target: [dailyUsage.userId, dailyUsage.usageDate],
      set: {
        messageCount: sql`${dailyUsage.messageCount} + 1`,
      },
      setWhere: sql`${dailyUsage.messageCount} < ${input.limit}`,
    })
    .returning({ messageCount: dailyUsage.messageCount });

  if (!row) {
    return {
      allowed: false,
      status: await getUsageStatus(db, { ...input, now }),
    };
  }

  return {
    allowed: true,
    status: toUsageStatus({
      limit: input.limit,
      used: row.messageCount,
      unlimited: false,
      now,
    }),
  };
}

export async function releaseMessage(
  db: Database,
  input: UsageLookup,
): Promise<void> {
  if (isAdmin(input.role)) {
    return;
  }

  const now = clock(input.now);
  await db
    .update(dailyUsage)
    .set({
      messageCount: sql`greatest(${dailyUsage.messageCount} - 1, 0)`,
    })
    .where(
      and(
        eq(dailyUsage.userId, input.userId),
        eq(dailyUsage.usageDate, utcDateString(now)),
      ),
    );
}
