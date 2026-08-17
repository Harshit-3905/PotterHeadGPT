// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mergeEnvSources, resolveDatabaseUrl } from "@/db/env";

describe("resolveDatabaseUrl", () => {
  it("returns the configured connection string", () => {
    const url = "postgresql://user:secret@db.example.com:5432/potterhead";

    expect(resolveDatabaseUrl({ DATABASE_URL: url })).toBe(url);
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => resolveDatabaseUrl({})).toThrow(/DATABASE_URL/);
  });

  it("throws when DATABASE_URL is blank", () => {
    expect(() => resolveDatabaseUrl({ DATABASE_URL: "   " })).toThrow(
      /DATABASE_URL/,
    );
  });
});

describe("mergeEnvSources", () => {
  it("prefers .env.local over an already populated process environment", () => {
    const merged = mergeEnvSources({
      envLocal: { DATABASE_URL: "postgresql://local/db" },
      processEnv: { DATABASE_URL: "postgresql://preloaded/db" },
      envFile: { DATABASE_URL: "postgresql://file/db" },
    });

    expect(merged.DATABASE_URL).toBe("postgresql://local/db");
  });

  it("prefers the process environment over .env", () => {
    const merged = mergeEnvSources({
      envLocal: {},
      processEnv: { DATABASE_URL: "postgresql://shell/db" },
      envFile: { DATABASE_URL: "postgresql://file/db" },
    });

    expect(merged.DATABASE_URL).toBe("postgresql://shell/db");
  });

  it("falls back to .env when no other source defines the key", () => {
    const merged = mergeEnvSources({
      envLocal: {},
      processEnv: {},
      envFile: { DATABASE_URL: "postgresql://file/db" },
    });

    expect(merged.DATABASE_URL).toBe("postgresql://file/db");
  });

  it("skips blank values instead of shadowing later sources", () => {
    const merged = mergeEnvSources({
      envLocal: { DATABASE_URL: "  " },
      processEnv: {},
      envFile: { DATABASE_URL: "postgresql://file/db" },
    });

    expect(merged.DATABASE_URL).toBe("postgresql://file/db");
  });

  it("only returns keys declared by env files", () => {
    const merged = mergeEnvSources({
      envLocal: {},
      processEnv: { SHELL_ONLY: "keep-me" },
      envFile: { DATABASE_URL: "postgresql://file/db" },
    });

    expect(Object.keys(merged)).toEqual(["DATABASE_URL"]);
  });
});
