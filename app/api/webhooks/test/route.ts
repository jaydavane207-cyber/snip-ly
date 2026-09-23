import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const testSchema = z.object({
  url: z.string().url('Invalid URL'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const validation = testSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Valid webhook URL required' },
        { status: 400 }
      );
    }

    const { url } = validation.data;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'test',
          message: 'hello from snip.ly',
          timestamp: new Date().toISOString(),
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok || (res.status >= 200 && res.status < 300)) {
        return NextResponse.json({ success: true, status: res.status });
      } else {
        return NextResponse.json(
          { success: false, status: res.status, error: `Server returned ${res.status}` },
          { status: 200 }
        );
      }
    } catch (fetchErr) {
      clearTimeout(timer);
      const msg = fetchErr instanceof Error ? fetchErr.message : 'Fetch failed';
      return NextResponse.json({ success: false, error: msg }, { status: 200 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
