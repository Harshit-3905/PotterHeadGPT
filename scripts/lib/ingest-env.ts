import { z } from "zod";
import { loadEnvFiles } from "../../src/db/env";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === undefined ? undefined : value;

const ingestEnvSchema = z.object({
  DATABASE_URL: z.url(),
  QDRANT_URL: z.url(),
  QDRANT_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  QDRANT_COLLECTION: z.preprocess(
    emptyToUndefined,
    z.string().min(1).default("book_chunks"),
  ),
  OPENAI_API_KEY: z.string().min(1),
});

export type IngestEnv = z.infer<typeof ingestEnvSchema>;

export function resolveIngestEnv(
  environment: Readonly<Record<string, string | undefined>>,
): IngestEnv {
  return ingestEnvSchema.parse(environment);
}

export function loadIngestEnv(): IngestEnv {
  loadEnvFiles();
  return resolveIngestEnv(process.env);
}