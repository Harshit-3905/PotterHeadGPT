"use client";

import { MessageContent } from "./message-content";
import type { ChatMessageView } from "./types";

export function MessageBubble({ message }: { message: ChatMessageView }) {
  if (message.role === "system") {
    return null;
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <article
        className={`max-w-[min(100%,42rem)] px-5 py-4 text-[1.05rem] leading-8 ${
          isUser
            ? "wax-card border border-gold/35 text-parchment"
            : "manuscript corner-frame text-parchment"
        }`}
      >
        {message.status === "streaming" && message.content === "" ? (
          <p className="text-parchment-dim">Searching the stacks…</p>
        ) : (
          <MessageContent
            content={message.content}
            citations={message.citations}
          />
        )}
        {message.status === "failed" ? (
          <p className="mt-3 text-sm text-crimson" role="alert">
            That answer did not come through.
          </p>
        ) : null}
      </article>
    </div>
  );
}
