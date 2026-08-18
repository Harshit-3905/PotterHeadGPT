import { seedE2eDatabase } from "./lib/seed";

export default async function globalSetup(): Promise<void> {
  await seedE2eDatabase();
}
