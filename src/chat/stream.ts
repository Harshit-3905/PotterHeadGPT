import type { ChatDeps, ChatResponse, PreparedChat } from "./handle-chat";
import {
  applySecurityHeaders,
  safeErrorResponse,
} from "@/lib/http";
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
    return safeErrorResponse(result.body.code, result.status, {
      ...(result.status === 429 ? { usage: result.body.usage } : {}),
    });
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

  return applySecurityHeaders(
    new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
        "X-Content-Type-Options": "nosniff",
      },
    }),
  );
}

export function toLiveChatResponse(
  prepared: PreparedChat,
  deps: Pick<ChatDeps, "generate" | "persistExchange" | "releaseMessage">,
): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const userMessageId = crypto.randomUUID();

      try {
        controller.enqueue(
          encodeEvent({
            type: "start",
            conversationId: prepared.conversationId,
            userMessageId,
          }),
        );

        const answer = await deps.generate({
          question: prepared.message,
          history: prepared.history,
          onToken: (value) => {
            controller.enqueue(encodeEvent({ type: "token", value }));
          },
        });

        const persisted = await deps.persistExchange({
          userId: prepared.userId,
          conversationId: prepared.conversationId,
          question: prepared.message,
          answer,
        });

        controller.enqueue(
          encodeEvent({ type: "citations", value: answer.citations }),
        );
        controller.enqueue(
          encodeEvent({ type: "usage", value: prepared.usage }),
        );
        controller.enqueue(
          encodeEvent({
            type: "done",
            assistantMessageId: persisted.assistantMessageId,
            content: answer.answer,
          }),
        );
        controller.close();
      } catch {
        await deps.releaseMessage(prepared.userId, prepared.role);
        controller.enqueue(
          encodeEvent({
            type: "error",
            code: "stream_failed",
            message: "Something went wrong",
          }),
        );
        controller.close();
      }
    },
  });

  return applySecurityHeaders(
    new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
        "X-Content-Type-Options": "nosniff",
      },
    }),
  );
}
