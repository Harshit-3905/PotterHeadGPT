import type { TopicClassifier } from "./types";

export async function classifyTopic(
  question: string,
  classifier: TopicClassifier,
): Promise<"harry_potter" | "other"> {
  const result = await classifier.classify(question);
  if (typeof result?.allow !== "boolean") {
    throw new Error("Topic classifier returned invalid output");
  }
  return result.allow ? "harry_potter" : "other";
}

export const TOPIC_GUARD_SYSTEM = `You classify user questions for PotterHeadGPT.
Allow questions about the Harry Potter books: plot, characters, magic, places, and the book world.
Reject other franchises, news, homework unrelated to those books, personal advice, and general trivia.
Return only whether the question is allowed.`;
