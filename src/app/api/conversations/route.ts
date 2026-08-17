import { NextResponse } from "next/server";
import { auth } from "@/auth/config";
import { handleListConversations } from "@/chat/conversations";
import { db } from "@/db";
import { listConversations } from "@/db/queries/conversations";

export async function GET() {
  const session = await auth();
  const result = await handleListConversations(session, {
    listConversations: (userId) => listConversations(db, userId),
  });

  return NextResponse.json(result.body, { status: result.status });
}
