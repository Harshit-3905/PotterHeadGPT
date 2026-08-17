import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { BOOKS_REFUSAL } from "./copy";
import type { ChatTurn, RetrievedPassage } from "./types";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatPassage(passage: RetrievedPassage, index: number): string {
  const chapter = passage.metadata.chapter ?? "";
  return `<passage id="${index + 1}" book="${escapeXml(passage.metadata.book)}" chapter="${escapeXml(chapter)}">${escapeXml(passage.content)}</passage>`;
}

export function buildGroundedPrompt(
  question: string,
  passages: RetrievedPassage[],
  history: ChatTurn[],
): BaseMessage[] {
  const passageBlock = passages
    .map((passage, index) => formatPassage(passage, index))
    .join("\n");

  const system = [
    "You answer questions about the provided books using only the numbered passages below.",
    "Every factual claim must include one or more citations in the exact form [n].",
    "Use only citation numbers present in the passages.",
    "Do not use outside knowledge.",
    "If the passages do not establish the answer, respond exactly:",
    BOOKS_REFUSAL,
    "Keep the answer concise unless the user asks for detail.",
    "",
    passageBlock,
  ].join("\n");

  const historyMessages = history.map((turn) =>
    turn.role === "user"
      ? new HumanMessage(turn.content)
      : new AIMessage(turn.content),
  );

  return [
    new SystemMessage(system),
    ...historyMessages,
    new HumanMessage(question),
  ];
}
