import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';

const createWebhookSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  event: z.string().max(50).default('milestone'),
});

export async function GET() {
  try {
    const userId = await getAuthUserId();

    const webhooks = await prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ webhooks });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await req.json();
    const validation = createWebhookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { url, event } = validation.data;
    const secret = nanoid(16);

    const webhook = await prisma.webhook.create({
      data: {
        userId,
        url,
        event,
        secret,
        isActive: true,
      },
    });

    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
