import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

process.env.LANGSMITH_TRACING = "false";
process.env.LANGCHAIN_TRACING_V2 = "false";

/**
 * Vitest runs without global test APIs here, so Testing Library never installs
 * its own automatic unmount hook and rendered DOM leaks into the next test.
 * The import stays lazy because some suites opt into the node environment.
 */
afterEach(async () => {
  if (typeof document === "undefined") {
    return;
  }

  const { cleanup } = await import("@testing-library/react");

  cleanup();
});
