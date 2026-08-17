// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseIngestArgs } from "../../scripts/lib/ingest-args";
import { resolveIngestEnv } from "../../scripts/lib/ingest-env";

describe("resolveIngestEnv", () => {
  const valid = {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/potterhead",
    QDRANT_URL: "https://example.qdrant.io:6333",
    OPENAI_API_KEY: "sk-test",
  };

  it("defaults the collection name", () => {
    expect(resolveIngestEnv(valid).QDRANT_COLLECTION).toBe("book_chunks");
  });

  it("throws when OpenAI is missing", () => {
    expect(() =>
      resolveIngestEnv({
        DATABASE_URL: valid.DATABASE_URL,
        QDRANT_URL: valid.QDRANT_URL,
      }),
    ).toThrow(/OPENAI_API_KEY/);
  });
});

describe("parseIngestArgs", () => {
  it("defaults to the prepared books directory", () => {
    expect(parseIngestArgs([])).toEqual({ path: "books/prepared" });
  });

  it("reads --path", () => {
    expect(parseIngestArgs(["--path", "tests/fixtures/prepared"])).toEqual({
      path: "tests/fixtures/prepared",
    });
  });

  it("rejects --s3 until that path is implemented", () => {
    expect(() => parseIngestArgs(["--s3", "s3://bucket/prefix"])).toThrow(
      /--s3/,
    );
  });
});
