import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { createLinkSchema, calculateExpiresAt } from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const search = searchParams.get('search')?.trim() || '';
    const folder = searchParams.get('folder')?.trim() || '';
    const tag = searchParams.get('tag')?.trim() || '';
    const isFavorite = searchParams.get('isFavorite');
    const showOnBio = searchParams.get('showOnBio');

    // Build Prisma where conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      where.OR = [
        { originalUrl: { contains: search, mode: 'insensitive' } },
        { shortCode: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    if (folder && folder !== 'all') {
      where.folder = folder;
    }

    if (tag) {
      where.tags = { has: tag };
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
      take: 100,
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
      folder,
      tags,
      isFavorite,
      showOnBio,
      bioTitle,
      password,
      maxClicks,
      rules,
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
        ? crypto.createHash('sha256').update(password.trim()).digest('hex')
        : null;

    const link = await prisma.link.create({
      data: {
        originalUrl,
        shortCode,
        expiresAt,
        userId,
        title: finalTitle,
        faviconUrl: finalFavicon,
        folder: folder || 'General',
        tags: tags || [],
        isFavorite: isFavorite || false,
        showOnBio: showOnBio || false,
        bioTitle: bioTitle?.trim() || null,
        passwordHash,
        maxClicks: maxClicks || null,
        rules: rules && rules.length > 0
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
        folder: link.folder,
        tags: link.tags,
        isFavorite: link.isFavorite,
        showOnBio: link.showOnBio,
        rules: link.rules,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
