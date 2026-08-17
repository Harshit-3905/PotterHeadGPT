import { defineConfig } from "drizzle-kit";
import { loadDatabaseUrl } from "./src/db/env";

const databaseUrl = loadDatabaseUrl();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
