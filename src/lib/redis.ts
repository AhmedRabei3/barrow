// lib/redis.ts
import { createClient } from "redis";
import { logger } from "./logger";

type RedisClientInstance = ReturnType<typeof createClient>;

type RedisGlobals = typeof globalThis & {
  __mashhoorRedisClient?: RedisClientInstance;
  __mashhoorRedisClientPromise?: Promise<RedisClientInstance | null>;
  __mashhoorRedisDisabledUntil?: number;
};

const globals = globalThis as RedisGlobals;
const REDIS_DISABLE_WINDOW_MS = 15_000;
const MAX_RECONNECT_ATTEMPTS = 20;
const MAX_RECONNECT_DELAY_MS = 3_000;

/* ================= CREATE CONNECTION ================= */

const createRedisConnection = async (): Promise<RedisClientInstance | null> => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn("⚠️ REDIS_URL not found — Redis disabled");
    return null;
  }

  const client: RedisClientInstance = createClient({
    url: redisUrl,

    socket: {
      reconnectStrategy: (retries) => {
        if (retries > MAX_RECONNECT_ATTEMPTS) {
          logger.error(
            `❌ Redis reconnect failed after ${MAX_RECONNECT_ATTEMPTS} attempts`,
          );
          return new Error("Retry attempts exhausted");
        }

        const delay = Math.min(retries * 200, MAX_RECONNECT_DELAY_MS);
        logger.warn(`🔁 Redis reconnect attempt #${retries} in ${delay}ms`);
        return delay;
      },

      connectTimeout: 10000,
    },
  });

  /* ===== EVENTS ===== */

  client.on("connect", () => {
    logger.info("🟢 Redis connecting...");
  });

  client.on("ready", () => {
    logger.info("✅ Redis ready");
  });

  client.on("error", (error) => {
    logger.error("❌ Redis error:", error);
  });

  client.on("end", () => {
    logger.warn("🔌 Redis connection closed");
  });

  try {
    await client.connect();
    return client;
  } catch (error) {
    logger.error("❌ Redis initial connection failed:", error);
    try {
      if (client.isOpen) {
        await client.quit();
      }
    } catch {
      // noop
    }
    return null;
  }
};

/* ================= GET CLIENT ================= */

export const getRedisClient = async (): Promise<RedisClientInstance | null> => {
  if (
    globals.__mashhoorRedisDisabledUntil &&
    globals.__mashhoorRedisDisabledUntil > Date.now()
  ) {
    return null;
  }

  // ✅ reuse existing
  if (globals.__mashhoorRedisClient?.isOpen) {
    return globals.__mashhoorRedisClient;
  }

  // ✅ prevent race conditions
  if (!globals.__mashhoorRedisClientPromise) {
    globals.__mashhoorRedisClientPromise = createRedisConnection()
      .then((client) => {
        globals.__mashhoorRedisClient = client || undefined;
        return client;
      })
      .catch((error) => {
        logger.error("❌ Redis connection error:", error);
        globals.__mashhoorRedisClient = undefined;
        globals.__mashhoorRedisDisabledUntil =
          Date.now() + REDIS_DISABLE_WINDOW_MS;
        return null;
      })
      .finally(() => {
        globals.__mashhoorRedisClientPromise = undefined;
      });
  }

  return globals.__mashhoorRedisClientPromise;
};

/* ================= OPTIONAL SAFE COMMAND ================= */
// helper لتفادي crash إذا Redis غير متصل

export const safeRedis = async () => {
  const client = await getRedisClient();

  if (!client || !client.isOpen) {
    logger.warn("⚠️ Redis not available — skipping operation");
    return null;
  }

  return client;
};

export const duplicateRedisClient = async () => {
  const client = await getRedisClient();

  if (!client || !client.isOpen) {
    return null;
  }

  try {
    const duplicate = client.duplicate();

    duplicate.on("error", (error) => {
      logger.error("❌ Redis duplicate error:", error);
    });

    duplicate.on("end", () => {
      logger.warn("🔌 Redis duplicate connection closed");
    });

    if (!duplicate.isOpen) {
      await duplicate.connect();
    }

    return duplicate;
  } catch (error) {
    logger.error("❌ Failed to create Redis duplicate:", error);
    return null;
  }
};
