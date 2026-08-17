import { createQdrantClient } from "../qdrant/client";
import { searchChunks } from "../qdrant/chunks";
import { generateGroundedAnswer, readModelStream } from "./generate";
import {
  createChatModel,
  createEmbeddings,
  createTopicClassifier,
} from "./models";
import { retrievePassages } from "./retrieve";
import { classifyTopic } from "./topic-guard";
import type { ChatTurn, GroundedAnswer } from "./types";

export type GroundedAnswerGeneratorConfig = {
  openaiApiKey: string;
  qdrantUrl: string;
  qdrantApiKey?: string;
  collection: string;
  topK: number;
  scoreThreshold: number;
};

export function createGroundedAnswerGenerator(
  config: GroundedAnswerGeneratorConfig,
): (input: {
  question: string;
  history: ChatTurn[];
}) => Promise<GroundedAnswer> {
  const embeddings = createEmbeddings(config.openaiApiKey);
  const chat = createChatModel(config.openaiApiKey);
  const classifier = createTopicClassifier(config.openaiApiKey);
  const qdrant = createQdrantClient({
    url: config.qdrantUrl,
    apiKey: config.qdrantApiKey,
  });

  return (input) =>
    generateGroundedAnswer(input, {
      classifyTopic: (question) => classifyTopic(question, classifier),
      retrievePassages: (question) =>
        retrievePassages(question, {
          embedQuery: (text) => embeddings.embedQuery(text),
          searchChunks: (vector, limit) =>
            searchChunks(qdrant, config.collection, vector, limit),
          topK: config.topK,
        }),
      complete: async (messages) => readModelStream(await chat.stream(messages)),
      scoreThreshold: config.scoreThreshold,
    });
}
