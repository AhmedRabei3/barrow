import { createClient } from "redis";

type RedisClientInstance = ReturnType<typeof createClient>;

type RedisGlobals = typeof globalThis & {
  __barrowRedisClient?: RedisClientInstance;
  __barrowRedisClientPromise?: Promise<RedisClientInstance | null>;
};

const globals = globalThis as RedisGlobals;

const createRedisConnection = async (): Promise<RedisClientInstance | null> => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    return null;
  }

  const client = createClient({
    url: redisUrl,
  });

  client.on("error", (error) => {
    console.error("Redis client error:", error);
  });

  await client.connect();
  return client;
};

export const getRedisClient = async (): Promise<RedisClientInstance | null> => {
  if (globals.__barrowRedisClient?.isReady) {
    return globals.__barrowRedisClient;
  }

  if (!globals.__barrowRedisClientPromise) {
    globals.__barrowRedisClientPromise = createRedisConnection()
      .then((client) => {
        globals.__barrowRedisClient = client || undefined;
        return client;
      })
      .catch((error) => {
        console.error("Failed to connect Redis:", error);
        globals.__barrowRedisClient = undefined;
        return null;
      })
      .finally(() => {
        globals.__barrowRedisClientPromise = undefined;
      });
  }

  return globals.__barrowRedisClientPromise;
};
