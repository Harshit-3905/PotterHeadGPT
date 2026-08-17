export const QDRANT_VECTOR_SIZE = 1536;
export const QDRANT_DISTANCE = "Cosine" as const;
export const DOCUMENT_ID_PAYLOAD_KEY = "documentId";

export type CollectionInfoLike = {
  payload_schema?: Record<string, unknown>;
};

export type QdrantCollectionClient = {
  getCollections: () => Promise<{ collections: { name: string }[] }>;
  getCollection: (name: string) => Promise<CollectionInfoLike>;
  createCollection: (
    name: string,
    args: { vectors: { size: number; distance: typeof QDRANT_DISTANCE } },
  ) => Promise<unknown>;
  createPayloadIndex: (
    name: string,
    args: { wait?: boolean; field_name: string; field_schema: "keyword" },
  ) => Promise<unknown>;
};

export async function ensureBookChunksCollection(
  client: QdrantCollectionClient,
  options: { collection: string },
): Promise<void> {
  const { collections } = await client.getCollections();
  const exists = collections.some((entry) => entry.name === options.collection);

  if (!exists) {
    await client.createCollection(options.collection, {
      vectors: { size: QDRANT_VECTOR_SIZE, distance: QDRANT_DISTANCE },
    });
    await client.createPayloadIndex(options.collection, {
      wait: true,
      field_name: DOCUMENT_ID_PAYLOAD_KEY,
      field_schema: "keyword",
    });
    return;
  }

  const info = await client.getCollection(options.collection);
  if (info.payload_schema?.[DOCUMENT_ID_PAYLOAD_KEY]) {
    return;
  }

  await client.createPayloadIndex(options.collection, {
    wait: true,
    field_name: DOCUMENT_ID_PAYLOAD_KEY,
    field_schema: "keyword",
  });
}
