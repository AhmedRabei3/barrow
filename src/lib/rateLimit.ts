import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

/**
 * Redis-based rate limiting (distributed across servers)
 * Returns true if request is allowed, false if rate limit exceeded
 */
export async function checkRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    if (!redis?.isOpen) {
      logger.warn("Redis unavailable for rate limiting, allowing request");
      return true;
    }

    const now = Date.now();
    const windowStart = now - windowMs;

    // Remove old entries
    await redis.zRemRangeByScore(key, "-inf", windowStart);

    // Count requests in current window
    const count = await redis.zCard(key);

    if (count >= limit) {
      return false;
    }

    // Add current request with timestamp as score
    await redis.zAdd(key, {
      score: now,
      value: `${now}-${Math.random()}`,
    });

    // Set expiry on the key
    await redis.expire(key, Math.ceil(windowMs / 1000) * 2);

    return true;
  } catch (error) {
    logger.error("Rate limit check failed, allowing request", error);
    return true;
  }
}

/**
 * Rate limiting with multiple keys
 */
export async function checkMultipleRateLimits(
  limits: RateLimitOptions[]
): Promise<boolean> {
  const results = await Promise.all(
    limits.map((limit) => checkRateLimit(limit))
  );
  return results.every((result) => result);
}

/**
 * Get remaining quota for a rate limit key
 */
export async function getRateLimitRemaining({
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<number> {
  try {
    const redis = await getRedisClient();
    if (!redis?.isOpen) {
      return limit;
    }

    const now = Date.now();
    const windowStart = now - windowMs;

    await redis.zRemRangeByScore(key, "-inf", windowStart);
    const count = await redis.zCard(key);

    return Math.max(0, limit - count);
  } catch {
    return limit;
  }
}

/**
 * Compatibility wrapper for legacy code
 * Returns NextResponse if rate limited, null if allowed
 */
export async function enforceRateLimit({
  key,
  userId,
  limit = 10,
  windowMs = 60_000,
  errorMessage = "Too many requests. Please wait.",
}: {
  req?: unknown;
  key: string;
  userId?: string;
  limit?: number;
  windowMs?: number;
  errorMessage?: string;
}): Promise<NextResponse | null> {
  try {
    const limitKey = userId ? `${key}:${userId}` : key;
    const allowed = await checkRateLimit({
      key: limitKey,
      limit,
      windowMs,
    });

    if (allowed) {
      return null; // Request allowed
    }

    // Rate limited - return error response
    return NextResponse.json(
      { message: errorMessage },
      { status: 429 }
    );
  } catch (error) {
    logger.error("Rate limit enforcement failed", error);
    return null; // On error, allow request
  }
}
