import { prisma } from './db';
import { redis } from './redis';
import { triggerWebhook } from './webhook';

export interface RouteRule {
  type: string;
  value: string;
  destinationUrl: string;
}

export type CachedLinkRule = RouteRule;

export interface SplitDestination {
  url: string;
  weight: number;
}

export interface CachedLinkData {
  id: string;
  originalUrl: string;
  isActive: boolean;
  expiresAt: string | null;
  passwordHash: string | null;
  rules: CachedLinkRule[];
  maxClicks?: number | null;
  clickCount?: number;
  splitDestinations?: SplitDestination[];
}

export interface ClickQueueItem {
  linkId: string;
  shortCode: string;
  userAgent: string;
  country: string;
  referrer: string;
}

/**
 * Parses cached JSON link data safely.
 * Returns null if string is empty, legacy plain URL string, or invalid JSON.
 */
export function parseCachedLinkData(cachedStr: string | null | undefined): CachedLinkData | null {
  if (!cachedStr || typeof cachedStr !== 'string') return null;
  if (!cachedStr.startsWith('{')) return null;
  try {
    const data = JSON.parse(cachedStr) as CachedLinkData;
    if (data && typeof data === 'object' && data.id && typeof data.originalUrl === 'string') {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseDevice(ua: string): 'mobile' | 'desktop' {
  return /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop';
}

export function parseBrowser(ua: string): string {
  if (/edge|edg/i.test(ua)) return 'Edge';
  if (/opr|opera/i.test(ua)) return 'Opera';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Other';
}

export function parseOs(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other';
}

/**
 * Resolves the destination URL based on geo/device rules.
 * Priority: country match (exact uppercase) > device match (lowercase) > originalUrl fallback.
 */
export function resolveDestination(
  originalUrl: string,
  rules: RouteRule[] | undefined | null,
  country: string,
  device: 'mobile' | 'desktop'
): string {
  if (!rules || rules.length === 0) return originalUrl;

  const normalizedCountry = country.toUpperCase();
  const countryMatch = rules.find(
    (r) => r.type === 'country' && r.value.toUpperCase() === normalizedCountry
  );
  if (countryMatch) {
    return countryMatch.destinationUrl;
  }

  const normalizedDevice = device.toLowerCase();
  const deviceMatch = rules.find(
    (r) => r.type === 'device' && r.value.toLowerCase() === normalizedDevice
  );
  if (deviceMatch) {
    return deviceMatch.destinationUrl;
  }

  return originalUrl;
}

/**
 * Picks a destination from A/B split destinations using weighted random selection.
 * Returns null if splits are invalid or empty (caller falls back to originalUrl).
 */
export function pickSplitDestination(
  splits: SplitDestination[] | undefined | null
): string | null {
  if (!splits || !Array.isArray(splits) || splits.length === 0) return null;

  const valid = splits.filter(
    (s) => s && typeof s.url === 'string' && s.url.length > 0 && typeof s.weight === 'number' && s.weight > 0
  );
  if (valid.length === 0) return null;

  const total = valid.reduce((sum, s) => sum + s.weight, 0);
  if (total <= 0) return null;

  try {
    let rand = Math.random() * total;
    for (const s of valid) {
      rand -= s.weight;
      if (rand <= 0) return s.url;
    }
    return valid[valid.length - 1].url;
  } catch {
    return null;
  }
}

const WEBHOOK_MILESTONES = new Set([10, 50, 100, 500, 1000, 5000]);

/**
 * Records a click in PostgreSQL and increments the clickCount on the Link record.
 * Tries BullMQ queue first; falls back to direct DB write if queue unavailable.
 * Also keeps the Redis cache in sync if maxClicks limit is active.
 * Fires milestone webhooks without blocking.
 */
export async function logClickAndIncrement(
  linkId: string,
  shortCode: string,
  userAgent: string,
  country: string,
  referrer: string,
  isMaxClicks?: boolean
): Promise<void> {
  const device = parseDevice(userAgent);
  const browser = parseBrowser(userAgent);
  const os = parseOs(userAgent);
  const normalizedCountry = country !== 'UNKNOWN' && country ? country.toUpperCase() : null;
  const normalizedReferrer = referrer !== 'Direct' && referrer ? referrer : null;

  try {
    let queued = false;

    // For standard clicks without maxClicks, attempt BullMQ queue first if a worker is active
    if (!isMaxClicks) {
      try {
        const { getClickQueue } = await import('./queue');
        const queue = getClickQueue();
        if (queue) {
          const workers = await queue.getWorkers().catch(() => []);
          if (workers && workers.length > 0) {
            await queue.add('click', {
              linkId,
              shortCode,
              userAgent,
              country: normalizedCountry || 'UNKNOWN',
              referrer: normalizedReferrer || 'Direct',
            });
            queued = true;
          }
        }
      } catch (queueErr) {
        console.warn('[Queue Fallback]:', queueErr instanceof Error ? queueErr.message : queueErr);
        queued = false;
      }
    }

    if (!queued) {
      // Direct DB write fallback
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

      // Fire milestone webhooks without blocking
      if (WEBHOOK_MILESTONES.has(newCount)) {
        try {
          void triggerWebhook(updatedLink.userId, {
            event: 'milestone',
            shortCode: updatedLink.shortCode,
            clickCount: newCount,
            recentClick: {
              country: normalizedCountry,
              device,
              browser,
              createdAt: new Date().toISOString(),
            },
          });
        } catch {
          // Never crash the worker
        }
      }

      // Keep Redis cache in sync
      try {
        const cacheKey = `short:${shortCode}`;
        const cachedStr = await redis.get(cacheKey);
        if (cachedStr && cachedStr.startsWith('{')) {
          const cachedData = JSON.parse(cachedStr);
          cachedData.clickCount = (cachedData.clickCount || 0) + 1;
          await redis.set(cacheKey, JSON.stringify(cachedData), 'EX', 3600);
        }
      } catch {
        // Redis sync failure is non-blocking
      }
    }
  } catch (err) {
    console.warn('Click logging failed gracefully:', err instanceof Error ? err.message : err);
  }
}
