"use client";

import { MessageContent } from "./message-content";
import type { ChatMessageView } from "./types";

const EXAMPLES = [
  "Why does Harry have a lightning-shaped scar?",
  "What does Hagrid take from vault seven hundred and thirteen?",
  "Who is the Half-Blood Prince?",
];

export function MessageList({
  messages,
  onExample,
}: {
  messages: ChatMessageView[];
  onExample: (question: string) => void;
}) {
  if (messages.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h2 className="font-display text-3xl font-light leading-tight text-parchment">
          Nothing asked yet
        </h2>
        <div
          aria-hidden="true"
          className="mx-auto mt-7 h-px w-16 bg-linear-to-r from-transparent via-gold-deep to-transparent"
        />
        <p className="mt-7 max-w-md text-base leading-7 text-parchment-dim">
          Ask a question about the seven books. Answers come back with the
          passages they were drawn from.
        </p>
        <ul className="mt-10 flex w-full flex-col gap-3">
          {EXAMPLES.map((question) => (
            <li key={question}>
              <button
                type="button"
                onClick={() => onExample(question)}
                className="w-full rounded-xl border border-ink-edge bg-ink-raised/60 px-4 py-3 text-left text-sm leading-6 text-parchment-dim transition-colors hover:border-gold/40 hover:text-parchment focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
              >
                {question}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ol className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      {messages.map((message) => {
        if (message.role === "system") {
          return null;
        }

        const isUser = message.role === "user";
        return (
          <li
            key={message.id}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-base leading-7 ${
                isUser
                  ? "border border-gold/35 bg-gold/10 text-parchment"
                  : "border border-ink-edge bg-ink-raised/80 text-parchment"
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
            </div>
          </li>
        );
      })}
    </ol>
  );
}
