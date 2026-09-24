import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { createLinkSchema, calculateExpiresAt } from '@/lib/validations';
import { nanoid } from 'nanoid';

async function validateApiKey(req: NextRequest): Promise<string | null> {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey || !apiKey.startsWith('snip_')) return null;

  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');

  try {
    const keyRecord = await prisma.apiKey.findUnique({
      where: { keyHash: hash },
      select: { id: true, userId: true },
    });

    if (!keyRecord) return null;

    // Update lastUsedAt async without blocking
    void prisma.apiKey
      .update({
        where: { id: keyRecord.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    return keyRecord.userId;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = await validateApiKey(req);
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }
  return NextResponse.json({ message: 'Valid API key' }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const userId = await validateApiKey(req);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
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
      const existing = await prisma.link.findUnique({ where: { shortCode: customAlias } });
      if (existing) {
        return NextResponse.json({ error: 'Custom alias is already in use' }, { status: 409 });
      }
      shortCode = customAlias;
    } else {
      let isUnique = false;
      let generatedCode = '';
      while (!isUnique) {
        generatedCode = nanoid(7);
        const existing = await prisma.link.findUnique({ where: { shortCode: generatedCode } });
        if (!existing) isUnique = true;
      }
      shortCode = generatedCode;
    }

    const expiresAt = calculateExpiresAt(expiresIn);

    let finalOriginalUrl = originalUrl;
    try {
      const u = new URL(originalUrl);
      if (utmSource?.trim()) u.searchParams.set('utm_source', utmSource.trim());
      if (utmMedium?.trim()) u.searchParams.set('utm_medium', utmMedium.trim());
      if (utmCampaign?.trim()) u.searchParams.set('utm_campaign', utmCampaign.trim());
      finalOriginalUrl = u.toString();
    } catch {
      finalOriginalUrl = originalUrl;
    }

    let finalTitle = title?.trim() || null;
    let finalFavicon: string | null = null;
    try {
      const parsed = new URL(originalUrl);
      if (!finalTitle) finalTitle = parsed.hostname;
      finalFavicon = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
    } catch {
      // ignore
    }

    const passwordHash =
      password && password.trim() !== ''
        ? crypto.createHash('sha256').update(password.trim()).digest('hex')
        : null;

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
        splitDestinations: splitDestinations && splitDestinations.length > 0 ? splitDestinations : undefined,
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
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    return NextResponse.json(
      {
        id: link.id,
        shortCode: link.shortCode,
        shortUrl: `${baseUrl}/s/${link.shortCode}`,
        originalUrl: link.originalUrl,
        title: link.title,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in v1/shorten:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
