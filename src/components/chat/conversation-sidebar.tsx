"use client";

import Link from "next/link";
import type { ChatThreadSummary } from "./types";

export function ConversationSidebar({
  conversations,
  activeId,
  onClose,
}: {
  conversations: ChatThreadSummary[];
  activeId: string | null;
  onClose?: () => void;
}) {
  return (
    <nav aria-label="Conversations" className="flex h-full flex-col">
      <Link
        href="/chat"
        onClick={onClose}
        className="mx-3 mt-3 rounded-full border border-gold/40 px-4 py-2 text-center text-xs uppercase tracking-[0.16em] text-gold transition-colors hover:bg-gold/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
      >
        New question
      </Link>

      <ul className="mt-4 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {conversations.length === 0 ? (
          <li className="px-3 py-6 text-sm leading-6 text-parchment-dim">
            No threads yet. Ask the books something.
          </li>
        ) : (
          conversations.map((conversation) => {
            const active = conversation.id === activeId;
            return (
              <li key={conversation.id}>
                <Link
                  href={`/chat/${conversation.id}`}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2.5 text-sm leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright ${
                    active
                      ? "bg-gold/15 text-parchment"
                      : "text-parchment-dim hover:bg-ink-raised hover:text-parchment"
                  }`}
                >
                  {conversation.title}
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </nav>
  );
}
