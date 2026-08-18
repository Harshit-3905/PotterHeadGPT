import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { E2E_ADMIN_ID } from "@/auth/e2e";
import { loadDatabaseUrl, loadEnvFiles } from "@/db/env";
import * as schema from "@/db/schema";

export const E2E_DOCUMENT_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

export async function seedE2eDatabase(): Promise<void> {
  loadEnvFiles();
  const client = postgres(loadDatabaseUrl(), { prepare: false, max: 1 });
  const db = drizzle(client, { schema });

  try {
    await db.execute(sql`select 1`);

    await db
      .insert(schema.users)
      .values({
        id: E2E_ADMIN_ID,
        name: "E2E Admin",
        email: "e2e-admin@example.test",
        isGuest: false,
        role: "admin",
      })
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          name: "E2E Admin",
          email: "e2e-admin@example.test",
          isGuest: false,
          role: "admin",
        },
      });

    await db
      .insert(schema.documents)
      .values({
        id: E2E_DOCUMENT_ID,
        title: "E2E Fixture Corpus",
        sourcePath: "tests/fixtures/e2e",
        format: "txt",
        checksum: "e".repeat(64),
      })
      .onConflictDoUpdate({
        target: schema.documents.sourcePath,
        set: {
          title: "E2E Fixture Corpus",
          checksum: "e".repeat(64),
          ingestedAt: new Date(),
        },
      });

    await db
      .delete(schema.dailyUsage)
      .where(eq(schema.dailyUsage.userId, E2E_ADMIN_ID));
  } finally {
    await client.end();
  }
}
