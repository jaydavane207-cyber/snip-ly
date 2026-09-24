import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import {
  resolveDestination,
  parseDevice,
  pickSplitDestination,
  logClickAndIncrement,
  parseCachedLinkData,
  type CachedLinkData,
} from '@/lib/routing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> | { code: string } }
) {
  try {
    const resolvedParams = await params;
    const code = resolvedParams?.code;

    if (!code) {
      return NextResponse.json({ error: 'Short code is required' }, { status: 400 });
    }

    const cacheKey = `short:${code}`;
    let cachedData: CachedLinkData | null = null;

    // 1. Check Redis Cache (JSON format) with backward-compat handling
    try {
      const cachedStr = await redis.get(cacheKey);
      if (cachedStr) {
        cachedData = parseCachedLinkData(cachedStr);
        if (!cachedData) {
          // Corrupt JSON or legacy string cache — delete key to force clean DB miss
          await redis.del(cacheKey);
        }
      }
    } catch (redisErr) {
      console.warn('Redis cache read failed, querying database:', redisErr);
    }

    // Check conditions on Cache HIT
    if (cachedData && cachedData.id) {
      if (!cachedData.isActive) {
        await redis.del(cacheKey);
        return NextResponse.json({ error: 'Short link is inactive' }, { status: 404 });
      }
      if (cachedData.expiresAt && new Date(cachedData.expiresAt) < new Date()) {
        await redis.del(cacheKey);
        return NextResponse.json({ error: 'Short link has expired' }, { status: 404 });
      }
      if (cachedData.maxClicks) {
        const current = await prisma.link.findUnique({
          where: { id: cachedData.id },
          select: { clickCount: true },
        });
        if (current && current.clickCount >= cachedData.maxClicks) {
          return NextResponse.json({ error: 'Short link click limit reached' }, { status: 404 });
        }
      }
      if (cachedData.passwordHash) {
        return NextResponse.redirect(new URL(`/verify/${code}`, request.url), 302);
      }
    }

    // 2. Cache MISS: Query PostgreSQL via Prisma
    if (!cachedData || !cachedData.id) {
      const link = await prisma.link.findUnique({
        where: { shortCode: code },
        include: { rules: true },
      });

      // Check in exact order: !link OR !isActive OR (expiresAt < now) OR (maxClicks && clickCount >= maxClicks) -> 404
      if (!link) {
        return NextResponse.json({ error: 'Short link not found' }, { status: 404 });
      }

      if (!link.isActive) {
        return NextResponse.json({ error: 'Short link is inactive' }, { status: 404 });
      }

      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return NextResponse.json({ error: 'Short link has expired' }, { status: 404 });
      }

      if (link.maxClicks && link.clickCount >= link.maxClicks) {
        return NextResponse.json({ error: 'Short link click limit reached' }, { status: 404 });
      }

      // Password verification redirect
      if (link.passwordHash) {
        return NextResponse.redirect(new URL(`/verify/${code}`, request.url), 302);
      }

      // Parse splitDestinations from Json field safely
      let splitDestinations: CachedLinkData['splitDestinations'] = undefined;
      try {
        if (link.splitDestinations) {
          const raw = link.splitDestinations as unknown;
          if (Array.isArray(raw)) {
            splitDestinations = raw as CachedLinkData['splitDestinations'];
          }
        }
      } catch {
        splitDestinations = undefined;
      }

      cachedData = {
        id: link.id,
        originalUrl: link.originalUrl,
        isActive: link.isActive,
        expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
        passwordHash: link.passwordHash,
        rules: link.rules.map((r) => ({
          type: r.type,
          value: r.value,
          destinationUrl: r.destinationUrl,
        })),
        maxClicks: link.maxClicks,
        clickCount: link.clickCount,
        splitDestinations,
      };

      // Cache in Redis with 3600s expiration
      try {
        await redis.set(
          cacheKey,
          JSON.stringify(cachedData),
          'EX',
          3600
        );
      } catch (redisErr) {
        console.warn('Redis cache write failed:', redisErr);
      }
    }

    // 3. Smart Matching (both HIT and MISS)
    const userAgent = request.headers.get('user-agent') || '';
    const device = parseDevice(userAgent);
    const rawCountry =
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry') ||
      'UNKNOWN';
    const country = rawCountry.toUpperCase();
    const referrer = request.headers.get('referer') || request.headers.get('referrer') || 'Direct';

    // Priority: smart country/device rule > A/B split > originalUrl
    let finalDestination = resolveDestination(
      cachedData.originalUrl,
      cachedData.rules,
      country,
      device
    );

    // 4. A/B Split — only applies if smart rules did NOT pick a custom destination
    if (finalDestination === cachedData.originalUrl && cachedData.splitDestinations && cachedData.splitDestinations.length > 0) {
      const picked = pickSplitDestination(cachedData.splitDestinations);
      if (picked) {
        finalDestination = picked;
      }
    }

    // 5. Log Click & sync Redis count
    if (cachedData.id) {
      await logClickAndIncrement(cachedData.id, code, userAgent, country, referrer);
    }

    // 6. Return 302 Redirect
    return NextResponse.redirect(finalDestination, 302);
  } catch (error) {
    console.error('Error redirecting short link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
