import { NextResponse } from "next/server";
import { auth } from "@/auth/config";
import { db } from "@/db";
import { env } from "@/env";
import { getUsageStatus } from "@/usage/daily-limit";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const usage = await getUsageStatus(db, {
    userId: session.user.id,
    role: session.user.role,
    limit: env.DAILY_MESSAGE_LIMIT,
  });

  return NextResponse.json(usage);
}
