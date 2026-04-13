import NextAuth from "next-auth";
import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@/lib/prisma-adapter";
import {
  getSessionCookieName,
  shouldUseSecureAuthCookie,
} from "@/lib/auth-cookie";
import { ensureOwnerAccount } from "@/lib/ensureOwnerAccount";
import authConfig from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: getSessionCookieName(),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: shouldUseSecureAuthCookie(),
      },
    },
  },
  ...authConfig,

  callbacks: {
    // JWT callback: احفظ بيانات التصاريح الأساسية داخل التوكن لتكون متاحة في middleware.
    async jwt({ token, user }) {
      if (user) {
        token.balance = Number(user.balance ?? token.balance ?? 0);
        token.isActive = Boolean(user.isActive ?? token.isActive ?? false);
        token.isAdmin = Boolean(user.isAdmin ?? token.isAdmin ?? false);
        token.isOwner = Boolean(user.isOwner ?? token.isOwner ?? false);
        token.isIdentityVerified = Boolean(
          user.isIdentityVerified ?? token.isIdentityVerified ?? false,
        );
        token.activeUntil = (user.activeUntil ??
          token.activeUntil ??
          null) as Date | null;
        token.pendingReferralEarnings = Number(
          user.pendingReferralEarnings ?? token.pendingReferralEarnings ?? 0,
        );
        token.notifications = user.notifications ?? token.notifications ?? [];
      }

      token.balance = Number(token.balance ?? 0);
      token.isActive = Boolean(token.isActive ?? false);
      token.isAdmin = Boolean(token.isAdmin ?? false);
      token.isOwner = Boolean(token.isOwner ?? false);
      token.isIdentityVerified = Boolean(token.isIdentityVerified ?? false);
      token.activeUntil = (token.activeUntil ?? null) as Date | null;
      token.pendingReferralEarnings = Number(
        token.pendingReferralEarnings ?? 0,
      );
      token.notifications = token.notifications ?? [];

      return token;
    },

    // Session callback: يُستخدم كل مرة تُستدعى useSession() أو auth()
    async session({ session, token }) {
      if (!session.user || !token.sub) return session;

      await ensureOwnerAccount();

      // جلب البيانات الحديثة من DB لضمان اللحظية
      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: {
          balance: true,
          isActive: true,
          isAdmin: true,
          isOwner: true,
          isIdentityVerified: true,
          activeUntil: true,
          pendingReferralEarnings: true,
          notifications: {
            where: { isRead: false },
            select: {
              id: true,
              title: true,
              message: true,
              createdAt: true,
            },
          },
        },
      });

      session.user.id = token.sub;
      session.user.balance = Number(dbUser?.balance ?? 0);
      session.user.isActive = dbUser?.isActive ?? false;
      session.user.isAdmin = dbUser?.isAdmin ?? false;
      session.user.isOwner = dbUser?.isOwner ?? false;
      session.user.isIdentityVerified = dbUser?.isIdentityVerified ?? false;
      session.user.activeUntil = dbUser?.activeUntil ?? null;
      session.user.pendingReferralEarnings = Number(
        dbUser?.pendingReferralEarnings ?? 0,
      );
      session.user.notifications = dbUser?.notifications ?? [];

      return session;
    },
  },
});
