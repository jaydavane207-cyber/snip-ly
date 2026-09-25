import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { delPattern } from '@/lib/redis';
import { DEMO_LINKS } from '@/lib/demoData';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // 1. Guard check: only allow localhost / 127.0.0.1, explicitly block cloud databases
    const dbUrl = process.env.DATABASE_URL || '';
    if (process.env.NODE_ENV === 'production' || (!dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1'))) {
      return NextResponse.json(
        { error: 'Demo seeding is only allowed in local development environment' },
        { status: 403 }
      );
    }
    if (dbUrl.includes('neon.tech') || dbUrl.includes('supabase.co') || dbUrl.includes('upstash')) {
      return NextResponse.json(
        { error: 'Demo seeding is disabled for cloud databases' },
        { status: 403 }
      );
    }

    // 2. Del redis pattern via SCAN helper
    await delPattern('short:demo-*');

    // 3 & 4. Process each demo link
    for (const demo of DEMO_LINKS) {
      let finalUrl = demo.originalUrl;
      let hostname = 'github.com';

      try {
        const parsed = new URL(demo.originalUrl);
        hostname = parsed.hostname;
        if (demo.utmSource) parsed.searchParams.set('utm_source', demo.utmSource);
        if (demo.utmMedium) parsed.searchParams.set('utm_medium', demo.utmMedium);
        if (demo.utmCampaign) parsed.searchParams.set('utm_campaign', demo.utmCampaign);
        finalUrl = parsed.toString();
      } catch {
        // Fallback to originalUrl if URL parsing fails
      }

      let passwordHash: string | null = null;
      if (demo.password) {
        passwordHash = await bcrypt.hash(demo.password, 10);
      }

      const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;

      const link = await prisma.link.upsert({
        where: { shortCode: demo.shortCode },
        update: {
          originalUrl: finalUrl,
          title: demo.title,
          folder: demo.folder,
          tags: demo.tags,
          showOnBio: demo.showOnBio,
          bioTitle: demo.bioTitle,
          utmSource: demo.utmSource,
          utmMedium: demo.utmMedium,
          utmCampaign: demo.utmCampaign,
          splitDestinations: demo.splitDestinations ? (demo.splitDestinations as unknown as object) : undefined,
          passwordHash,
          faviconUrl,
          isActive: true,
        },
        create: {
          shortCode: demo.shortCode,
          originalUrl: finalUrl,
          userId: 'demo-user',
          title: demo.title,
          folder: demo.folder,
          tags: demo.tags,
          showOnBio: demo.showOnBio,
          bioTitle: demo.bioTitle,
          utmSource: demo.utmSource,
          utmMedium: demo.utmMedium,
          utmCampaign: demo.utmCampaign,
          splitDestinations: demo.splitDestinations ? (demo.splitDestinations as unknown as object) : undefined,
          passwordHash,
          faviconUrl,
          isActive: true,
        },
      });

      // 5. Clean up old rules & re-insert if rules exist
      await prisma.linkRule.deleteMany({ where: { linkId: link.id } });
      if (demo.rules && demo.rules.length > 0) {
        await prisma.linkRule.createMany({
          data: demo.rules.map((r) => ({
            linkId: link.id,
            type: r.type,
            value: r.value,
            destinationUrl: r.destinationUrl,
          })),
        });
      }

      // 6. For demo-normal: delete previous clicks then create 50 realistic clicks
      if (demo.shortCode === 'demo-normal') {
        await prisma.click.deleteMany({ where: { linkId: link.id } });

        const countries = ['IN', 'US', 'UK', 'DE'];
        const devices = ['mobile', 'desktop'];
        const browsers = ['Chrome', 'Safari', 'Firefox'];
        const referrers = ['google', 'twitter', 'direct'];

        const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
        const clickList: Array<{
          linkId: string;
          country: string;
          device: string;
          browser: string;
          referrer: string;
          createdAt: Date;
        }> = [];

        const now = Date.now();

        // 35 clicks spread over the last 7 days (65 minutes to 7 days ago)
        for (let i = 0; i < 35; i++) {
          const minOffset = 65 * 60 * 1000;
          const maxOffset = 7 * 24 * 60 * 60 * 1000;
          const offset = Math.floor(Math.random() * (maxOffset - minOffset)) + minOffset;
          clickList.push({
            linkId: link.id,
            country: pick(countries),
            device: pick(devices),
            browser: pick(browsers),
            referrer: pick(referrers),
            createdAt: new Date(now - offset),
          });
        }

        // 10 clicks in the last 60 minutes (6 to 59 minutes ago)
        for (let i = 0; i < 10; i++) {
          const minOffset = 6 * 60 * 1000;
          const maxOffset = 59 * 60 * 1000;
          const offset = Math.floor(Math.random() * (maxOffset - minOffset)) + minOffset;
          clickList.push({
            linkId: link.id,
            country: pick(countries),
            device: pick(devices),
            browser: pick(browsers),
            referrer: pick(referrers),
            createdAt: new Date(now - offset),
          });
        }

        // 5 clicks in the last 5 minutes (10 seconds to 4.5 minutes ago) for LIVE status
        for (let i = 0; i < 5; i++) {
          const minOffset = 10 * 1000;
          const maxOffset = 270 * 1000;
          const offset = Math.floor(Math.random() * (maxOffset - minOffset)) + minOffset;
          clickList.push({
            linkId: link.id,
            country: pick(countries),
            device: pick(devices),
            browser: pick(browsers),
            referrer: pick(referrers),
            createdAt: new Date(now - offset),
          });
        }

        await prisma.click.createMany({ data: clickList });
        await prisma.link.update({
          where: { id: link.id },
          data: { clickCount: 50 },
        });
      }
    }

    // 7. Profile setup: avoid P2002 by deleting existing demo username not owned by demo-user
    await prisma.profile.deleteMany({
      where: {
        username: 'demo',
        NOT: { userId: 'demo-user' },
      },
    });

    await prisma.profile.upsert({
      where: { userId: 'demo-user' },
      update: {
        username: 'demo',
        displayName: 'Snip.ly Demo Hub',
        bio: 'Explore real-world URL shortener demos with geo-targeting, A/B testing, and security controls.',
        theme: 'indigo',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        socialLinks: {
          twitter: 'https://twitter.com',
          github: 'https://github.com/jaydavane207-cyber/url-shortener',
          website: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
        },
      },
      create: {
        userId: 'demo-user',
        username: 'demo',
        displayName: 'Snip.ly Demo Hub',
        bio: 'Explore real-world URL shortener demos with geo-targeting, A/B testing, and security controls.',
        theme: 'indigo',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        socialLinks: {
          twitter: 'https://twitter.com',
          github: 'https://github.com/jaydavane207-cyber/url-shortener',
          website: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
        },
      },
    });

    // 8. Explicitly ensure 3 links are marked showOnBio: true
    await prisma.link.updateMany({
      where: {
        shortCode: { in: ['demo-normal', 'demo-smart', 'demo-ab'] },
      },
      data: {
        showOnBio: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Demo links and realistic analytics seeded successfully',
    });
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return NextResponse.json(
      { error: 'Failed to seed demo data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
