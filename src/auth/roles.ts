import type { userRole } from "@/db/schema/auth";

/**
 * Roles are only ever read from the `users.role` column. Never derive a role
 * from client input, an email address, or an env allowlist. Promote admins with
 * `update users set role = 'admin' where email = '…'`.
 */
export type UserRole = (typeof userRole.enumValues)[number];

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}

export function isUserRole(value: unknown): value is UserRole {
  return value === "user" || value === "admin";
}
