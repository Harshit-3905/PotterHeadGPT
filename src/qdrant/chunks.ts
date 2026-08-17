import { DOCUMENT_ID_PAYLOAD_KEY } from "./collections";

export const UPSERT_BATCH_SIZE = 64;

export type ChunkPayload = {
  content: string;
  documentId: string;
  chunkIndex: number;
  book: string;
  chapter: string | null;
  page: number | null;
};

export type ChunkPoint = {
  id: string;
  vector: number[];
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
        must: Array<{ key: string; match: { value: string } }>;
      };
    },
  ) => Promise<unknown>;
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
