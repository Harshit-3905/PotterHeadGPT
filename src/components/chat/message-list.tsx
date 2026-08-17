"use client";

import { EXAMPLE_QUESTIONS } from "./example-questions";
import { MessageBubble } from "./message-bubble";
import type { ChatMessageView } from "./types";

export function MessageList({
  messages,
  onExample,
}: {
  messages: ChatMessageView[];
  onExample: (question: string) => void;
}) {
  if (messages.length === 0) {
    return (
      <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
        <p className="text-[0.62rem] font-medium uppercase tracking-[0.28em] text-gold">
          The Restricted Section
        </p>
        <h2 className="mt-4 font-display text-4xl font-light leading-tight text-parchment">
          The desk is empty
        </h2>
        <div aria-hidden="true" className="gilt-rule mx-auto mt-7 w-16" />
        <p className="mt-7 max-w-md text-base leading-7 text-parchment-dim">
          Ask a question about the seven books. Answers come back with the
          passages they were drawn from.
        </p>
        <ul className="mt-10 flex w-full flex-col gap-3">
          {EXAMPLE_QUESTIONS.map((question) => (
            <li key={question}>
              <button
                type="button"
                onClick={() => onExample(question)}
                className="manuscript corner-frame w-full px-4 py-3.5 text-left text-sm leading-6 text-parchment-dim transition-colors hover:text-parchment focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-bright"
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
      {messages.map((message) => (
        <li key={message.id}>
          <MessageBubble message={message} />
        </li>
      ))}
    </ol>
  );
}
