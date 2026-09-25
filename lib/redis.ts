import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

function createRedisInstance(): Redis {
  const isTls = redisUrl.startsWith('rediss://');
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  client.on('error', (err) => {
    // Log Redis errors gracefully without unhandled exception crashes
    console.warn('[Redis Error]:', err.message);
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisInstance();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

/**
 * Safely delete keys matching a pattern without using KEYS (which blocks Redis).
 * Uses SCAN with cursor in batches of 100.
 */
export async function delPattern(prefix: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [nc, keys] = await redis.scan(cursor, 'MATCH', prefix, 'COUNT', 100);
      cursor = nc;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.warn('[Redis delPattern notice]:', err instanceof Error ? err.message : err);
  }
}

export default redis;

