import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { loadDatabaseUrl } from "./env";

async function main() {
  const client = postgres(loadDatabaseUrl(), { prepare: false, max: 1 });
  const database = drizzle(client);

  try {
    await migrate(database, { migrationsFolder: "drizzle" });
    console.log("Database migrations completed");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    `Database migration failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
