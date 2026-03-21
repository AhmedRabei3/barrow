import { DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      balance: number;
      isActive: boolean;
      isAdmin: boolean;
      activeUntil: Date | null;
      pendingReferralEarnings: number;
      notifications: {
        id: string;
        title: string;
        message: string;
        createdAt: Date;
      }[];
    };
  }

  interface User extends DefaultUser {
    balance: number;
    isActive: boolean;
    isAdmin: boolean;
    activeUntil: Date | null;
    pendingReferralEarnings: number;
    notifications: {
      id: string;
      title: string;
      message: string;
      createdAt: Date;
    }[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    balance: number;
    isActive: boolean;
    isAdmin: boolean;
    activeUntil: Date | null;
    pendingReferralEarnings: number;
    notifications: {
      id: string;
      title: string;
      message: string;
      createdAt: Date;
    }[];
  }
}
