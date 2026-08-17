import { DOCUMENT_ID_PAYLOAD_KEY, QDRANT_VECTOR_SIZE } from "./collections";

export const UPSERT_BATCH_SIZE = 64;

export type ChunkPayload = {
  content: string;
  documentId: string;
  chunkIndex: number;
  book: string;
  chapter: string | null;
};

export type ChunkPoint = {
  id: string;
  vector: number[];
  payload: ChunkPayload;
};

export type ScoredChunkHit = {
  id: string;
  score: number;
  payload: ChunkPayload;
};

export type QdrantPointsClient = {
  upsert: (
    collection: string,
    args: {
      wait: true;
      points: Array<{
        id: string;
        vector: number[];
        payload: ChunkPayload;
      }>;
    },
  ) => Promise<unknown>;
  delete: (
    collection: string,
    args: {
      wait: true;
    filter: {
      must?: Array<{ key: string; match: { value: string } }>;
    };
    },
  ) => Promise<unknown>;
};

export type QdrantQueryClient = {
  query: (
    collection: string,
    args: {
      query: number[];
      limit: number;
      with_payload: true;
    },
  ) => Promise<{
    points: Array<{
      id: string | number;
      score: number;
      payload?: Record<string, unknown> | null;
    }>;
  }>;
};

export async function upsertChunks(
  client: Pick<QdrantPointsClient, "upsert">,
  collection: string,
  points: ChunkPoint[],
): Promise<void> {
  for (let index = 0; index < points.length; index += UPSERT_BATCH_SIZE) {
    const batch = points.slice(index, index + UPSERT_BATCH_SIZE);
    await client.upsert(collection, {
      wait: true,
      points: batch.map((point) => ({
        id: point.id,
        vector: point.vector,
        payload: point.payload,
      })),
    });
  }
}

export async function deleteChunksByDocumentId(
  client: Pick<QdrantPointsClient, "delete">,
  collection: string,
  documentId: string,
): Promise<void> {
  await client.delete(collection, {
    wait: true,
    filter: {
      must: [{ key: DOCUMENT_ID_PAYLOAD_KEY, match: { value: documentId } }],
    },
  });
}

export async function deleteAllChunks(
  client: Pick<QdrantPointsClient, "delete">,
  collection: string,
): Promise<void> {
  await client.delete(collection, {
    wait: true,
    filter: {},
  });
}

export function assertQueryVector(vector: number[]): void {
  if (
    vector.length !== QDRANT_VECTOR_SIZE ||
    vector.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("Query vector must contain 1536 finite numbers");
  }
}

function asChunkPayload(
  payload: Record<string, unknown> | null | undefined,
): ChunkPayload | null {
  if (!payload) {
    return null;
  }
  if (typeof payload.content !== "string" || typeof payload.book !== "string") {
    return null;
  }
  return {
    content: payload.content,
    documentId: typeof payload.documentId === "string" ? payload.documentId : "",
    chunkIndex:
      typeof payload.chunkIndex === "number" ? payload.chunkIndex : 0,
    book: payload.book,
    chapter: typeof payload.chapter === "string" ? payload.chapter : null,
  };
}

export async function searchChunks(
  client: QdrantQueryClient,
  collection: string,
  vector: number[],
  limit: number,
): Promise<ScoredChunkHit[]> {
  assertQueryVector(vector);
  const result = await client.query(collection, {
    query: vector,
    limit,
    with_payload: true,
  });

  return result.points.flatMap((point) => {
    const payload = asChunkPayload(point.payload);
    if (!payload) {
      return [];
    }
    return [
      {
        id: String(point.id),
        score: point.score,
        payload,
      },
    ];
  });
}
