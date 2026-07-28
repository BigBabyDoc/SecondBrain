import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "DOCTOR" | "ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    role: "DOCTOR" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "DOCTOR" | "ADMIN";
  }
}
