import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  ADMIN_EMAILS: z.string().default(""),
  DAILY_MESSAGE_LIMIT: z.coerce.number().int().positive().default(5),
  RAG_TOP_K: z.coerce.number().int().min(1).max(12).default(6),
  RAG_SCORE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.72),
});

export const env = schema.parse(process.env);
