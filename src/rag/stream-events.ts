import { z } from "zod";

const citationSchema = z.object({
  ordinal: z.number().int().positive(),
  chunkId: z.string().min(1),
  quote: z.string(),
  book: z.string().min(1),
  chapter: z.string().nullable(),
});

const usageSchema = z.object({
  limit: z.number().int().nonnegative(),
  used: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  resetsAt: z.string().min(1),
  unlimited: z.boolean(),
});

export const chatStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("start"),
    conversationId: z.uuid(),
    userMessageId: z.uuid(),
  }),
  z.object({
    type: z.literal("token"),
    value: z.string(),
  }),
  z.object({
    type: z.literal("citations"),
    value: z.array(citationSchema),
  }),
  z.object({
    type: z.literal("usage"),
    value: usageSchema,
  }),
  z.object({
    type: z.literal("done"),
    assistantMessageId: z.uuid(),
    content: z.string().optional(),
  }),
  z.object({
    type: z.literal("error"),
    code: z.string().min(1),
    message: z.string().min(1),
  }),
]);

export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;

const encoder = new TextEncoder();

export function encodeEvent(event: ChatStreamEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

export function parseEvent(line: string): ChatStreamEvent {
  return chatStreamEventSchema.parse(JSON.parse(line));
}
