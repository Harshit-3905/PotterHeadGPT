import type { userRole } from "@/db/schema/auth";

/**
 * Roles are only ever read from the `users.role` column. Never derive a role
 * from client input, an email address, or an env allowlist. Promote admins with
 * `update users set role = 'admin' where email = '…'`.
 */
export type UserRole = (typeof userRole.enumValues)[number];

export const DEFAULT_USER_ROLE: UserRole = "user";

/** Maps a database role column to a trusted session role. */
export function roleFromDatabase(value: unknown): UserRole {
  return value === "admin" ? "admin" : DEFAULT_USER_ROLE;
}

/**
 * JWT/OAuth payloads may carry a client-supplied `role`. That claim is ignored
 * until {@link roleFromDatabase} validates the persisted row on every refresh.
 */
export function ignoreClientRoleClaim(_claim: unknown): UserRole {
  void _claim;
  return DEFAULT_USER_ROLE;
}

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}

export function isUserRole(value: unknown): value is UserRole {
  return value === "user" || value === "admin";
}
