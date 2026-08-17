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
    "The Sorting Hat considers Slytherin for Harry because it recognizes qualities that Salazar Slytherin prized in his hand-picked students, such as resourcefulness, determination, and a certain disregard for rules. Additionally, the hat notes Harry's talent and a thirst to prove himself, which could lead to greatness in Slytherin. However, Harry specifically asks not to be placed in Slytherin, and the hat ultimately respects his choice and places him in Gryffindor instead [5].",
  createdAt: "1991-07-31T00:00:01.000Z",
  citations: [
    {
      ordinal: 5,
      chunkId: "2bdfa221-cc41-4256-bbac-3faed3f42764",
      quote:
        "Lockhart ambled out. Ron cast a curious look back at Dumbledore and Harry as he closed the door. Dumbledore crossed to one of the chairs by the fire. \"Sit down, Harry,\" he said, and Harry sat, feeling unaccountably nervous. \"First of all, Harry, I want to thank you,\" said Dumbledore, eyes twinkling again. \"You must have shown me real loyalty down in the Chamber. Nothing but that could have called Fawkes to you.\" He stroked the phoenix, which had fluttered down onto his knee. Harry grinned awkwardly as Dumbledore watched him. \"And so you met Tom Riddle,\" said Dumbledore thoughtfully. \"I imagine he was most interested in you. . . .\" Suddenly, something that was nagging at Harry came tumbling out of his mouth. \"Professor Dumbledore . . . Riddle said I'm like him. Strange likenesses, he said. . . .\" \"Did he, now?\" said Dumbledore, looking thoughtfully at Harry from under his thick silver eyebrows. \"And what do you think, Harry?\" \"I don't think I'm like him!\" said Harry, more loudly than he'd intended. \"I mean, I'm — I'm in Gryffindor, I'm . . .\" But he fell silent, a lurking doubt resurfacing in his mind. \"Professor,\" he started again after a moment. \"The Sorting Hat told me I'd — I'd have done well in Slytherin. Everyone thought I was Slytherin's heir for a while . . . because I can speak Parseltongue. . . .\" \"You can speak Parseltongue, Harry,\" said Dumbledore calmly, \"because Lord Voldemort — who is the last remaining descendant of Salazar Slytherin — can speak Parseltongue. Unless I'm much mistaken, he transferred some of his own powers to you the night he gave you that scar. Not something he intended to do, I'm sure. . . .\" \"Voldemort put a bit of himself in me?\" Harry said, thunderstruck. \"It certainly seems so.\" \"So I should be in Slytherin,\" Harry said, looking desperately into Dumbledore's face. \"The Sorting Hat could see Slytherin's power in me, and it —\" \"Put you in Gryffindor,\" said Dumbledore calmly. \"Listen to me, Harry. You happen to have many qualities Salazar Slytherin prized in his hand-picked students. His own very rare gift, Parseltongue — resourcefulness — determination — a certain disregard for rules,\" he added, his mustache quivering again. \"Yet the Sorting Hat placed you in Gryffindor. You know why that was. Think.\" \"It only put me in Gryffindor,\" said Harry in a defeated voice, \"because I asked not to go in Slytherin. . . .\" \"Exactly,\" said Dumbledore, beaming once more. \"Which makes you very different from Tom Riddle. It is our choices, Harry, that show what we truly are, far more than our abilities.\" Harry sat motionless in his chair, stunned. \"If you want proof, Harry, that you belong in Gryffindor, I suggest you look more closely at this.\" Dumbledore reached across to Professor McGonagall's desk, picked up the blood-stained silver sword, and handed it to Harry. Dully, Harry turned it over, the rubies blazing in the firelight. And then he saw the name engraved just below the hilt. Godric Gryffindor.",
      book: "Harry Potter And The Chamber Of Secrets",
      chapter: "Dobby's Reward",
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
