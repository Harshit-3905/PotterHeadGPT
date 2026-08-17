import type { CitationPayload } from "@/rag/types";
import type { UserRole } from "@/auth/roles";

export type ChatSessionView = {
  id: string;
  role: UserRole;
  isGuest: boolean;
  name: string | null;
  email: string | null;
};

export type ChatThreadSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type ChatMessageView = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  citations: CitationPayload[];
  status?: "complete" | "streaming" | "failed";
};

export type ChatConversationView = {
  id: string;
  title: string;
  messages: ChatMessageView[];
};
