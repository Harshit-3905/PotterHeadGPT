// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  chatResultToEvents,
  safeChatEvents,
  toChatHttpResponse,
} from "@/chat/stream";
import { parseEvent, type ChatStreamEvent } from "@/rag/stream-events";
import type { ChatResponse } from "@/chat/handle-chat";

const success: Extract<ChatResponse, { status: 200 }> = {
  status: 200,
  body: {
    conversationId: "33333333-3333-4333-8333-333333333333",
    userMessageId: "11111111-1111-4111-8111-111111111111",
    assistantMessageId: "22222222-2222-4222-8222-222222222222",
    answer: "The scar is from the killing curse. [1]",
    citations: [
      {
        ordinal: 1,
        chunkId: "44444444-4444-4444-8444-444444444444",
        quote: "The lightning-shaped scar.",
        book: "The Lantern Academy",
        chapter: "The Moonstone Key",
      },
    ],
    refused: false,
    usage: {
      limit: 5,
      used: 1,
      remaining: 4,
      resetsAt: "2026-08-18T00:00:00.000Z",
      unlimited: false,
    },
  },
};

describe("chatResultToEvents", () => {
  it("reconstructs the stored assistant content from token events", () => {
    const events = chatResultToEvents(success);
    const types = events.map((event) => event.type);

    expect(types[0]).toBe("start");
    expect(types.at(-1)).toBe("done");
    expect(types).toContain("citations");
    expect(types).toContain("usage");
    expect(
      events
        .filter((event): event is Extract<ChatStreamEvent, { type: "token" }> =>
          event.type === "token",
        )
        .map((event) => event.value)
        .join(""),
    ).toBe(success.body.answer);
  });
});

describe("safeChatEvents", () => {
  it("emits error and skips done when the source fails after start", async () => {
    async function* failing(): AsyncGenerator<ChatStreamEvent> {
      yield {
        type: "start",
        conversationId: success.body.conversationId,
        userMessageId: success.body.userMessageId,
      };
      throw new Error("openai down");
    }

    const events: ChatStreamEvent[] = [];
    for await (const event of safeChatEvents(failing())) {
      events.push(event);
    }

    expect(events[0]).toMatchObject({ type: "start" });
    expect(events.at(-1)).toEqual({
      type: "error",
      code: "stream_failed",
      message: "Something went wrong",
    });
    expect(events.some((event) => event.type === "done")).toBe(false);
  });
});

describe("toChatHttpResponse", () => {
  it("returns ordinary JSON 429 before the stream starts", async () => {
    const response = toChatHttpResponse({
      status: 429,
      body: {
        error: "Daily message limit reached",
        usage: success.body.usage,
      },
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("content-type")).toMatch(/application\/json/);
    await expect(response.json()).resolves.toEqual({
      error: "Daily message limit reached",
      usage: success.body.usage,
    });
  });

  it("streams validated NDJSON for a complete exchange", async () => {
    const response = toChatHttpResponse(success);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/x-ndjson; charset=utf-8",
    );

    const events = (await response.text())
      .trim()
      .split("\n")
      .map((line) => parseEvent(line));

    expect(events[0]).toMatchObject({
      type: "start",
      conversationId: success.body.conversationId,
      userMessageId: success.body.userMessageId,
    });
    expect(events.at(-1)).toEqual({
      type: "done",
      assistantMessageId: success.body.assistantMessageId,
    });
  });
});
