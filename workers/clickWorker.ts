import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isTls = redisUrl.startsWith('rediss://');

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: isTls ? { rejectUnauthorized: false } : undefined,
});

connection.on('error', (err) => {
  console.warn('[Worker Redis Error]:', err.message);
});

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

function parseDevice(ua: string): 'mobile' | 'desktop' {
  return /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop';
}

function parseBrowser(ua: string): string {
  if (/edge|edg/i.test(ua)) return 'Edge';
  if (/opr|opera/i.test(ua)) return 'Opera';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Other';
}

function parseOs(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other';
}

const WEBHOOK_MILESTONES = new Set([10, 50, 100, 500, 1000, 5000]);

const worker = new Worker<{
  linkId: string;
  shortCode: string;
  userAgent: string;
  country: string;
  referrer: string;
}>(
  'clicks',
  async (job) => {
    const { linkId, shortCode, userAgent, country, referrer } = job.data;

    const device = parseDevice(userAgent);
    const browser = parseBrowser(userAgent);
    const os = parseOs(userAgent);
    const normalizedCountry = country !== 'UNKNOWN' && country ? country.toUpperCase() : null;
    const normalizedReferrer = referrer !== 'Direct' && referrer ? referrer : null;

    try {
      const existing = await prisma.link.findUnique({
        where: { id: linkId },
        select: { id: true, userId: true, shortCode: true, clickCount: true },
      });
      if (!existing) {
        return;
      }

      const [, updatedLink] = await Promise.all([
        prisma.click.create({
          data: {
            linkId,
            country: normalizedCountry,
            device,
            browser,
            os,
            referrer: normalizedReferrer,
          },
        }),
        prisma.link.update({
          where: { id: linkId },
          data: { clickCount: { increment: 1 } },
          select: { clickCount: true, userId: true, shortCode: true },
        }),
      ]);

      const newCount = updatedLink.clickCount;
      const userId = updatedLink.userId;

      // Fire milestone webhooks without blocking worker
      if (WEBHOOK_MILESTONES.has(newCount) && userId) {
        try {
          const webhooks = await prisma.webhook.findMany({
            where: { userId, isActive: true },
            select: { url: true, secret: true },
          });


          await Promise.allSettled(
            webhooks.map(async (wh) => {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 3000);
              try {
                await fetch(wh.url, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-webhook-secret': wh.secret ?? '',
                  },
                  body: JSON.stringify({
                    event: 'milestone',
                    shortCode: updatedLink.shortCode,
                    clickCount: newCount,
                    recentClick: {
                      country: normalizedCountry,
                      device,
                      browser,
                      createdAt: new Date().toISOString(),
                    },
                  }),
                  signal: controller.signal,
                });
              } catch {
                // swallow
              } finally {
                clearTimeout(timer);
              }
            })
          );
        } catch {
          // Never crash worker for webhooks
        }
      }

      console.log(`[Worker] Processed click for ${shortCode} (total: ${newCount})`);
    } catch (err) {
      console.error(`[Worker] Failed to process click for ${linkId}:`, err);
      throw err; // allow BullMQ retry
    }
  },
  {
    connection,
    concurrency: 10,
  }
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

console.log('[Worker] Click worker started, listening for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
