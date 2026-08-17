"use client";

import Link from "next/link";
import { giltPlate } from "@/components/ui/gilt";
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
    <nav aria-label="Conversations" className="relative z-10 flex h-full flex-col">
      <div className="shrink-0 px-4 pt-5">
        <p className="px-1 font-display text-lg font-light tracking-tight text-parchment">
          The stacks
        </p>
        <Link href="/chat" onClick={onClose} className={`${giltPlate} mt-4 w-full`}>
          New question
        </Link>
      </div>

      <ul className="mt-6 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
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
                  className={`block border-l-2 px-3 py-2.5 text-sm leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright ${
                    active
                      ? "border-gold bg-gold/12 text-parchment"
                      : "border-transparent text-parchment-dim hover:border-gold/30 hover:bg-ink-raised hover:text-parchment"
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
