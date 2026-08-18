// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  chatResultToEvents,
  safeChatEvents,
  toChatHttpResponse,
  toLiveChatResponse,
} from "@/chat/stream";
import type { ChatResponse } from "@/chat/handle-chat";
import { parseEvent, type ChatStreamEvent } from "@/rag/stream-events";
import type { ChatTurn } from "@/rag/types";

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

describe("toLiveChatResponse", () => {
  it("emits start and tokens before generate finishes", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const generate = async ({
      onToken,
    }: {
      question: string;
      history: ChatTurn[];
      onToken?: (token: string) => void;
    }) => {
      onToken?.("The scar ");
      await gate;
      onToken?.("is from the curse. [1]");
      return {
        answer: success.body.answer,
        citations: success.body.citations,
        refused: false as const,
      };
    };

    const persistExchange = async () => ({
      userMessageId: success.body.userMessageId,
      assistantMessageId: success.body.assistantMessageId,
    });

    const response = toLiveChatResponse(
      {
        userId: "11111111-1111-4111-8111-111111111111",
        role: "user",
        message: "Why the scar?",
        conversationId: success.body.conversationId,
        history: [],
        usage: success.body.usage,
      },
      {
        generate,
        persistExchange,
        releaseMessage: async () => undefined,
      },
    );

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();
    const decoder = new TextDecoder();
    let buffer = "";
    const events: ChatStreamEvent[] = [];

    while (events.length < 2) {
      const { done, value } = await reader!.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) {
          events.push(parseEvent(line));
        }
      }
    }

    expect(events[0]).toMatchObject({
      type: "start",
      conversationId: success.body.conversationId,
    });
    expect(events[1]).toEqual({ type: "token", value: "The scar " });

    release();

    while (true) {
      const { done, value } = await reader!.read();
      if (value) {
        buffer += decoder.decode(value, { stream: !done });
      }
      if (done) {
        buffer += decoder.decode();
        break;
      }
    }

    expect(buffer).toContain('"type":"done"');
    expect(buffer).toContain('"type":"token","value":"is from the curse. [1]"');
  });
});

describe("toChatHttpResponse", () => {
  it("returns ordinary JSON 429 before the stream starts", async () => {
    const response = toChatHttpResponse({
      status: 429,
      body: {
        code: "daily_limit_reached",
        usage: success.body.usage,
      },
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("content-type")).toMatch(/application\/json/);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      code: "daily_limit_reached",
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
