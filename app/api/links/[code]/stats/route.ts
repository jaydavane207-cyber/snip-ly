import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  return arr.reduce(
    (acc, item) => {
      const k = key(item) || 'Unknown';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}

function toNameValue(obj: Record<string, number>): { name: string; value: number }[] {
  return Object.entries(obj)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

export async function GET(
  _req: NextRequest,
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
      include: { clicks: true },
    });

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const clicks = link.clicks;

    // Last 7 days
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dateStr = d.toDateString();
      const count = clicks.filter(
        (c) => new Date(c.createdAt).toDateString() === dateStr
      ).length;
      days.push({ date: label, count });
    }

    const byCountry = toNameValue(groupBy(clicks, (c) => c.country ?? 'Unknown'));
    const byBrowser = toNameValue(groupBy(clicks, (c) => c.browser ?? 'Unknown'));
    const byDevice = toNameValue(groupBy(clicks, (c) => c.device ?? 'Unknown'));

    return NextResponse.json({
      shortCode: link.shortCode,
      originalUrl: link.originalUrl,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      totalClicks: clicks.length,
      clicksLast7Days: days,
      byCountry,
      byBrowser,
      byDevice,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
