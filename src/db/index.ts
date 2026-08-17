import { env } from "@/env";
import { getDatabaseConnection } from "./client";

export const db = getDatabaseConnection(env.DATABASE_URL).db;
