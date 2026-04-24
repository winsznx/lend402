// =============================================================================
// src/lib/redis.ts
// ioredis client singleton + API Vault helper functions
// =============================================================================

import Redis from "ioredis";

let _redis: Redis | null = null;

/** Returns the shared ioredis client. Lazy-initialised on first call. */
export function getRedis(): Redis {
  if (_redis) return _redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("Missing REDIS_URL environment variable");
  }

  _redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  _redis.on("error", (err: Error) => {
    console.error("[Redis] Connection error:", err.message);
  });

  return _redis;
}

// ---------------------------------------------------------------------------
// Idempotency helpers — prevent double-settlement
// ---------------------------------------------------------------------------

const SETTLED_KEY_TTL = 86_400; // 24 hours in seconds

export interface SettledRecord {
  readonly blockHeight: number;
  readonly confirmedAt: number;
  readonly payer: string;
}

/** Mark a txid as settled so duplicate settle calls are rejected. */
export async function setSettled(
  txid: string,
  record: SettledRecord
): Promise<void> {
  await getRedis().set(
    `settled:${txid}`,
    JSON.stringify(record),
    "EX",
    SETTLED_KEY_TTL
  );
}

/** Returns the cached settled record if this txid has already been settled. */
export async function getSettled(
  txid: string
): Promise<SettledRecord | null> {
  const val = await getRedis().get(`settled:${txid}`);
  return val ? (JSON.parse(val) as SettledRecord) : null;
}

// ---------------------------------------------------------------------------
// Rate limiting — sliding window per vault + caller
// ---------------------------------------------------------------------------

/**
 * Increments a sliding-window counter for `key`.
 * Returns { count, allowed } — allowed is false if count exceeds limit.
 *
 * Uses a sorted set with timestamps as scores; entries older than windowMs
 * are pruned on each call.
 */
export async function checkAndIncrRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ count: number; allowed: boolean }> {
  const redis = getRedis();
  const now = Date.now();
  const windowStart = now - windowMs;
  const pipe = redis.pipeline();

  pipe.zremrangebyscore(key, "-inf", windowStart);
  pipe.zadd(key, now, `${now}-${Math.random()}`);
  pipe.zcard(key);
  pipe.pexpire(key, windowMs);

  const results = await pipe.exec();
  if (!results) return { count: 0, allowed: true };

  const cardResult = results[2];
  const count = (cardResult?.[1] as number) ?? 0;
  return { count, allowed: count <= limit };
}

// ---------------------------------------------------------------------------
// Global gateway rate limit
// ---------------------------------------------------------------------------

const GLOBAL_RATE_LIMIT = 10_000;
const GLOBAL_RATE_WINDOW_MS = 60_000; // 1 minute

/** Global rate limit across all vault calls — hard circuit breaker. */
export async function checkGlobalRateLimit(): Promise<boolean> {
  const redis = getRedis();
  const bucket = Math.floor(Date.now() / GLOBAL_RATE_WINDOW_MS);
  const key = `global:rps:${bucket}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, Math.ceil(GLOBAL_RATE_WINDOW_MS / 1000));
  }
  return count <= GLOBAL_RATE_LIMIT;
}
