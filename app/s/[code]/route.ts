import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';

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

    // 1. Check Redis Cache
    try {
      const cachedUrl = await redis.get(cacheKey);
      if (cachedUrl) {
        return NextResponse.redirect(cachedUrl, 302);
      }
    } catch (redisErr) {
      console.warn('Redis read failed, querying database:', redisErr);
    }

    // 2. Cache MISS: Query PostgreSQL via Prisma
    const link = await prisma.link.findUnique({
      where: { shortCode: code },
    });

    // If not found, return 404
    if (!link) {
      return NextResponse.json({ error: 'Short link not found' }, { status: 404 });
    }

    // If expired, return 404
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Short link has expired' }, { status: 404 });
    }

    // 3. Save to Redis with 3600s (1h) expiration
    try {
      await redis.set(cacheKey, link.originalUrl, 'EX', 3600);
    } catch (redisErr) {
      console.warn('Redis cache write failed:', redisErr);
    }

    // 4. Return 302 redirect
    return NextResponse.redirect(link.originalUrl, 302);
  } catch (error) {
    console.error('Error redirecting short link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
