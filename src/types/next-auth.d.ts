import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CUSTOMER" | "CRAFTSMAN";
    } & DefaultSession["user"];
  }

  interface User {
    role: "CUSTOMER" | "CRAFTSMAN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "CUSTOMER" | "CRAFTSMAN";
  }
}
