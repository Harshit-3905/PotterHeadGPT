import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;
export type DatabaseClient = ReturnType<typeof postgres>;

export type DatabaseConnection = {
  client: DatabaseClient;
  db: Database;
};

type DatabaseGlobal = typeof globalThis & {
  potterheadDatabaseConnection?: DatabaseConnection;
};

function createConnection(databaseUrl: string): DatabaseConnection {
  const client = postgres(databaseUrl, {
    // Neon's pooled endpoint runs PgBouncer in transaction mode, which cannot
    // keep server-side prepared statements alive between queries.
    prepare: false,
    // Each serverless instance gets its own pool, so keep the footprint small.
    max: 1,
    idle_timeout: 20,
  });

  return { client, db: drizzle(client, { schema }) };
}

export function getDatabaseConnection(databaseUrl: string): DatabaseConnection {
  const databaseGlobal = globalThis as DatabaseGlobal;

  // Cached on globalThis so dev-server hot reloads reuse one pool.
  databaseGlobal.potterheadDatabaseConnection ??= createConnection(databaseUrl);

  return databaseGlobal.potterheadDatabaseConnection;
}
