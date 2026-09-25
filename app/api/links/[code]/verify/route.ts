import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { resolveDestination, parseDevice, logClickAndIncrement } from '@/lib/routing';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> | { code: string } }
) {
  try {
    const resolvedParams = await params;
    const { code } = resolvedParams;

    if (!code) {
      return NextResponse.json({ error: 'Short code is required' }, { status: 400 });
    }

    const link = await prisma.link.findUnique({
      where: { shortCode: code },
      include: { rules: true },
    });

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

    let password = '';
    try {
      const body = await req.json();
      password = body.password || '';
    } catch {
      // Body might be empty
    }

    if (link.passwordHash) {
      let isValid = false;
      try {
        if (link.passwordHash.startsWith('$2a$') || link.passwordHash.startsWith('$2b$')) {
          isValid = await bcrypt.compare(password, link.passwordHash);
        } else {
          const hashedInput = crypto.createHash('sha256').update(password).digest('hex');
          isValid = hashedInput === link.passwordHash;
        }
      } catch {
        isValid = false;
      }

      if (!isValid) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
      }
    }

    // Resolve targeting rules (country / device)
    const userAgent = req.headers.get('user-agent') || '';
    const rawCountry =
      req.headers.get('x-vercel-ip-country') ||
      req.headers.get('cf-ipcountry') ||
      'UNKNOWN';
    const country = rawCountry.toUpperCase();
    const device = parseDevice(userAgent);
    const referrer = req.headers.get('referer') || req.headers.get('referrer') || 'Direct';

    const destinationUrl = resolveDestination(
      link.originalUrl,
      link.rules,
      country,
      device
    );

    // Record verified click & sync Redis count
    await logClickAndIncrement(link.id, link.shortCode, userAgent, country, referrer);

    return NextResponse.json({ success: true, destinationUrl, originalUrl: destinationUrl });
  } catch (error) {
    console.error('Error verifying link password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
