import { existsSync, readFileSync } from "node:fs";
import { parse } from "dotenv";

const ENV_LOCAL_FILE = ".env.local";
const ENV_FILE = ".env";

export type EnvSources = {
  envLocal: Readonly<Record<string, string | undefined>>;
  processEnv: Readonly<Record<string, string | undefined>>;
  envFile: Readonly<Record<string, string | undefined>>;
};

function firstFilledValue(
  candidates: readonly (string | undefined)[],
): string | undefined {
  return candidates.find((candidate) => (candidate ?? "").trim() !== "");
}

/**
 * Resolves env values with `.env.local` > process environment > `.env`.
 * drizzle-kit preloads `.env` into the process environment before it evaluates
 * drizzle.config.ts, so `.env.local` must win over values that are already set.
 */
export function mergeEnvSources(sources: EnvSources): Record<string, string> {
  const { envLocal, processEnv, envFile } = sources;
  const declaredKeys = new Set([
    ...Object.keys(envFile),
    ...Object.keys(envLocal),
  ]);
  const merged: Record<string, string> = {};

  for (const key of declaredKeys) {
    const value = firstFilledValue([
      envLocal[key],
      processEnv[key],
      envFile[key],
    ]);

    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
}

function readEnvFile(filePath: string): Record<string, string> {
  return existsSync(filePath) ? parse(readFileSync(filePath)) : {};
}

export function loadEnvFiles(): void {
  const merged = mergeEnvSources({
    envLocal: readEnvFile(ENV_LOCAL_FILE),
    processEnv: process.env,
    envFile: readEnvFile(ENV_FILE),
  });

  for (const [key, value] of Object.entries(merged)) {
    process.env[key] = value;
  }
}

export function resolveDatabaseUrl(
  environment: Readonly<Record<string, string | undefined>>,
): string {
  const databaseUrl = environment.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Define it in .env, .env.local, or the shell environment.",
    );
  }

  return databaseUrl;
}

export function loadDatabaseUrl(): string {
  loadEnvFiles();

  return resolveDatabaseUrl(process.env);
}
