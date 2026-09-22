import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import { resolveDestination, parseDevice, logClickAndIncrement, type CachedLinkData } from '@/lib/routing';

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

    // 1. Check Redis Cache (JSON format)
    try {
      const cachedStr = await redis.get(cacheKey);
      if (cachedStr) {
        if (cachedStr.startsWith('{')) {
          cachedData = JSON.parse(cachedStr) as CachedLinkData;
        } else {
          // Backward compatibility for legacy string caches
          cachedData = {
            id: '',
            originalUrl: cachedStr,
            isActive: true,
            expiresAt: null,
            passwordHash: null,
            rules: [],
          };
        }
      }
    } catch (redisErr) {
      console.warn('Redis cache read failed, querying database:', redisErr);
    }

    // Check conditions on Cache HIT
    if (cachedData && cachedData.id) {
      if (!cachedData.isActive) {
        return NextResponse.json({ error: 'Short link is inactive' }, { status: 404 });
      }
      if (cachedData.expiresAt && new Date(cachedData.expiresAt) < new Date()) {
        return NextResponse.json({ error: 'Short link has expired' }, { status: 404 });
      }
      if (
        cachedData.maxClicks &&
        typeof cachedData.clickCount === 'number' &&
        cachedData.clickCount >= cachedData.maxClicks
      ) {
        return NextResponse.json({ error: 'Short link click limit reached' }, { status: 404 });
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
      };

      // Cache in Redis with 3600s expiration
      try {
        await redis.set(
          cacheKey,
          JSON.stringify({
            id: link.id,
            originalUrl: link.originalUrl,
            isActive: link.isActive,
            expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
            passwordHash: link.passwordHash,
            rules: cachedData.rules,
            maxClicks: link.maxClicks,
            clickCount: link.clickCount,
          }),
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

    const finalDestination = resolveDestination(
      cachedData.originalUrl,
      cachedData.rules,
      country,
      device
    );

    // 4. Log Click & sync Redis count
    if (cachedData.id) {
      await logClickAndIncrement(cachedData.id, code, userAgent, country, referrer);
    }

    // 5. Return 302 Redirect
    return NextResponse.redirect(finalDestination, 302);
  } catch (error) {
    console.error('Error redirecting short link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
