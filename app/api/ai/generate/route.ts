import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { redis } from '@/lib/redis';

const bodySchema = z.object({
  type: z.enum(['alias', 'meta']),
  originalUrl: z.string().url('Invalid URL'),
  context: z.string().max(200).optional(),
});

// Fallback word lists for alias generation without API key
const ADJECTIVES = ['quick', 'neon', 'swift', 'bright', 'hyper', 'sleek', 'cool', 'smart', 'sharp', 'bold'];
const ANIMALS = ['tiger', 'fox', 'panda', 'wolf', 'eagle', 'shark', 'hawk', 'lynx', 'bear', 'raven'];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateFallbackAliases(): string[] {
  const used = new Set<string>();
  const result: string[] = [];
  while (result.length < 3) {
    const adj = ADJECTIVES[randomInt(0, ADJECTIVES.length - 1)];
    const animal = ANIMALS[randomInt(0, ANIMALS.length - 1)];
    const num = randomInt(10, 99);
    const alias = `${adj}-${animal}-${num}`;
    if (!used.has(alias)) {
      used.add(alias);
      result.push(alias);
    }
  }
  return result;
}

function getFallbackMeta(originalUrl: string): { title: string; description: string } {
  let hostname = 'link';
  try {
    hostname = new URL(originalUrl).hostname;
  } catch {
    // ignore
  }
  return {
    title: hostname,
    description: originalUrl.slice(0, 100),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const validation = bodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { type, originalUrl, context } = validation.data;

    // Rate limiting: 10 requests per IP per day
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const rateLimitKey = `ai:${ip}:${today}`;

    try {
      const count = await redis.incr(rateLimitKey);
      if (count === 1) {
        // Set expiry only on first increment so it resets at midnight-ish
        await redis.expire(rateLimitKey, 86400);
      }
      if (count > 10) {
        return NextResponse.json(
          { error: 'AI limit reached. Try again tomorrow.' },
          { status: 429 }
        );
      }
    } catch {
      // Redis unavailable – skip rate limit rather than fail
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback if no API key
    if (!apiKey || apiKey.trim() === '') {
      if (type === 'alias') {
        return NextResponse.json({ suggestions: generateFallbackAliases() });
      } else {
        return NextResponse.json({ ...getFallbackMeta(originalUrl) });
      }
    }

    // Call Gemini API
    try {
      let prompt: string;
      if (type === 'alias') {
        prompt = `Generate exactly 3 short, catchy URL aliases for this link: ${originalUrl}${context ? ` Context: ${context}` : ''}.
Requirements:
- Each alias must be 3-20 characters, lowercase letters, numbers, and hyphens only
- No spaces, no special chars except hyphens
- Make them memorable and relevant to the URL
Return ONLY a JSON array of 3 strings, nothing else. Example: ["quick-fox-42", "neon-tiger-99", "swift-panda-11"]`;
      } else {
        prompt = `Generate a title and short description for this URL: ${originalUrl}${context ? ` Context: ${context}` : ''}.
Return ONLY a JSON object with keys "title" (max 60 chars) and "description" (max 150 chars), nothing else.
Example: {"title": "Example Title", "description": "Short description of what this link is about."}`;
      }

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 256,
            },
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!geminiRes.ok) {
        throw new Error(`Gemini API error: ${geminiRes.status}`);
      }

      const data = await geminiRes.json();
      const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (type === 'alias') {
        // Extract JSON array from response
        const match = rawText.match(/\[[\s\S]*\]/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]) as unknown[];
            const suggestions = parsed
              .filter((s): s is string => typeof s === 'string')
              .slice(0, 3);
            if (suggestions.length > 0) {
              return NextResponse.json({ suggestions });
            }
          } catch {
            // fall through to fallback
          }
        }
        return NextResponse.json({ suggestions: generateFallbackAliases() });
      } else {
        // Extract JSON object from response
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]) as Record<string, unknown>;
            if (typeof parsed.title === 'string' && typeof parsed.description === 'string') {
              return NextResponse.json({
                title: parsed.title.slice(0, 100),
                description: parsed.description.slice(0, 200),
              });
            }
          } catch {
            // fall through to fallback
          }
        }
        return NextResponse.json(getFallbackMeta(originalUrl));
      }
    } catch {
      // Any Gemini error → graceful fallback
      if (type === 'alias') {
        return NextResponse.json({ suggestions: generateFallbackAliases() });
      } else {
        return NextResponse.json(getFallbackMeta(originalUrl));
      }
    }
  } catch {
    // Outer catch — never throw 500 from AI route
    return NextResponse.json(
      { suggestions: generateFallbackAliases(), error: 'Used fallback' },
      { status: 200 }
    );
  }
}
