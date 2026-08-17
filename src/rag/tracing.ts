import type { GroundedAnswer, RetrievedPassage } from "./types";

export function retrievalTraceOutputs(passages: RetrievedPassage[]) {
  const scores = passages.map((passage) => passage.score);
  return {
    count: passages.length,
    bestScore: scores.length > 0 ? Math.max(...scores) : 0,
    scores,
    passages: passages.map((passage) => ({
      chunkId: passage.chunkId,
      score: passage.score,
      book: passage.metadata.book,
      chapter: passage.metadata.chapter,
      content: passage.content,
    })),
  };
}

export function groundedAnswerTraceOutputs(answer: GroundedAnswer) {
  return {
    refused: answer.refused,
    citationCount: answer.citations.length,
    citations: answer.citations,
    answer: answer.answer,
  };
}

export function questionOnlyInputs(inputs: Readonly<Record<string, unknown>>) {
  if (Array.isArray(inputs.args)) {
    const first = inputs.args[0];
    if (typeof first === "string") {
      return { question: first };
    }
    if (first && typeof first === "object" && "question" in first) {
      const payload = first as { question: string; history?: unknown[] };
      return {
        question: payload.question,
        historyLength: payload.history?.length ?? 0,
      };
    }
  }
  if (typeof inputs.input === "string") {
    return { question: inputs.input };
  }
  if (typeof inputs.question === "string") {
    return {
      question: inputs.question,
      historyLength: Array.isArray(inputs.history) ? inputs.history.length : 0,
    };
  }
  return { question: null };
}
