import { createClient } from "redis";

type RedisClientInstance = ReturnType<typeof createClient>;

type RedisGlobals = typeof globalThis & {
  __mashhoorRedisClient?: RedisClientInstance;
  __mashhoorRedisClientPromise?: Promise<RedisClientInstance | null>;
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
  if (globals.__mashhoorRedisClient?.isReady) {
    return globals.__mashhoorRedisClient;
  }

  if (!globals.__mashhoorRedisClientPromise) {
    globals.__mashhoorRedisClientPromise = createRedisConnection()
      .then((client) => {
        globals.__mashhoorRedisClient = client || undefined;
        return client;
      })
      .catch((error) => {
        console.error("Failed to connect Redis:", error);
        globals.__mashhoorRedisClient = undefined;
        return null;
      })
      .finally(() => {
        globals.__mashhoorRedisClientPromise = undefined;
      });
  }

  return globals.__mashhoorRedisClientPromise;
};
