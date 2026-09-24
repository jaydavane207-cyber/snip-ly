import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
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
      select: { id: true },
    });

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // Fetch all clicks for this link with CSV-relevant fields
    const clicks = await prisma.click.findMany({
      where: { linkId: link.id },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        country: true,
        device: true,
        browser: true,
        os: true,
        referrer: true,
      },
    });

    // Build CSV
    const header = 'timestamp,country,device,browser,os,referrer\n';
    const rows = clicks
      .map((c) =>
        [
          c.createdAt.toISOString(),
          c.country ?? '',
          c.device ?? '',
          c.browser ?? '',
          c.os ?? '',
          c.referrer ? `"${c.referrer.replace(/"/g, '""')}"` : '',
        ].join(',')
      )
      .join('\n');

    const csv = header + rows;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="clicks-${code}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting clicks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
