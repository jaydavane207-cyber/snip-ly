import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import { getAuthUserId } from '@/lib/auth';
import { createLinkSchema, calculateExpiresAt } from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const search = searchParams.get('search')?.trim() || '';
    const folder = searchParams.get('folder')?.trim() || '';
    const tag = searchParams.get('tag')?.trim() || '';
    const isFavorite = searchParams.get('favorite') ?? searchParams.get('isFavorite');
    const showOnBio = searchParams.get('showOnBio');
    const campaign = searchParams.get('campaign')?.trim() || '';
    const mine = searchParams.get('mine');

    // Build Prisma where conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (mine === 'true') {
      const userId = await getAuthUserId();
      where.userId = userId;
    }

    if (search) {
      where.OR = [
        { originalUrl: { contains: search, mode: 'insensitive' } },
        { shortCode: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
        { utmCampaign: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (folder && folder !== 'all') {
      where.folder = folder;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (campaign) {
      where.utmCampaign = { contains: campaign, mode: 'insensitive' };
    }

    if (isFavorite === 'true') {
      where.isFavorite = true;
    } else if (isFavorite === 'false') {
      where.isFavorite = false;
    }

    if (showOnBio === 'true') {
      where.showOnBio = true;
    } else if (showOnBio === 'false') {
      where.showOnBio = false;
    }

    const links = await prisma.link.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        rules: true,
        _count: { select: { clicks: true } },
      },
    });

    return NextResponse.json({ links });
  } catch (error) {
    console.error('Error fetching links:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 requests per IP per 60 seconds
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitKey = `ratelimit:${ip}`;

    try {
      const count = await redis.incr(rateLimitKey);
      if (count === 1) {
        await redis.expire(rateLimitKey, 60);
      }
      if (count > 10) {
        return NextResponse.json(
          { error: 'Too many requests' },
          {
            status: 429,
            headers: {
              'Retry-After': '60',
              'X-RateLimit-Limit': '10',
            },
          }
        );
      }
    } catch (redisErr) {
      console.warn('Redis rate limit check failed:', redisErr);
    }

    const body = await req.json();
    const validation = createLinkSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const {
      originalUrl,
      customAlias,
      expiresIn,
      title,
      faviconUrl,
      description,
      folder,
      tags,
      isFavorite,
      showOnBio,
      bioTitle,
      password,
      maxClicks,
      rules,
      utmSource,
      utmMedium,
      utmCampaign,
      splitDestinations,
    } = validation.data;

    let shortCode: string;

    if (customAlias && customAlias.trim() !== '') {
      const existing = await prisma.link.findUnique({
        where: { shortCode: customAlias },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Custom alias is already in use' },
          { status: 409 }
        );
      }
      shortCode = customAlias;
    } else {
      let isUnique = false;
      let generatedCode = '';
      while (!isUnique) {
        generatedCode = nanoid(7);
        const existing = await prisma.link.findUnique({
          where: { shortCode: generatedCode },
        });
        if (!existing) {
          isUnique = true;
        }
      }
      shortCode = generatedCode;
    }

    const expiresAt = calculateExpiresAt(expiresIn);
    const userId = await getAuthUserId();

    // Append UTM params to the originalUrl before saving
    let finalOriginalUrl = originalUrl;
    try {
      const u = new URL(originalUrl);
      if (utmSource && utmSource.trim()) u.searchParams.set('utm_source', utmSource.trim());
      if (utmMedium && utmMedium.trim()) u.searchParams.set('utm_medium', utmMedium.trim());
      if (utmCampaign && utmCampaign.trim()) u.searchParams.set('utm_campaign', utmCampaign.trim());
      finalOriginalUrl = u.toString();
    } catch {
      // Invalid URL – keep original without UTM (should never happen after zod validation)
      finalOriginalUrl = originalUrl;
    }

    // Default title & favicon if not explicitly provided
    let finalTitle = title?.trim() || null;
    let finalFavicon = faviconUrl?.trim() || null;

    try {
      const parsed = new URL(originalUrl);
      if (!finalTitle) {
        finalTitle = parsed.hostname;
      }
      if (!finalFavicon) {
        finalFavicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
      }
    } catch {
      // Ignore URL parsing errors for fallback
    }

    const passwordHash =
      password && password.trim() !== ''
        ? await bcrypt.hash(password.trim(), 10)
        : null;

    const splitDest =
      splitDestinations && splitDestinations.length > 0
        ? splitDestinations
        : undefined;

    const link = await prisma.link.create({
      data: {
        originalUrl: finalOriginalUrl,
        shortCode,
        expiresAt,
        userId,
        title: finalTitle,
        faviconUrl: finalFavicon,
        description: description?.trim() || null,
        folder: folder || 'General',
        tags: tags || [],
        isFavorite: isFavorite || false,
        showOnBio: showOnBio || false,
        bioTitle: bioTitle?.trim() || null,
        passwordHash,
        maxClicks: maxClicks || null,
        utmSource: utmSource?.trim() || null,
        utmMedium: utmMedium?.trim() || null,
        utmCampaign: utmCampaign?.trim() || null,
        splitDestinations: splitDest ?? undefined,
        rules:
          rules && rules.length > 0
            ? {
                create: rules.map((r) => ({
                  type: r.type,
                  value: r.value,
                  destinationUrl: r.destinationUrl,
                })),
              }
            : undefined,
      },
      include: {
        rules: true,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    return NextResponse.json(
      {
        id: link.id,
        shortCode: link.shortCode,
        shortUrl: `${baseUrl}/s/${link.shortCode}`,
        originalUrl: link.originalUrl,
        title: link.title,
        faviconUrl: link.faviconUrl,
        description: link.description,
        folder: link.folder,
        tags: link.tags,
        isFavorite: link.isFavorite,
        showOnBio: link.showOnBio,
        utmCampaign: link.utmCampaign,
        rules: link.rules,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error creating link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
