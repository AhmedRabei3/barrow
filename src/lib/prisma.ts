import { PrismaClient, type Notification } from "@prisma/client";
import { realtimeBus } from "./realtimeBus";
import { logger } from "./logger";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const isSupabasePostgresUrl = (value: string) =>
  /supabase\.com(?::\d+)?\//i.test(value) ||
  /pooler\.supabase\.com(?::\d+)?\//i.test(value);

const normalizePostgresConnectionUrl = (value: string | undefined) => {
  if (!value) {
    return value;
  }

  try {
    const url = new URL(value);
    const protocol = url.protocol.toLowerCase();

    if (
      protocol !== "postgres:" &&
      protocol !== "postgresql:" &&
      protocol !== "prisma:"
    ) {
      return value;
    }

    if (isSupabasePostgresUrl(value)) {
      if (!url.searchParams.has("sslmode")) {
        url.searchParams.set("sslmode", "require");
      }

      if (!url.searchParams.has("connect_timeout")) {
        url.searchParams.set("connect_timeout", "15");
      }
    }

    return url.toString();
  } catch {
    return value;
  }
};

const prismaRuntimeUrl =
  normalizePostgresConnectionUrl(process.env.DATABASE_URL) ??
  normalizePostgresConnectionUrl(process.env.DIRECT_URL);

if (prismaRuntimeUrl) {
  process.env.DATABASE_URL = prismaRuntimeUrl;
}

const prismaClient =
  globalForPrisma.prisma ||
  new PrismaClient(
    prismaRuntimeUrl
      ? {
          datasources: {
            db: {
              url: prismaRuntimeUrl,
            },
          },
        }
      : undefined,
  );
let prismaConnectPromise: Promise<void> | null = null;
let sendNotificationToUserLoader:
  | null
  | ((
      userId: string,
      payload: {
        id: string;
        title: string;
        message: string;
        type: string;
        createdAt: string;
        isRead: boolean;
      },
    ) => void) = null;

const getSendNotificationToUser = async () => {
  if (sendNotificationToUserLoader) {
    return sendNotificationToUserLoader;
  }

  const websocketModule = await import("./websocketServer.ts");
  sendNotificationToUserLoader = websocketModule.sendNotificationToUser;
  return sendNotificationToUserLoader;
};

export const prisma = prismaClient.$extends({
  query: {
    notification: {
      async create({ args, query }) {
        const result = (await query(args)) as Notification;
        const userId = result.userId ?? args.data.userId;
        const payload = {
          id: result.id,
          title: result.title ?? "إشعار جديد",
          message: result.message ?? "",
          type: String(result.type ?? "INFO"),
          createdAt: result.createdAt
            ? new Date(result.createdAt).toISOString()
            : new Date().toISOString(),
          isRead: Boolean(result.isRead),
        };

        if (userId && result.id) {
          realtimeBus.emit("notification", {
            userId,
            ...payload,
          });
        }

        try {
          if (userId && result.id) {
            const sendNotificationToUser = await getSendNotificationToUser();
            sendNotificationToUser(userId, {
              ...payload,
            });
          }
        } catch (error) {
          logger.error("Failed to push realtime notification:", error);
        }

        return result;
      },
    },
  },
});

export const ensurePrismaConnection = async () => {
  if (!prismaConnectPromise) {
    prismaConnectPromise = prismaClient.$connect().catch((error) => {
      prismaConnectPromise = null;
      throw error;
    });
  }

  return prismaConnectPromise;
};

if (process.env.NODE_ENV !== "production")
  globalForPrisma.prisma = prismaClient;
