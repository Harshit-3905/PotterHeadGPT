import { NextResponse } from "next/server";
import { auth } from "@/auth/config";
import { handleGetConversation } from "@/chat/conversations";
import { db } from "@/db";
import { getConversationWithMessages } from "@/db/queries/messages";

export async function GET(
  _request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  const session = await auth();
  const { conversationId } = await context.params;
  const result = await handleGetConversation(session, conversationId, {
    getConversation: (userId, id) =>
      getConversationWithMessages(db, userId, id),
  });

  return NextResponse.json(result.body, { status: result.status });
}
