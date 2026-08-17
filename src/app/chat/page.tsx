import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth/config";
import { ChatShell } from "@/components/chat/chat-shell";
import { loadChatShell } from "@/chat/load-shell";

export const metadata: Metadata = {
  title: "Chat \u00b7 PotterHeadGPT",
};

export default async function ChatPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const shell = await loadChatShell(session);
  return <ChatShell {...shell} />;
}
