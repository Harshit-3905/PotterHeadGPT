"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { beginGoogleUpgrade, signOutToLogin } from "@/auth/actions";
import { readChatNdjson } from "@/chat/read-ndjson";
import type { UsageStatus } from "@/usage/types";
import { ChatComposer } from "./chat-composer";
import { ConversationSidebar } from "./conversation-sidebar";
import { MessageList } from "./message-list";
import { QuotaBanner } from "./quota-banner";
import type {
  ChatConversationView,
  ChatMessageView,
  ChatSessionView,
  ChatThreadSummary,
} from "./types";

export function ChatShell({
  session,
  usage,
  conversations,
  conversation,
  hasCorpus,
}: {
  session: ChatSessionView;
  usage: UsageStatus;
  conversations: ChatThreadSummary[];
  conversation: ChatConversationView | null;
  hasCorpus: boolean;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(conversation?.id ?? null);
  const [threads, setThreads] = useState(conversations);
  const [messages, setMessages] = useState<ChatMessageView[]>(
    conversation?.messages ?? [],
  );
  const [quota, setQuota] = useState(usage);
  const [sending, setSending] = useState(false);
  const [preset, setPreset] = useState({ text: "", nonce: 0 });
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [retryQuestion, setRetryQuestion] = useState<string | null>(null);
  const streaming = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streaming.current) {
      return;
    }
    setActiveId(conversation?.id ?? null);
    setMessages(conversation?.messages ?? []);
    setThreads(conversations);
    setQuota(usage);
  }, [conversation, conversations, usage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages]);

  const identity = session.isGuest
    ? "Guest session"
    : (session.name ?? session.email ?? "Signed in");

  async function send(question: string, appendUser: boolean) {
    if (sending) {
      return;
    }

    setSending(true);
    setError(null);
    setRetryQuestion(null);
    streaming.current = true;

    const tempUserId = `temp-user-${crypto.randomUUID()}`;
    const tempAssistantId = `temp-asst-${crypto.randomUUID()}`;

    if (appendUser) {
      setMessages((current) => [
        ...current,
        {
          id: tempUserId,
          role: "user",
          content: question,
          createdAt: new Date().toISOString(),
          citations: [],
        },
        {
          id: tempAssistantId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          citations: [],
          status: "streaming",
        },
      ]);
    } else {
      setMessages((current) => [
        ...current.filter((message) => message.status !== "failed"),
        {
          id: tempAssistantId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          citations: [],
          status: "streaming",
        },
      ]);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId ?? undefined,
          message: question,
        }),
      });

      if (response.status === 429) {
        const body = (await response.json()) as {
          usage?: UsageStatus;
        };
        if (body.usage) {
          setQuota(body.usage);
        }
        setMessages((current) =>
          current.filter(
            (message) =>
              message.id !== tempUserId && message.id !== tempAssistantId,
          ),
        );
        setPreset({ text: question, nonce: Date.now() });
        streaming.current = false;
        setSending(false);
        return;
      }

      if (!response.ok) {
        throw new Error("request_failed");
      }

      let conversationId = activeId;
      let failed = false;

      for await (const event of readChatNdjson(response)) {
        if (event.type === "start") {
          conversationId = event.conversationId;
          setActiveId(event.conversationId);
          window.history.replaceState(null, "", `/chat/${event.conversationId}`);
          setMessages((current) =>
            current.map((message) =>
              message.id === tempUserId
                ? { ...message, id: event.userMessageId }
                : message,
            ),
          );
          setThreads((current) => {
            if (current.some((thread) => thread.id === event.conversationId)) {
              return current;
            }
            return [
              {
                id: event.conversationId,
                title: question,
                updatedAt: new Date().toISOString(),
              },
              ...current,
            ];
          });
        }

        if (event.type === "token") {
          setMessages((current) =>
            current.map((message) =>
              message.id === tempAssistantId
                ? { ...message, content: message.content + event.value }
                : message,
            ),
          );
        }

        if (event.type === "citations") {
          setMessages((current) =>
            current.map((message) =>
              message.id === tempAssistantId
                ? { ...message, citations: event.value }
                : message,
            ),
          );
        }

        if (event.type === "usage") {
          setQuota(event.value);
        }

        if (event.type === "done") {
          setMessages((current) =>
            current.map((message) =>
              message.id === tempAssistantId
                ? {
                    ...message,
                    id: event.assistantMessageId,
                    status: "complete",
                  }
                : message,
            ),
          );
        }

        if (event.type === "error") {
          failed = true;
          setRetryQuestion(question);
          setMessages((current) =>
            current.map((message) =>
              message.id === tempAssistantId
                ? { ...message, status: "failed" }
                : message,
            ),
          );
        }
      }

      if (conversationId && !failed) {
        router.replace(`/chat/${conversationId}`);
      }
    } catch {
      setMessages((current) =>
        current.map((message) =>
          message.id === tempAssistantId
            ? { ...message, status: "failed" }
            : message,
        ),
      );
      setRetryQuestion(question);
      setError("The library could not be reached. Check your connection.");
    } finally {
      streaming.current = false;
      setSending(false);
    }
  }

  const composerLocked =
    sending || !hasCorpus || (quota.remaining <= 0 && !quota.unlimited);

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="relative hidden w-72 shrink-0 border-r border-ink-edge bg-ink/40 md:flex md:flex-col">
        <div className="star-field pointer-events-none absolute inset-0 opacity-40" />
        <ConversationSidebar conversations={threads} activeId={activeId} />
      </aside>

      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-[60] bg-ink/70 md:hidden"
          role="presentation"
          onClick={() => setSidebarOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Conversations"
            className="relative z-10 flex h-full w-72 flex-col border-r border-ink-edge bg-ink"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="star-field pointer-events-none absolute inset-0 opacity-40" />
            <ConversationSidebar
              conversations={threads}
              activeId={activeId}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-ink-edge px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-full border border-ink-edge px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-parchment-dim md:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
              onClick={() => setSidebarOpen(true)}
            >
              Threads
            </button>
            <h1 className="font-display text-2xl font-light tracking-tight text-parchment">
              PotterHeadGPT
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <p className="rounded-full border border-gold/40 px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-gold">
              {identity}
            </p>
            {session.role === "admin" ? (
              <p className="text-xs uppercase tracking-[0.14em] text-parchment-dim">
                Admin — unlimited
              </p>
            ) : null}
            {session.isGuest ? (
              <form action={beginGoogleUpgrade}>
                <button
                  type="submit"
                  className="rounded-full bg-gold px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-ink transition-colors hover:bg-gold-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
                >
                  Sign in with Google
                </button>
              </form>
            ) : null}
            <form action={signOutToLogin}>
              <button
                type="submit"
                className="rounded-full border border-ink-edge px-4 py-2 text-xs uppercase tracking-[0.14em] text-parchment-dim transition-colors hover:border-gold/60 hover:text-parchment focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <MessageList
            messages={messages}
            onExample={(question) =>
              setPreset({ text: question, nonce: Date.now() })
            }
          />
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-ink-edge px-4 py-4 sm:px-8">
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            <QuotaBanner usage={quota} />
            {session.isGuest ? (
              <p className="text-sm leading-6 text-parchment-dim">
                Sign in to keep history across devices.
              </p>
            ) : null}
            {!hasCorpus ? (
              <p className="text-sm text-crimson" role="status">
                Books not ingested yet.
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-crimson" role="alert">
                {error}
              </p>
            ) : null}
            {retryQuestion ? (
              <button
                type="button"
                className="self-start text-xs uppercase tracking-[0.14em] text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
                onClick={() => void send(retryQuestion, false)}
              >
                Retry
              </button>
            ) : null}
            <ChatComposer
              key={preset.nonce}
              remaining={quota.unlimited ? 1 : quota.remaining}
              disabled={composerLocked}
              preset={preset.text}
              onSubmit={(question) => void send(question, true)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
