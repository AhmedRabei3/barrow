import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      balance: number;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    balance: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    balance: number;
  }
}
