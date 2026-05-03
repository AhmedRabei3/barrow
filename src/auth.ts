import { getServerSession, type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { prisma } from "@/lib/prisma";
import { NotificationType, Prisma } from "@prisma/client";
import {
  getSessionCookieName,
  shouldUseSecureAuthCookie,
} from "@/lib/auth-cookie";
import authConfig from "./auth.config";

const LOCAL_AUTH_URL_PATTERN =
  /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

const resolveDeploymentAuthUrl = () => {
  const configuredUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "";

  if (!vercelHost) {
    return configuredUrl;
  }

  if (!configuredUrl || LOCAL_AUTH_URL_PATTERN.test(configuredUrl)) {
    return `https://${vercelHost}`;
  }

  return configuredUrl;
};

const resolvedAuthUrl = resolveDeploymentAuthUrl();

if (resolvedAuthUrl) {
  process.env.AUTH_URL = resolvedAuthUrl;
  process.env.NEXTAUTH_URL = resolvedAuthUrl;
}

const isDatabaseUnavailableError = (error: unknown) => {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P1001" || error.code === "P2024"))
  );
};

type SessionUserSnapshot = {
  balance: number;
  isActive: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isIdentityVerified: boolean;
  activeUntil: Date | null;
  pendingReferralEarnings: number;
  preferredInterestOrder: string[];
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    createdAt: Date;
  }>;
};

const SESSION_USER_CACHE_TTL_MS = 30 * 1000;
const sessionUserCache = new Map<
  string,
  { expiresAt: number; value: SessionUserSnapshot }
>();

const readSessionUserCache = (userId: string): SessionUserSnapshot | null => {
  const cached = sessionUserCache.get(userId);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    sessionUserCache.delete(userId);
    return null;
  }

  return cached.value;
};

const writeSessionUserCache = (userId: string, value: SessionUserSnapshot) => {
  sessionUserCache.set(userId, {
    expiresAt: Date.now() + SESSION_USER_CACHE_TTL_MS,
    value,
  });
};

export const authOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  events: {
    async createUser({ user }) {
      if (!user.id) {
        return;
      }

      await prisma.notification.create({
        data: {
          userId: user.id,
          title: "🎉 Welcome to Mashhoor | مرحبًا بك في Mashhoor",
          message:
            "Your account is ready. Verify your email if needed, then activate your subscription to unlock publishing and earnings. | حسابك أصبح جاهزًا. أكمل التحقق من البريد إن لزم، ثم فعّل اشتراكك لبدء النشر والاستفادة من الأرباح.",
          type: NotificationType.INFO,
        },
      });
    },
  },
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
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const normalizedEmail = user.email?.trim().toLowerCase();

          await prisma.user.updateMany({
            where: {
              OR: [
                ...(user.id ? [{ id: user.id }] : []),
                ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
              ],
            },
            data: {
              emailVerified: new Date(),
              ...(user.image
                ? { profileImage: user.image, image: user.image }
                : {}),
            },
          });
        } catch (error) {
          console.error("Google post-sign-in user sync failed", error);
        }
      }

      return true;
    },

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
        token.preferredInterestOrder =
          user.preferredInterestOrder ?? token.preferredInterestOrder ?? [];
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
      token.preferredInterestOrder = token.preferredInterestOrder ?? [];
      token.notifications = token.notifications ?? [];

      return token;
    },

    // Session callback: يُستخدم كل مرة تُستدعى useSession() أو auth()
    async session({ session, token }) {
      if (!session.user || !token.sub) return session;

      session.user.id = token.sub;
      // fallback to token data if DB is temporarily unavailable
      session.user.balance = Number(token.balance ?? 0);
      session.user.isActive = Boolean(token.isActive ?? false);
      session.user.isAdmin = Boolean(token.isAdmin ?? false);
      session.user.isOwner = Boolean(token.isOwner ?? false);
      session.user.isIdentityVerified = Boolean(
        token.isIdentityVerified ?? false,
      );
      session.user.activeUntil = (token.activeUntil as Date | null) ?? null;
      session.user.pendingReferralEarnings = Number(
        token.pendingReferralEarnings ?? 0,
      );
      session.user.preferredInterestOrder = Array.isArray(
        token.preferredInterestOrder,
      )
        ? token.preferredInterestOrder.filter(
            (value): value is string => typeof value === "string",
          )
        : [];
      session.user.notifications = Array.isArray(token.notifications)
        ? token.notifications.filter(
            (
              notification,
            ): notification is {
              id: string;
              title: string;
              message: string;
              createdAt: Date;
            } =>
              Boolean(notification) &&
              typeof notification === "object" &&
              "id" in notification &&
              typeof notification.id === "string" &&
              "title" in notification &&
              typeof notification.title === "string" &&
              "message" in notification &&
              typeof notification.message === "string" &&
              "createdAt" in notification &&
              notification.createdAt instanceof Date,
          )
        : [];

      try {
        let snapshot = readSessionUserCache(token.sub);

        if (!snapshot) {
          // جلب البيانات الحديثة من DB عند عدم توفر نسخة حديثة في الذاكرة
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
              preferredInterestOrder: true,
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

          snapshot = {
            balance: Number(dbUser?.balance ?? session.user.balance),
            isActive: dbUser?.isActive ?? session.user.isActive,
            isAdmin: dbUser?.isAdmin ?? session.user.isAdmin,
            isOwner: dbUser?.isOwner ?? session.user.isOwner,
            isIdentityVerified:
              dbUser?.isIdentityVerified ?? session.user.isIdentityVerified,
            activeUntil: dbUser?.activeUntil ?? session.user.activeUntil,
            pendingReferralEarnings: Number(
              dbUser?.pendingReferralEarnings ??
                session.user.pendingReferralEarnings,
            ),
            preferredInterestOrder:
              dbUser?.preferredInterestOrder ??
              session.user.preferredInterestOrder,
            notifications: dbUser?.notifications ?? [],
          };

          writeSessionUserCache(token.sub, snapshot);
        }

        session.user.balance = snapshot.balance;
        session.user.isActive = snapshot.isActive;
        session.user.isAdmin = snapshot.isAdmin;
        session.user.isOwner = snapshot.isOwner;
        session.user.isIdentityVerified = snapshot.isIdentityVerified;
        session.user.activeUntil = snapshot.activeUntil;
        session.user.pendingReferralEarnings = snapshot.pendingReferralEarnings;
        session.user.preferredInterestOrder = snapshot.preferredInterestOrder;
        session.user.notifications = snapshot.notifications;
      } catch (error) {
        if (isDatabaseUnavailableError(error)) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              "⚠️ Auth session fallback: database temporarily unavailable, using token claims.",
            );
          }
        } else {
          throw error;
        }
      }

      return session;
    },
  },
} satisfies NextAuthOptions;

export const auth = () => getServerSession(authOptions);
