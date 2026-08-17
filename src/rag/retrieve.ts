import type { ScoredChunkHit } from "../qdrant/chunks";
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
      page: hit.payload.page,
    },
    score: hit.score,
  };
}

export async function retrievePassages(
  question: string,
  deps: RetrieveDeps,
): Promise<RetrievedPassage[]> {
  const vector = await deps.embedQuery(question);
  const hits = await deps.searchChunks(vector, deps.topK);
  return hits.map(toRetrievedPassage);
}
