import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {
  CHUNK_OVERLAP,
  CHUNK_SEPARATORS,
  CHUNK_SIZE,
  type ChapterChunk,
  type PreparedChapter,
} from "./ingest-types";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
  separators: [...CHUNK_SEPARATORS],
});

export function buildEmbedInput(content: string): string {
  return content;
}

export async function splitChapterChunks(
  chapters: PreparedChapter[],
  book: string,
): Promise<ChapterChunk[]> {
  const chunks: ChapterChunk[] = [];

  for (const chapter of chapters) {
    const pieces = await splitter.splitText(chapter.content.trim());
    for (const content of pieces) {
      const trimmed = content.trim();
      if (!trimmed) {
        continue;
      }
      chunks.push({
        content: trimmed,
        embedInput: buildEmbedInput(trimmed),
        book,
        chapter: chapter.title,
        chunkIndex: chunks.length,
      });
    }
  }

  return chunks;
}
