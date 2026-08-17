"use client";

import { EXAMPLE_QUESTIONS } from "@/components/chat/example-questions";
import { MessageBubble } from "@/components/chat/message-bubble";
import type { ChatMessageView } from "@/components/chat/types";

export const SPECIMEN_QUESTION = EXAMPLE_QUESTIONS[0];

const userMessage: ChatMessageView = {
  id: "specimen-user",
  role: "user",
  content: SPECIMEN_QUESTION,
  createdAt: "1991-07-31T00:00:00.000Z",
  citations: [],
};

const assistantMessage: ChatMessageView = {
  id: "specimen-assistant",
  role: "assistant",
  content:
    "The Hat hears ambition in him, and a sharp wish to prove himself. Slytherin, it says, would help him on the way to greatness [1]. Harry asks not to go there. The Hat pauses — then sends him to Gryffindor, because the choice is his [2].",
  createdAt: "1991-07-31T00:00:01.000Z",
  citations: [
    {
      ordinal: 1,
      chunkId: "specimen-1",
      quote:
        "The Hat finds courage, a good mind, and a hunger to prove himself — and notes that Slytherin would serve that hunger well.",
      book: "Harry Potter and the Philosopher's Stone",
      chapter: "The Sorting Hat",
    },
    {
      ordinal: 2,
      chunkId: "specimen-2",
      quote:
        "He asks not to be Slytherin. After a moment the Hat yields and names him for Gryffindor.",
      book: "Harry Potter and the Philosopher's Stone",
      chapter: "The Sorting Hat",
    },
  ],
};

export function CitedSpecimen() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <MessageBubble message={userMessage} />
      <MessageBubble message={assistantMessage} />
    </div>
  );
}
