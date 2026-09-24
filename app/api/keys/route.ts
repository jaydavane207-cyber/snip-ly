import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';

// Generate a secure API key: snip_ + 32 random chars
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = `snip_${nanoid(32)}`;
  const prefix = raw.slice(0, 12); // "snip_XXXXXXX"
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { key: raw, prefix, hash };
}

export async function GET() {
  try {
    const userId = await getAuthUserId();

    const keys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await req.json().catch(() => ({}));
    const name = (body.name as string)?.trim() || 'My API Key';

    const { key, prefix, hash } = generateApiKey();

    await prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash: hash,
        keyPrefix: prefix,
      },
    });

    // Return raw key ONCE — never stored in plaintext
    return NextResponse.json({ key, prefix, name }, { status: 200 });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
