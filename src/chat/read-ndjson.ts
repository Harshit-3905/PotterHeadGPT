import { parseEvent, type ChatStreamEvent } from "@/rag/stream-events";

export async function* readChatNdjson(
  response: Response,
): AsyncGenerator<ChatStreamEvent> {
  const body = response.body;
  if (!body) {
    throw new Error("Chat response was not a stream");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: !done });
    }
    if (done) {
      buffer += decoder.decode();
    }

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        yield parseEvent(trimmed);
      }
    }

    if (done) {
      const tail = buffer.trim();
      if (tail) {
        yield parseEvent(tail);
      }
      break;
    }
  }
}
