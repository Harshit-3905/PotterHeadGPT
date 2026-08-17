export type PdfPage = {
  page: number;
  text: string;
};

export type OutlineEntry = {
  title: string;
  startPage: number;
};

export type ChapterDocument = {
  index: number;
  title: string;
  startPage: number;
  endPage: number;
  content: string;
};

export type PreparedBook = {
  title: string;
  slug: string;
  sourcePath: string;
  checksum: string;
  chapters: ChapterDocument[];
};

export type ExtractPages = (filePath: string) => Promise<PdfPage[]>;
export type ExtractOutline = (filePath: string) => Promise<OutlineEntry[]>;
export type ChecksumFn = (filePath: string) => Promise<string>;
