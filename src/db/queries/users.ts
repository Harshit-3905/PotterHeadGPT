import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { UserClaims } from "@/auth/claims";
import { roleFromDatabase } from "@/auth/roles";
import { db } from "@/db";
import { users } from "@/db/schema";

export type GuestUser = {
  id: string;
  role: UserClaims["role"];
  isGuest: true;
};

const userIdSchema = z.uuid();

export async function findUserClaims(
  userId: string,
): Promise<UserClaims | null> {
  // A malformed id would make Postgres reject the uuid comparison outright.
  if (!userIdSchema.safeParse(userId).success) {
    return null;
  }

  const [user] = await db
    .select({ role: users.role, isGuest: users.isGuest })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user
    ? {
        role: roleFromDatabase(user.role),
        isGuest: user.isGuest,
      }
    : null;
}

export async function createGuestUser(): Promise<GuestUser> {
  const [guest] = await db
    .insert(users)
    .values({ name: "Guest", isGuest: true, role: "user" })
    .returning({ id: users.id, role: users.role });

  if (!guest) {
    throw new Error("Failed to create a guest user.");
  }

  return { id: guest.id, role: roleFromDatabase(guest.role), isGuest: true };
}
