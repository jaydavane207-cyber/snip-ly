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
      select: {
        id: true,
        shortCode: true,
        originalUrl: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const linkId = link.id;
    const now = new Date();
    const ago60min = new Date(now.getTime() - 60 * 60 * 1000);
    const ago5min = new Date(now.getTime() - 5 * 60 * 1000);
    const ago7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel — all scoped to linkId to prevent cross-link leakage
    const [
      totalClicks,
      clicksLast60Min,
      onlineEstimate,
      recentClicksRaw,
      last7DaysClicks,
      allClicksForGroups,
    ] = await Promise.all([
      // Total clicks for this link
      prisma.click.count({
        where: { linkId },
      }),
      // Clicks in the last 60 minutes
      prisma.click.count({
        where: { linkId, createdAt: { gte: ago60min } },
      }),
      // Online estimate: clicks in last 5 minutes
      prisma.click.count({
        where: { linkId, createdAt: { gte: ago5min } },
      }),
      // 15 most recent clicks for live feed
      prisma.click.findMany({
        where: { linkId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: {
          id: true,
          country: true,
          device: true,
          browser: true,
          createdAt: true,
        },
      }),
      // Clicks per day for last 7 days
      prisma.click.findMany({
        where: { linkId, createdAt: { gte: ago7days } },
        select: { createdAt: true },
      }),
      // All clicks for country/browser/device grouping (select only needed fields)
      prisma.click.findMany({
        where: { linkId },
        select: { country: true, browser: true, device: true },
      }),
    ]);

    // Build last 7 days chart data
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dateStr = d.toDateString();
      const count = last7DaysClicks.filter(
        (c) => new Date(c.createdAt).toDateString() === dateStr
      ).length;
      days.push({ date: label, count });
    }

    const byCountry = toNameValue(groupBy(allClicksForGroups, (c) => c.country ?? 'Unknown'));
    const byBrowser = toNameValue(groupBy(allClicksForGroups, (c) => c.browser ?? 'Unknown'));
    const byDevice = toNameValue(groupBy(allClicksForGroups, (c) => c.device ?? 'Unknown'));

    const recentClicks = recentClicksRaw.map((c) => ({
      id: c.id,
      country: c.country,
      device: c.device,
      browser: c.browser,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({
      // Existing fields — preserved for backward compatibility
      shortCode: link.shortCode,
      originalUrl: link.originalUrl,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      totalClicks,
      clicksLast7Days: days,
      byCountry,
      byBrowser,
      byDevice,
      // New live analytics fields
      clicksLast60Min,
      onlineEstimate,
      recentClicks,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
