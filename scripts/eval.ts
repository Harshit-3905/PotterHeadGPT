import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { retrievePassages } from "../src/rag/retrieve";
import { generateGroundedAnswer } from "../src/rag/generate";
import { createChatModel, createEmbeddings } from "../src/rag/models";
import { createQdrantClient } from "../src/qdrant/client";
import { searchChunks } from "../src/qdrant/chunks";
import { loadIngestEnv } from "./lib/ingest-env";
import {
  evaluateCaseResult,
  formatSummaryTable,
  summarize,
} from "./lib/eval-metrics";
import { evalCaseSchema, type EvalCase } from "./lib/eval-types";

export type EvalCliArgs = {
  dataset: string;
  threshold: number;
  concurrency: number;
};

export function parseEvalArgs(argv: string[]): EvalCliArgs {
  const args: EvalCliArgs = {
    dataset: "evals/golden.fixture.json",
    threshold: 80,
    concurrency: 2,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (flag === "--dataset" && value) {
      args.dataset = value;
      index += 1;
    } else if (flag === "--threshold" && value) {
      args.threshold = Number(value);
      index += 1;
    } else if (flag === "--concurrency" && value) {
      args.concurrency = Number(value);
      index += 1;
    }
  }

  return args;
}

async function loadDataset(path: string): Promise<EvalCase[]> {
  const raw = await readFile(path, "utf8");
  const parsed = z.array(evalCaseSchema).parse(JSON.parse(raw));
  return parsed;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () =>
      runWorker(),
    ),
  );

  return results;
}

async function main(): Promise<void> {
  const args = parseEvalArgs(process.argv.slice(2));
  const env = loadIngestEnv();
  const cases = await loadDataset(args.dataset);
  const scoreThreshold = Number(process.env.RAG_SCORE_THRESHOLD ?? 0.72);
  const embeddings = createEmbeddings(env.OPENAI_API_KEY);
  const chat = createChatModel(env.OPENAI_API_KEY);
  const qdrant = createQdrantClient({
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY,
  });
  const topK = Number(process.env.RAG_TOP_K ?? 6);

  const generate = (question: string) =>
    generateGroundedAnswer(
      { question },
      {
        // Eval measures retrieval and grounding on the ingested corpus, not the
        // Harry Potter topic guard (fixture books are synthetic).
        classifyTopic: async () => "harry_potter" as const,
        retrievePassages: (q) =>
          retrievePassages(q, {
            embedQuery: (text) => embeddings.embedQuery(text),
            searchChunks: (vector, limit) =>
              searchChunks(qdrant, env.QDRANT_COLLECTION, vector, limit),
            topK,
          }),
        complete: (messages) => chat.stream(messages),
        scoreThreshold,
      },
    );

  const results = await mapWithConcurrency(
    cases,
    args.concurrency,
    async (evalCase) => {
      const started = Date.now();
      const passages = await retrievePassages(evalCase.question, {
        embedQuery: (text) => embeddings.embedQuery(text),
        searchChunks: (vector, limit) =>
          searchChunks(qdrant, env.QDRANT_COLLECTION, vector, limit),
        topK,
      });
      const answer = await generate(evalCase.question);
      return evaluateCaseResult({
        evalCase,
        passages,
        answer,
        latencyMs: Date.now() - started,
      });
    },
  );

  const summary = summarize(results, cases);
  console.log(formatSummaryTable(summary));

  if (summary.failures.length > 0) {
    console.log("\nFailed cases:");
    for (const failure of summary.failures) {
      console.log(`- ${failure.id}: ${failure.reasons.join(", ")}`);
    }
  }

  if (summary.aggregate.rate < args.threshold) {
    console.error(
      `\nAggregate pass rate ${summary.aggregate.rate.toFixed(1)}% is below threshold ${args.threshold}%.`,
    );
    process.exitCode = 1;
  }
}

const isCli =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
