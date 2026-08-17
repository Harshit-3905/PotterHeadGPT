// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { handleChatRequest, type ChatDeps } from "@/chat/handle-chat";
import { BOOKS_REFUSAL } from "@/rag/copy";
import type { ChatTurn, GroundedAnswer } from "@/rag/types";
import type { UsageStatus } from "@/usage/types";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_CONVERSATION_ID = "22222222-2222-4222-8222-222222222222";
const CONVERSATION_ID = "33333333-3333-4333-8333-333333333333";
const CHUNK_ID = "44444444-4444-4444-8444-444444444444";

const session = {
  user: { id: USER_ID, role: "user" as const },
};

const usage: UsageStatus = {
  limit: 5,
  used: 1,
  remaining: 4,
  resetsAt: "2026-08-18T00:00:00.000Z",
  unlimited: false,
};

const citedAnswer: GroundedAnswer = {
  answer: "The scar is from the killing curse. [1]",
  citations: [
    {
      ordinal: 1,
      chunkId: CHUNK_ID,
      quote: "The lightning-shaped scar.",
      book: "The Lantern Academy",
      chapter: "The Moonstone Key",
    },
  ],
  refused: false,
};

function createDeps(overrides: Partial<ChatDeps> = {}) {
  const generate = vi.fn(async () => citedAnswer);
  const persistExchange = vi.fn(async () => ({
    userMessageId: "user-msg-1",
    assistantMessageId: "asst-msg-1",
  }));
  const createConversation = vi.fn(async () => ({ id: CONVERSATION_ID }));
  const findConversation = vi.fn(async () => ({ id: CONVERSATION_ID }));
  const listRecentTurns = vi.fn(async () => [] as ChatTurn[]);
  const reserveMessage = vi.fn(async () => ({
    allowed: true as const,
    status: usage,
  }));
  const releaseMessage = vi.fn(async () => undefined);

  return {
    generate,
    persistExchange,
    createConversation,
    findConversation,
    listRecentTurns,
    reserveMessage,
    releaseMessage,
    deps: {
      findConversation,
      createConversation,
      listRecentTurns,
      persistExchange,
      reserveMessage,
      releaseMessage,
      generate,
      ...overrides,
    },
  };
}

describe("handleChatRequest", () => {
  it("returns 401 when there is no session", async () => {
    const { deps, generate } = createDeps();

    await expect(
      handleChatRequest(null, { message: "Why the scar?" }, deps),
    ).resolves.toMatchObject({
      status: 401,
    });
    expect(generate).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty message", async () => {
    const { deps, generate } = createDeps();

    await expect(
      handleChatRequest(session, { message: "   " }, deps),
    ).resolves.toMatchObject({
      status: 400,
    });
    expect(generate).not.toHaveBeenCalled();
  });

  it("ignores a client-supplied userId", async () => {
    const { deps, createConversation, persistExchange } = createDeps();

    await handleChatRequest(
      session,
      { message: "Why the scar?", userId: "attacker" },
      deps,
    );

    expect(createConversation).toHaveBeenCalledWith(USER_ID, "Why the scar?");
    expect(persistExchange).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID }),
    );
  });

  it("returns 404 for another user's conversation", async () => {
    const findConversation = vi.fn(async () => null);
    const { deps, generate, persistExchange } = createDeps({
      findConversation,
    });

    await expect(
      handleChatRequest(
        session,
        { conversationId: OTHER_CONVERSATION_ID, message: "Why the scar?" },
        deps,
      ),
    ).resolves.toMatchObject({
      status: 404,
    });
    expect(findConversation).toHaveBeenCalledWith(
      USER_ID,
      OTHER_CONVERSATION_ID,
    );
    expect(generate).not.toHaveBeenCalled();
    expect(persistExchange).not.toHaveBeenCalled();
  });

  it("creates a thread from the first question and returns its id", async () => {
    const { deps, createConversation, listRecentTurns } = createDeps();

    const result = await handleChatRequest(
      session,
      { message: "Why the scar?" },
      deps,
    );

    expect(createConversation).toHaveBeenCalledWith(USER_ID, "Why the scar?");
    expect(listRecentTurns).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 200,
      body: {
        conversationId: CONVERSATION_ID,
        userMessageId: "user-msg-1",
        assistantMessageId: "asst-msg-1",
        answer: citedAnswer.answer,
        citations: citedAnswer.citations,
        refused: false,
        usage,
      },
    });
  });

  it("appends a follow-up onto an owned thread with recent history", async () => {
    const history: ChatTurn[] = [
      { role: "user", content: "Why the scar?" },
      { role: "assistant", content: "Because of the curse. [1]" },
    ];
    const { deps, createConversation, generate, persistExchange } = createDeps({
      listRecentTurns: vi.fn(async () => history),
    });

    const result = await handleChatRequest(
      session,
      { conversationId: CONVERSATION_ID, message: "Who gave it to him?" },
      deps,
    );

    expect(createConversation).not.toHaveBeenCalled();
    expect(generate).toHaveBeenCalledWith({
      question: "Who gave it to him?",
      history,
    });
    expect(persistExchange).toHaveBeenCalledWith({
      userId: USER_ID,
      conversationId: CONVERSATION_ID,
      question: "Who gave it to him?",
      answer: citedAnswer,
    });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ conversationId: CONVERSATION_ID });
  });

  it("returns 429 and skips generation when the daily limit is spent", async () => {
    const denied: UsageStatus = {
      ...usage,
      used: 5,
      remaining: 0,
    };
    const { deps, generate, persistExchange } = createDeps({
      reserveMessage: vi.fn(async () => ({
        allowed: false as const,
        status: denied,
      })),
    });

    await expect(
      handleChatRequest(session, { message: "Why the scar?" }, deps),
    ).resolves.toEqual({
      status: 429,
      body: {
        error: "Daily message limit reached",
        usage: denied,
      },
    });
    expect(generate).not.toHaveBeenCalled();
    expect(persistExchange).not.toHaveBeenCalled();
  });

  it("lets an admin through without treating them as capped", async () => {
    const unlimited: UsageStatus = {
      limit: 5,
      used: 0,
      remaining: 5,
      resetsAt: usage.resetsAt,
      unlimited: true,
    };
    const { deps, generate } = createDeps({
      reserveMessage: vi.fn(async () => ({
        allowed: true as const,
        status: unlimited,
      })),
    });

    const result = await handleChatRequest(
      { user: { id: USER_ID, role: "admin" } },
      { message: "Why the scar?" },
      deps,
    );

    expect(generate).toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 200,
      body: { usage: unlimited },
    });
  });

  it("persists a refusal with no citation rows", async () => {
    const refused: GroundedAnswer = {
      answer: BOOKS_REFUSAL,
      citations: [],
      refused: "low_score",
    };
    const { deps, persistExchange } = createDeps({
      generate: vi.fn(async () => refused),
    });

    const result = await handleChatRequest(
      session,
      { message: "Where is the key?" },
      deps,
    );

    expect(persistExchange).toHaveBeenCalledWith(
      expect.objectContaining({
        answer: refused,
      }),
    );
    expect(result).toMatchObject({
      status: 200,
      body: {
        answer: BOOKS_REFUSAL,
        citations: [],
        refused: "low_score",
      },
    });
  });

  it("releases usage and stores nothing when generation fails", async () => {
    const { deps, persistExchange, releaseMessage } = createDeps({
      generate: vi.fn(async () => {
        throw new Error("openai down");
      }),
    });

    await expect(
      handleChatRequest(session, { message: "Why the scar?" }, deps),
    ).resolves.toMatchObject({
      status: 502,
    });
    expect(releaseMessage).toHaveBeenCalledWith(USER_ID, "user");
    expect(persistExchange).not.toHaveBeenCalled();
  });

  it("releases usage when persistence fails after generation", async () => {
    const { deps, releaseMessage } = createDeps({
      persistExchange: vi.fn(async () => {
        throw new Error("db down");
      }),
    });

    await expect(
      handleChatRequest(session, { message: "Why the scar?" }, deps),
    ).resolves.toMatchObject({
      status: 500,
    });
    expect(releaseMessage).toHaveBeenCalledWith(USER_ID, "user");
  });
});
