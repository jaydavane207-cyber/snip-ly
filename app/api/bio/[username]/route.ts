import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> | { username: string } }
) {
  try {
    const resolvedParams = await params;
    const rawUsername = resolvedParams?.username;

    if (!rawUsername) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const username = rawUsername.toLowerCase().trim();

    const profile = await prisma.profile.findUnique({
      where: { username },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Return only links where showOnBio=true AND isActive=true
    const links = await prisma.link.findMany({
      where: {
        userId: profile.userId,
        showOnBio: true,
        isActive: true,
      },
      select: {
        id: true,
        shortCode: true,
        title: true,
        bioTitle: true,
        faviconUrl: true,
        originalUrl: true,
        clickCount: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ profile, links });
  } catch (error) {
    console.error('Error fetching public bio profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
