export type ContentToken =
  | { type: "text"; value: string }
  | { type: "citation"; ordinal: number };

const CITATION_MARKER = /\[(\d+)\]/g;

export function tokenizeMessageContent(content: string): ContentToken[] {
  const tokens: ContentToken[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(CITATION_MARKER)) {
    const ordinal = Number(match[1]);
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ type: "text", value: content.slice(lastIndex, index) });
    }
    tokens.push({ type: "citation", ordinal });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < content.length) {
    tokens.push({ type: "text", value: content.slice(lastIndex) });
  }

  return tokens;
}
