import { prisma } from './db';
import { redis } from './redis';

export interface RouteRule {
  type: string;
  value: string;
  destinationUrl: string;
}

export type CachedLinkRule = RouteRule;

export interface CachedLinkData {
  id: string;
  originalUrl: string;
  isActive: boolean;
  expiresAt: string | null;
  passwordHash: string | null;
  rules: CachedLinkRule[];
  maxClicks?: number | null;
  clickCount?: number;
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
 * Records a click in PostgreSQL and increments the clickCount on the Link record.
 * Also keeps the Redis cache in sync if maxClicks limit is active.
 */
export async function logClickAndIncrement(
  linkId: string,
  shortCode: string,
  userAgent: string,
  country: string,
  referrer: string
): Promise<void> {
  const device = parseDevice(userAgent);
  const browser = parseBrowser(userAgent);
  const normalizedCountry = country !== 'UNKNOWN' && country ? country.toUpperCase() : null;
  const normalizedReferrer = referrer !== 'Direct' && referrer ? referrer : null;

  try {
    await Promise.all([
      prisma.click.create({
        data: {
          linkId,
          country: normalizedCountry,
          device,
          browser,
          referrer: normalizedReferrer,
        },
      }),
      prisma.link.update({
        where: { id: linkId },
        data: { clickCount: { increment: 1 } },
      }),
    ]);

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
  } catch (err) {
    console.error('Click logging failed:', err);
  }
}
