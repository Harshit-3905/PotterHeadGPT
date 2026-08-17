const TITLE_MAX_VISIBLE_CHARS = 80;

export function conversationTitle(firstQuestion: string): string {
  const collapsed = firstQuestion.trim().replace(/\s+/g, " ");
  const chars = Array.from(collapsed);
  return chars.length <= TITLE_MAX_VISIBLE_CHARS
    ? collapsed
    : chars.slice(0, TITLE_MAX_VISIBLE_CHARS).join("");
}
