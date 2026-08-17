// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  handleGetConversation,
  handleListConversations,
} from "@/chat/conversations";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const CONVERSATION_ID = "33333333-3333-4333-8333-333333333333";

const session = { user: { id: USER_ID, role: "user" as const } };

const summary = {
  id: CONVERSATION_ID,
  title: "Why the scar?",
  createdAt: new Date("2026-08-17T12:00:00.000Z"),
  updatedAt: new Date("2026-08-17T12:05:00.000Z"),
};

const thread = {
  ...summary,
  messages: [
    {
      id: "user-msg-1",
      role: "user" as const,
      content: "Why the scar?",
      createdAt: new Date("2026-08-17T12:00:00.000Z"),
      citations: [],
    },
    {
      id: "asst-msg-1",
      role: "assistant" as const,
      content: "The scar is from the killing curse. [1]",
      createdAt: new Date("2026-08-17T12:00:01.000Z"),
      citations: [
        {
          ordinal: 1,
          chunkId: "44444444-4444-4444-8444-444444444444",
          quote: "The lightning-shaped scar.",
          book: "The Lantern Academy",
          chapter: "The Moonstone Key",
        },
      ],
    },
  ],
};

describe("handleListConversations", () => {
  it("returns 401 without a session", async () => {
    await expect(
      handleListConversations(null, { listConversations: vi.fn() }),
    ).resolves.toMatchObject({ status: 401 });
  });

  it("lists only the caller's threads", async () => {
    const listConversations = vi.fn(async () => [summary]);

    await expect(
      handleListConversations(session, { listConversations }),
    ).resolves.toEqual({
      status: 200,
      body: { conversations: [summary] },
    });
    expect(listConversations).toHaveBeenCalledWith(USER_ID);
  });
});

describe("handleGetConversation", () => {
  it("returns 404 for another user's thread instead of 403", async () => {
    const getConversation = vi.fn(async () => null);

    await expect(
      handleGetConversation(session, CONVERSATION_ID, { getConversation }),
    ).resolves.toEqual({
      status: 404,
      body: { error: "Conversation not found" },
    });
    expect(getConversation).toHaveBeenCalledWith(USER_ID, CONVERSATION_ID);
  });

  it("returns the thread with messages and citation snapshots", async () => {
    const getConversation = vi.fn(async () => thread);

    await expect(
      handleGetConversation(session, CONVERSATION_ID, { getConversation }),
    ).resolves.toEqual({
      status: 200,
      body: thread,
    });
  });
});
