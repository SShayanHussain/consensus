import { Redis } from "ioredis";

// Initialize Redis client using the provided connection string.
// Only initialize on the server side.
let redis: Redis | null = null;
if (typeof window === "undefined") {
  redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
}

/**
 * A simple token bucket rate limiter using Redis.
 * All rate limit keys should be tenant-scoped (PLAYBOOK §4).
 * @param key The unique key (e.g., 'rate_limit:workspace_id:action')
 * @param limit The maximum number of requests allowed in the window
 * @param window_seconds The time window in seconds
 * @returns True if allowed, false if rate limited
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  window_seconds: number
): Promise<boolean> {
  if (!redis) return true; // Skip if no redis (e.g. build time)

  const currentCount = await redis.incr(key);

  if (currentCount === 1) {
    await redis.expire(key, window_seconds);
  }

  if (currentCount > limit) {
    return false;
  }

  return true;
}
