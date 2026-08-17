export type SourceMetadata = {
  book: string;
  chapter: string | null;
  page: number | null;
};

export type RetrievedPassage = {
  chunkId: string;
  content: string;
  metadata: SourceMetadata;
  score: number;
};

export type CitationPayload = {
  ordinal: number;
  chunkId: string;
  quote: string;
  book: string;
  chapter: string | null;
  page: number | null;
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type RefusalReason = "off_topic" | "low_score" | "uncited";

export type GroundedAnswer = {
  answer: string;
  citations: CitationPayload[];
  refused: false | RefusalReason;
};

export type TopicClassifier = {
  classify: (question: string) => Promise<{ allow: boolean }>;
};
