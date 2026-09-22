import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getAuthUserId } from '@/lib/auth';
import { profileSchema } from '@/lib/validations';

export async function GET() {
  try {
    const userId = await getAuthUserId();
    const profile = await prisma.profile.findFirst({
      where: { userId },
    });

    const links = await prisma.link.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ profile, links });
  } catch (error) {
    console.error('Error fetching bio profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await req.json();

    const validation = profileSchema.safeParse(body);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      const errorMessage = firstIssue
        ? `${firstIssue.path.join('.') || 'field'}: ${firstIssue.message}`
        : 'Validation failed';
      return NextResponse.json(
        { error: errorMessage, details: validation.error.format() },
        { status: 400 }
      );
    }

    const { username, displayName, bio, avatarUrl, socialLinks } = validation.data;

    // Check unique across other userIds
    const existingWithUsername = await prisma.profile.findUnique({
      where: { username },
    });

    if (existingWithUsername && existingWithUsername.userId !== userId) {
      return NextResponse.json(
        { error: 'Username is already taken by another account' },
        { status: 409 }
      );
    }

    // Check if current user already has a profile
    const existingUserProfile = await prisma.profile.findFirst({
      where: { userId },
    });

    let profile;
    const jsonSocialLinks = socialLinks ? (socialLinks as Prisma.InputJsonValue) : Prisma.DbNull;

    if (existingUserProfile) {
      profile = await prisma.profile.update({
        where: { id: existingUserProfile.id },
        data: {
          username,
          displayName: displayName || null,
          bio: bio || null,
          avatarUrl: avatarUrl || null,
          socialLinks: jsonSocialLinks,
        },
      });
    } else {
      profile = await prisma.profile.create({
        data: {
          userId,
          username,
          displayName: displayName || null,
          bio: bio || null,
          avatarUrl: avatarUrl || null,
          socialLinks: jsonSocialLinks,
        },
      });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error saving bio profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
