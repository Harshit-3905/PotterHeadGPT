import { isTestRagProvider } from "@/rag/provider";

export const E2E_ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

export function isE2eAuthEnabled(): boolean {
  return isTestRagProvider();
}
