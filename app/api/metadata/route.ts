import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isPrivateOrLocalhost, decodeHtmlEntities } from '@/lib/validations';

const urlSchema = z.string().url('Invalid URL');

export async function GET(req: NextRequest) {
  const targetUrl = req.nextUrl.searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  const validation = urlSchema.safeParse(targetUrl);
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(validation.data);
  } catch {
    return NextResponse.json({ error: 'Unable to parse URL' }, { status: 400 });
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return NextResponse.json({ error: 'Only HTTP and HTTPS protocols are allowed' }, { status: 400 });
  }

  const fallbackTitle = parsedUrl.hostname;
  const fallbackFavicon = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;

  // SSRF prevention: block private and local addresses
  if (isPrivateOrLocalhost(parsedUrl.hostname)) {
    return NextResponse.json({ error: 'Access to private or local network is prohibited' }, { status: 403 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json({ title: fallbackTitle, favicon: fallbackFavicon });
    }

    const html = await res.text();

    // Extract page title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : fallbackTitle;

    // Extract favicon
    let favicon = fallbackFavicon;
    const iconMatch =
      html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ||
      html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);

    if (iconMatch && iconMatch[1]) {
      const href = iconMatch[1].trim();
      try {
        const resolved = new URL(href, parsedUrl.origin).toString();
        // Only accept HTTP/HTTPS favicons; reject data: or blob: URIs that break schema validation
        if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
          favicon = resolved;
        } else {
          favicon = fallbackFavicon;
        }
      } catch {
        favicon = fallbackFavicon;
      }
    }

    return NextResponse.json({ title, favicon });
  } catch {
    clearTimeout(timeoutId);
    return NextResponse.json({ title: fallbackTitle, favicon: fallbackFavicon });
  }
}
