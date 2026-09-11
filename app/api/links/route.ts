import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/db';

const createLinkSchema = z.object({
  originalUrl: z.string().url('Invalid URL format'),
  customAlias: z
    .string()
    .regex(
      /^[a-zA-Z0-9-_]{3,20}$/,
      'Custom alias must be 3-20 characters long and contain only letters, numbers, hyphens, or underscores'
    )
    .optional()
    .or(z.literal('')),
  expiresIn: z.enum(['1h', '24h', '7d', 'never']).default('never').optional(),
});

function calculateExpiresAt(expiresIn?: '1h' | '24h' | '7d' | 'never'): Date | null {
  if (!expiresIn || expiresIn === 'never') return null;

  const now = new Date();
  switch (expiresIn) {
    case '1h':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    default:
      return null;
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

    const { originalUrl, customAlias, expiresIn } = validation.data;

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
      // Generate a 7-character nanoid ensuring uniqueness
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

    const link = await prisma.link.create({
      data: {
        originalUrl,
        shortCode,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    return NextResponse.json(
      {
        shortCode: link.shortCode,
        shortUrl: `${baseUrl}/s/${link.shortCode}`,
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
