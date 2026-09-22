import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import { updateLinkSchema } from '@/lib/validations';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> | { code: string } }
) {
  try {
    const resolvedParams = await params;
    const { code } = resolvedParams;

    if (!code) {
      return NextResponse.json({ error: 'Short code is required' }, { status: 400 });
    }

    const existing = await prisma.link.findUnique({
      where: { shortCode: code },
      include: { rules: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const body = await req.json();
    const validation = updateLinkSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.originalUrl !== undefined) updateData.originalUrl = data.originalUrl;
    if (data.folder !== undefined) updateData.folder = data.folder;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.isFavorite !== undefined) updateData.isFavorite = data.isFavorite;
    if (data.showOnBio !== undefined) updateData.showOnBio = data.showOnBio;
    if (data.bioTitle !== undefined) updateData.bioTitle = data.bioTitle;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.maxClicks !== undefined) updateData.maxClicks = data.maxClicks;

    if (data.password !== undefined) {
      if (data.password === null || data.password.trim() === '') {
        updateData.passwordHash = null;
      } else {
        updateData.passwordHash = crypto
          .createHash('sha256')
          .update(data.password.trim())
          .digest('hex');
      }
    }

    // If rules are provided, replace them
    if (data.rules !== undefined) {
      await prisma.linkRule.deleteMany({ where: { linkId: existing.id } });
      if (data.rules.length > 0) {
        updateData.rules = {
          create: data.rules.map((r) => ({
            type: r.type,
            value: r.value,
            destinationUrl: r.destinationUrl,
          })),
        };
      }
    }

    const updated = await prisma.link.update({
      where: { shortCode: code },
      data: updateData,
      include: { rules: true },
    });

    // Invalidate Redis cache
    try {
      await redis.del(`short:${code}`);
    } catch (redisErr) {
      console.warn('Redis cache invalidation failed:', redisErr);
    }

    return NextResponse.json({ success: true, link: updated });
  } catch (error) {
    console.error('Error updating link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> | { code: string } }
) {
  try {
    const resolvedParams = await params;
    const { code } = resolvedParams;

    if (!code) {
      return NextResponse.json({ error: 'Short code is required' }, { status: 400 });
    }

    const existing = await prisma.link.findUnique({ where: { shortCode: code } });
    if (!existing) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    await prisma.link.delete({ where: { shortCode: code } });

    // Invalidate Redis cache
    try {
      await redis.del(`short:${code}`);
    } catch (redisErr) {
      console.warn('Redis cache invalidation failed:', redisErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting link:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
