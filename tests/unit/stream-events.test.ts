// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  encodeEvent,
  parseEvent,
  type ChatStreamEvent,
} from "@/rag/stream-events";

const usage = {
  limit: 5,
  used: 1,
  remaining: 4,
  resetsAt: "2026-08-18T00:00:00.000Z",
  unlimited: false,
};

const citations = [
  {
    ordinal: 1,
    chunkId: "44444444-4444-4444-8444-444444444444",
    quote: "The lightning-shaped scar.",
    book: "The Lantern Academy",
    chapter: "The Moonstone Key",
  },
];

const events: ChatStreamEvent[] = [
  {
    type: "start",
    conversationId: "33333333-3333-4333-8333-333333333333",
    userMessageId: "11111111-1111-4111-8111-111111111111",
  },
  { type: "token", value: "Harry" },
  { type: "citations", value: citations },
  { type: "usage", value: usage },
  {
    type: "done",
    assistantMessageId: "22222222-2222-4222-8222-222222222222",
  },
  { type: "error", code: "stream_failed", message: "Something went wrong" },
];

function roundTrip(event: ChatStreamEvent): ChatStreamEvent {
  return parseEvent(new TextDecoder().decode(encodeEvent(event)).trim());
}

describe("encodeEvent / parseEvent", () => {
  it("round-trips every ChatStreamEvent variant", () => {
    for (const event of events) {
      expect(roundTrip(event)).toEqual(event);
    }
  });

  it("frames each event as a single JSON object plus newline", () => {
    const encoded = encodeEvent({ type: "token", value: "Harry" });
    expect(new TextDecoder().decode(encoded)).toBe(
      '{"type":"token","value":"Harry"}\n',
    );
  });

  it("rejects unknown event types and malformed payloads", () => {
    expect(() => parseEvent("{")).toThrow();
    expect(() => parseEvent(JSON.stringify({ type: "nope" }))).toThrow();
    expect(() =>
      parseEvent(JSON.stringify({ type: "token" })),
    ).toThrow();
    expect(() =>
      parseEvent(JSON.stringify({ type: "start", conversationId: "bad" })),
    ).toThrow();
  });
});
