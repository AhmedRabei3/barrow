import { NextRequest, NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

type RateLimitGlobals = typeof globalThis & {
  __mashhoorRateLimitStore?: RateLimitStore;
  __mashhoorRateLimitSweepCounter?: number;
};

const globals = globalThis as RateLimitGlobals;
const store: RateLimitStore = globals.__mashhoorRateLimitStore || new Map();
globals.__mashhoorRateLimitStore = store;
globals.__mashhoorRateLimitSweepCounter =
  globals.__mashhoorRateLimitSweepCounter || 0;

const SWEEP_INTERVAL = 100;

const getClientIp = (req: NextRequest) => {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown-ip";
};

const maybeSweepStore = () => {
  globals.__mashhoorRateLimitSweepCounter =
    (globals.__mashhoorRateLimitSweepCounter || 0) + 1;

  if ((globals.__mashhoorRateLimitSweepCounter || 0) % SWEEP_INTERVAL !== 0) {
    return;
  }

  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
};

export type RateLimitOptions = {
  req: NextRequest;
  key: string;
  limit: number;
  windowMs: number;
  userId?: string | null;
  errorMessage?: string;
};

const RATE_LIMIT_LUA_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return { current, ttl }
`;

const createRateLimitResponse = ({
  errorMessage,
  retryAfterMs,
}: {
  errorMessage?: string;
  retryAfterMs: number;
}) => {
  const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

  return NextResponse.json(
    {
      message:
        errorMessage || "Too many requests. Please try again in a few moments.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
};

const enforceMemoryRateLimit = ({
  req,
  key,
  limit,
  windowMs,
  userId,
  errorMessage,
}: RateLimitOptions): NextResponse | null => {
  maybeSweepStore();

  const now = Date.now();
  const identity = userId || getClientIp(req);
  const bucketKey = `${key}:${identity}`;

  const existing = store.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    store.set(bucketKey, {
      count: 1,
      resetAt: now + windowMs,
    });
    return null;
  }

  if (existing.count >= limit) {
    return createRateLimitResponse({
      errorMessage,
      retryAfterMs: existing.resetAt - now,
    });
  }

  existing.count += 1;
  store.set(bucketKey, existing);

  return null;
};

const toSafeNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const enforceRateLimit = async ({
  req,
  key,
  limit,
  windowMs,
  userId,
  errorMessage,
}: RateLimitOptions): Promise<NextResponse | null> => {
  const identity = userId || getClientIp(req);
  const bucketKey = `${key}:${identity}`;
  const redisClient = await getRedisClient();

  if (redisClient?.isReady) {
    try {
      const redisResult = (await redisClient.eval(RATE_LIMIT_LUA_SCRIPT, {
        keys: [bucketKey],
        arguments: [String(windowMs)],
      })) as [unknown, unknown] | null;

      const count = toSafeNumber(redisResult?.[0], 1);
      const ttlMsRaw = toSafeNumber(redisResult?.[1], windowMs);
      const ttlMs = ttlMsRaw >= 0 ? ttlMsRaw : windowMs;

      if (count > limit) {
        return createRateLimitResponse({
          errorMessage,
          retryAfterMs: ttlMs,
        });
      }

      return null;
    } catch (error) {
      console.error(
        "Redis rate limiting failed, using memory fallback:",
        error,
      );
    }
  }

  return enforceMemoryRateLimit({
    req,
    key,
    limit,
    windowMs,
    userId,
    errorMessage,
  });
};
