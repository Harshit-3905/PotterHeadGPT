import { QdrantClient } from "@qdrant/js-client-rest";

export type QdrantClientConfig = {
  url: string;
  apiKey?: string;
};

export function createQdrantClient(config: QdrantClientConfig): QdrantClient {
  return new QdrantClient({
    url: config.url,
    apiKey: config.apiKey,
    checkCompatibility: false,
  });
}