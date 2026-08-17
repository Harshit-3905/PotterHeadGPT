// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isAdmin, isUserRole } from "@/auth/roles";

describe("isAdmin", () => {
  it("grants admin privileges to the admin role", () => {
    expect(isAdmin("admin")).toBe(true);
  });

  it("denies admin privileges to the user role", () => {
    expect(isAdmin("user")).toBe(false);
  });
});

describe("isUserRole", () => {
  it("accepts the roles defined by the database enum", () => {
    expect(isUserRole("user")).toBe(true);
    expect(isUserRole("admin")).toBe(true);
  });

  it("rejects anything else that reaches it from a token", () => {
    for (const value of ["root", "Admin", "", null, undefined, 1, true, {}]) {
      expect(isUserRole(value)).toBe(false);
    }
  });
});
