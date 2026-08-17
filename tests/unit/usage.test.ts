// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  nextUtcMidnightIso,
  toUsageStatus,
  utcDateString,
} from "@/usage/daily-limit";

describe("utcDateString", () => {
  it("uses the UTC calendar date, not the local one", () => {
    expect(utcDateString(new Date("2026-08-17T23:30:00.000Z"))).toBe(
      "2026-08-17",
    );
    expect(utcDateString(new Date("2026-08-18T00:00:00.000Z"))).toBe(
      "2026-08-18",
    );
  });
});

describe("nextUtcMidnightIso", () => {
  it("resets at the next UTC midnight", () => {
    expect(nextUtcMidnightIso(new Date("2026-08-17T15:04:05.000Z"))).toBe(
      "2026-08-18T00:00:00.000Z",
    );
  });
});

describe("toUsageStatus", () => {
  const now = new Date("2026-08-17T12:00:00.000Z");

  it("reports remaining messages for a capped user", () => {
    expect(
      toUsageStatus({ limit: 5, used: 3, unlimited: false, now }),
    ).toEqual({
      limit: 5,
      used: 3,
      remaining: 2,
      resetsAt: "2026-08-18T00:00:00.000Z",
      unlimited: false,
    });
  });

  it("never reports negative remaining", () => {
    expect(
      toUsageStatus({ limit: 5, used: 5, unlimited: false, now }).remaining,
    ).toBe(0);
  });

  it("marks admins unlimited without counting usage", () => {
    expect(
      toUsageStatus({ limit: 5, used: 0, unlimited: true, now }),
    ).toEqual({
      limit: 5,
      used: 0,
      remaining: 5,
      resetsAt: "2026-08-18T00:00:00.000Z",
      unlimited: true,
    });
  });
});
