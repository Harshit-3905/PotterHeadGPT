// @vitest-environment node
import { describe, expect, it } from "vitest";
import { encodeEvent, type ChatStreamEvent } from "@/rag/stream-events";
import { readChatNdjson } from "@/chat/read-ndjson";

const events: ChatStreamEvent[] = [
  {
    type: "start",
    conversationId: "33333333-3333-4333-8333-333333333333",
    userMessageId: "11111111-1111-4111-8111-111111111111",
  },
  { type: "token", value: "The scar " },
  { type: "token", value: "is from the curse. [1]" },
  {
    type: "done",
    assistantMessageId: "22222222-2222-4222-8222-222222222222",
  },
];

function responseFromChunks(chunks: Uint8Array[]): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    }),
    { headers: { "Content-Type": "application/x-ndjson; charset=utf-8" } },
  );
}

describe("readChatNdjson", () => {
  it("parses events even when a line is split across chunks", async () => {
    const bytes = encodeEvent(events[0]!);
    const splitAt = Math.max(1, Math.floor(bytes.length / 2));
    const response = responseFromChunks([
      bytes.slice(0, splitAt),
      bytes.slice(splitAt),
      encodeEvent(events[1]!),
      encodeEvent(events[2]!),
      encodeEvent(events[3]!),
    ]);

    const received: ChatStreamEvent[] = [];
    for await (const event of readChatNdjson(response)) {
      received.push(event);
    }

    expect(received).toEqual(events);
  });
});
