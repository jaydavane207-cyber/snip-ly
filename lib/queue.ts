import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let connection: IORedis | null = null;

function getConnection(): IORedis {
  if (!connection) {
    const isTls = redisUrl.startsWith('rediss://');
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false,
      tls: isTls ? { rejectUnauthorized: false } : undefined,
    });
    connection.on('error', (err) => {
      console.warn('[Queue Redis Error]:', err.message);
    });
  }
  return connection;
}

export interface ClickJobData {
  linkId: string;
  shortCode: string;
  userAgent: string;
  country: string;
  referrer: string;
}

let _clickQueue: Queue<ClickJobData> | null = null;

export function getClickQueue(): Queue<ClickJobData> | null {
  try {
    if (!_clickQueue) {
      _clickQueue = new Queue<ClickJobData>('clicks', {
        connection: getConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      });
    }
    return _clickQueue;
  } catch (err) {
    console.warn('[Queue] Failed to create click queue:', err);
    return null;
  }
}

export { Queue };
