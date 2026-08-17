export const INGEST_VERSION = "2";

export const CHUNK_SIZE = 4000;
export const CHUNK_OVERLAP = 700;
export const CHUNK_SEPARATORS = ["\n\n", "\n", ". ", " ", ""] as const;
export const EMBED_BATCH_SIZE = 64;

export type PreparedChapter = {
  index: number;
  title: string;
  file?: string;
  startPage: number;
  endPage: number;
  content: string;
};

export type LoadedPreparedBook = {
  title: string;
  slug: string;
  sourcePath: string;
  checksum: string;
  chapters: PreparedChapter[];
};

export type ChapterChunk = {
  content: string;
  embedInput: string;
  book: string;
  chapter: string;
  chunkIndex: number;
};

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

export type DocumentRecord = {
  id: string;
  checksum: string;
  title: string;
};

export type DocumentStore = {
  findDocument: (sourcePath: string) => Promise<DocumentRecord | null>;
  insertDocument: (input: {
    id: string;
    title: string;
    sourcePath: string;
    format: string;
    checksum: string;
  }) => Promise<{ id: string }>;
  updateDocument: (
    id: string,
    patch: { checksum: string; title: string },
  ) => Promise<void>;
};

export type VectorStore = {
  upsert: (points: ChunkPoint[]) => Promise<void>;
  deleteByDocumentId: (documentId: string) => Promise<void>;
};

export type Embedder = {
  embedDocuments: (texts: string[]) => Promise<number[][]>;
};

export type IngestDeps = {
  store: DocumentStore;
  vectors: VectorStore;
  embedder: Embedder;
};

export type IngestFileResult = {
  status: "inserted" | "replaced" | "skipped";
  chunks: number;
  sourcePath: string;
  title: string;
};

export type IngestSummary = {
  inserted: number;
  replaced: number;
  skipped: number;
  chunks: number;
};
