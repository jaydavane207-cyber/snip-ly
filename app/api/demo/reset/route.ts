import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { delPattern } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // 1. Guard check: only allow localhost / 127.0.0.1, explicitly block cloud databases
    const dbUrl = process.env.DATABASE_URL || '';
    if (!dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
      return NextResponse.json(
        { error: 'Demo reset is only allowed in local development environment' },
        { status: 403 }
      );
    }
    if (dbUrl.includes('neon.tech') || dbUrl.includes('supabase.co')) {
      return NextResponse.json(
        { error: 'Demo reset is disabled for cloud databases' },
        { status: 403 }
      );
    }

    // 2. Delete links where shortCode startsWith demo-
    await prisma.link.deleteMany({
      where: {
        shortCode: {
          startsWith: 'demo-',
        },
      },
    });

    // Also clean up demo profile
    await prisma.profile.deleteMany({
      where: {
        userId: 'demo-user',
      },
    });

    // 3. Clear Redis cache matching demo prefix
    await delPattern('short:demo-*');

    return NextResponse.json({
      success: true,
      message: 'Demo state and cached keys cleared successfully',
    });
  } catch (error) {
    console.error('Error resetting demo state:', error);
    return NextResponse.json(
      { error: 'Failed to reset demo state', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
