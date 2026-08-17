import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { z } from "zod";
import { TOPIC_GUARD_SYSTEM } from "./topic-guard";
import type { TopicClassifier } from "./types";

const topicOutputSchema = z.object({
  allow: z.boolean(),
});

export function createEmbeddings(apiKey: string): OpenAIEmbeddings {
  return new OpenAIEmbeddings({
    apiKey,
    model: "text-embedding-3-small",
    dimensions: 1536,
    stripNewLines: false,
  });
}

export function createChatModel(apiKey: string): ChatOpenAI {
  return new ChatOpenAI({
    apiKey,
    model: "gpt-4o-mini",
    temperature: 0,
  });
}

export function createTopicClassifier(apiKey: string): TopicClassifier {
  const model = createChatModel(apiKey).withStructuredOutput(topicOutputSchema);
  return {
    classify: async (question: string) => {
      const result = await model.invoke([
        new SystemMessage(TOPIC_GUARD_SYSTEM),
        new HumanMessage(question),
      ]);
      return topicOutputSchema.parse(result);
    },
  };
}
