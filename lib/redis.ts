import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

function createRedisInstance(): Redis {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
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

export default redis;
