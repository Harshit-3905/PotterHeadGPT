// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getDatabaseConnection } from "@/db/client";

const databaseUrl = "postgresql://postgres:postgres@localhost:5432/potterhead";

describe("getDatabaseConnection", () => {
  it("reuses a single connection pool across repeated calls", () => {
    const first = getDatabaseConnection(databaseUrl);
    const second = getDatabaseConnection(databaseUrl);

    expect(second).toBe(first);
  });

  it("disables prepared statements for pooled Postgres endpoints", () => {
    const { client } = getDatabaseConnection(databaseUrl);

    expect(client.options.prepare).toBe(false);
  });

  it("caps the pool size for serverless invocations", () => {
    const { client } = getDatabaseConnection(databaseUrl);

    expect(client.options.max).toBe(1);
  });
});
