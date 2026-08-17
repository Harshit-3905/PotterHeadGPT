import type { DefaultSession } from "next-auth";
import type { UserRole } from "./roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      isGuest: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    isGuest?: boolean;
  }
}
