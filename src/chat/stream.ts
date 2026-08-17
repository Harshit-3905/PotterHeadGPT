import type { ChatResponse } from "./handle-chat";
import {
  encodeEvent,
  type ChatStreamEvent,
} from "@/rag/stream-events";

export const TOKEN_CHUNK_SIZE = 32;

export function chunkText(
  text: string,
  size = TOKEN_CHUNK_SIZE,
): string[] {
  const chars = Array.from(text);
  const chunks: string[] = [];
  for (let index = 0; index < chars.length; index += size) {
    chunks.push(chars.slice(index, index + size).join(""));
  }
  return chunks;
}

export function chatResultToEvents(
  result: Extract<ChatResponse, { status: 200 }>,
): ChatStreamEvent[] {
  const { body } = result;
  return [
    {
      type: "start",
      conversationId: body.conversationId,
      userMessageId: body.userMessageId,
    },
    ...chunkText(body.answer).map((value) => ({
      type: "token" as const,
      value,
    })),
    { type: "citations", value: body.citations },
    { type: "usage", value: body.usage },
    { type: "done", assistantMessageId: body.assistantMessageId },
  ];
}

export async function* safeChatEvents(
  source: AsyncIterable<ChatStreamEvent>,
): AsyncGenerator<ChatStreamEvent> {
  try {
    for await (const event of source) {
      yield event;
    }
  } catch {
    yield {
      type: "error",
      code: "stream_failed",
      message: "Something went wrong",
    };
  }
}

async function* eventsFromArray(
  events: ChatStreamEvent[],
): AsyncGenerator<ChatStreamEvent> {
  for (const event of events) {
    yield event;
  }
}

export function toChatHttpResponse(result: ChatResponse): Response {
  if (result.status !== 200) {
    return Response.json(result.body, { status: result.status });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const event of safeChatEvents(
        eventsFromArray(chatResultToEvents(result)),
      )) {
        controller.enqueue(encodeEvent(event));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
