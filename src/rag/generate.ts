import type { BaseMessage } from "@langchain/core/messages";
import { getCurrentRunTree, traceable } from "langsmith/traceable";
import {
  buildCitationPayload,
  extractCitationOrdinals,
  stripInvalidCitationMarkers,
} from "./citations";
import { BOOKS_REFUSAL, OFF_TOPIC_REFUSAL } from "./copy";
import { buildGroundedPrompt } from "./prompt";
import {
  groundedAnswerTraceOutputs,
  questionOnlyInputs,
  retrievalTraceOutputs,
} from "./tracing";
import type {
  ChatTurn,
  GroundedAnswer,
  RetrievedPassage,
} from "./types";

export type GenerateDeps = {
  classifyTopic: (question: string) => Promise<"harry_potter" | "other">;
  retrievePassages: (question: string) => Promise<RetrievedPassage[]>;
  complete: (messages: BaseMessage[]) => Promise<string>;
  scoreThreshold: number;
};

function bestScore(passages: RetrievedPassage[]): number {
  return passages.reduce(
    (highest, passage) => Math.max(highest, passage.score),
    0,
  );
}

function booksRefusal(reason: "low_score" | "uncited"): GroundedAnswer {
  return {
    answer: BOOKS_REFUSAL,
    citations: [],
    refused: reason,
  };
}

function noteRetrieval(
  passages: RetrievedPassage[],
  threshold: number,
): void {
  const run = getCurrentRunTree(true);
  if (typeof run?.addEvent !== "function") {
    return;
  }
  const snapshot = retrievalTraceOutputs(passages);
  run.addEvent({
    name: "retrieval",
    kwargs: {
      ...snapshot,
      threshold,
      passed: snapshot.count > 0 && snapshot.bestScore >= threshold,
    },
  });
}

async function generateGroundedAnswerUntraced(
  input: { question: string; history?: ChatTurn[] },
  deps: GenerateDeps,
): Promise<GroundedAnswer> {
  const topic = await deps.classifyTopic(input.question);
  if (topic === "other") {
    return {
      answer: OFF_TOPIC_REFUSAL,
      citations: [],
      refused: "off_topic",
    };
  }

  const passages = await deps.retrievePassages(input.question);
  noteRetrieval(passages, deps.scoreThreshold);
  if (passages.length === 0 || bestScore(passages) < deps.scoreThreshold) {
    return booksRefusal("low_score");
  }

  const messages = buildGroundedPrompt(
    input.question,
    passages,
    input.history ?? [],
  );
  const raw = await deps.complete(messages);
  const answer = stripInvalidCitationMarkers(raw, passages.length).trim();

  if (answer === BOOKS_REFUSAL) {
    return booksRefusal("low_score");
  }

  const ordinals = extractCitationOrdinals(answer, passages.length);
  if (ordinals.length === 0) {
    return booksRefusal("uncited");
  }

  return {
    answer,
    citations: buildCitationPayload(ordinals, passages),
    refused: false,
  };
}

export const generateGroundedAnswer = traceable(generateGroundedAnswerUntraced, {
  name: "generate_grounded_answer",
  run_type: "chain",
  processInputs: questionOnlyInputs,
  processOutputs: (outputs) => groundedAnswerTraceOutputs(outputs),
});
