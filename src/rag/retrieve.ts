import { traceable } from "langsmith/traceable";
import type { ScoredChunkHit } from "../qdrant/chunks";
import { questionOnlyInputs, retrievalTraceOutputs } from "./tracing";
import type { RetrievedPassage } from "./types";

export type RetrieveDeps = {
  embedQuery: (text: string) => Promise<number[]>;
  searchChunks: (
    vector: number[],
    limit: number,
  ) => Promise<ScoredChunkHit[]>;
  topK: number;
};

export function toRetrievedPassage(hit: ScoredChunkHit): RetrievedPassage {
  return {
    chunkId: hit.id,
    content: hit.payload.content,
    metadata: {
      book: hit.payload.book,
      chapter: hit.payload.chapter,
    },
    score: hit.score,
  };
}

async function retrievePassagesUntraced(
  question: string,
  deps: RetrieveDeps,
): Promise<RetrievedPassage[]> {
  const vector = await deps.embedQuery(question);
  const hits = await deps.searchChunks(vector, deps.topK);
  return hits.map(toRetrievedPassage);
}

export const retrievePassages = traceable(retrievePassagesUntraced, {
  name: "retrieve_passages",
  run_type: "retriever",
  processInputs: questionOnlyInputs,
  processOutputs: (outputs) => {
    const passages = "outputs" in outputs ? outputs.outputs : [];
    return retrievalTraceOutputs(Array.isArray(passages) ? passages : []);
  },
});
