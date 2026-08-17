import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth/config";
import { ChatShell } from "@/components/chat/chat-shell";
import { loadChatShell } from "@/chat/load-shell";

export default async function ChatConversationPage({
  params,
}: PageProps<"/chat/[conversationId]">) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { conversationId } = await params;
  const shell = await loadChatShell(session, conversationId);
  if (!shell.conversation) {
    notFound();
  }

  return <ChatShell {...shell} />;
}
