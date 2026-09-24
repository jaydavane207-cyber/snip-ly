import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { redis } from '@/lib/redis';
import { triggerWebhook } from '@/lib/webhook';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

let testCounter = 1;
function getUniqueIp(): string {
  return `192.168.1.${testCounter++}`;
}

let aliasCounter = 1;
function getUniqueCode(tag = 't'): string {
  const cleanTag = tag.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4);
  const id = (aliasCounter++).toString(36);
  const rnd = Math.random().toString(36).substring(2, 6);
  const ts = Date.now().toString(36).slice(-4);
  return `test-${cleanTag}${ts}${id}${rnd}`.slice(0, 20);
}

async function waitForStats(
  code: string,
  expectedMin: number,
  maxRetries = 5,
  delayMs = 1000
): Promise<{ totalClicks: number; clicksLast60Min: number; recentClicks: unknown[] }> {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(`${BASE_URL}/api/links/${code}/stats`);
    if (res.ok) {
      const data = await res.json();
      if (data.totalClicks >= expectedMin) {
        return data;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  const fallback = await fetch(`${BASE_URL}/api/links/${code}/stats`);
  return fallback.ok ? fallback.json() : { totalClicks: 0, clicksLast60Min: 0, recentClicks: [] };
}

describe('API Integration Tests (http://localhost:3000)', () => {
  beforeAll(async () => {
    // 1. Health check poll against server
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`${BASE_URL}/`);
        if (res.status === 200) {
          ready = true;
          break;
        }
      } catch {
        // Retry
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!ready) {
      throw new Error(`Server at ${BASE_URL} not ready within 30s`);
    }

    // 2. Clean up ratelimit:* and ai:* keys via scan + del
    try {
      const keysToClean: string[] = [];
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'ratelimit:*', 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length) keysToClean.push(...keys);
      } while (cursor !== '0');

      cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'ai:*', 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length) keysToClean.push(...keys);
      } while (cursor !== '0');

      if (keysToClean.length > 0) {
        await redis.del(...keysToClean);
      }
    } catch (e) {
      console.warn('Redis key cleanup notice:', e);
    }

    // Log worker / queue status
    console.log('[Worker Status]: Click queue using direct DB fallback');
  });

  afterAll(async () => {
    // Cleanup test links from DB
    try {
      await prisma.link.deleteMany({
        where: {
          shortCode: {
            startsWith: 'test',
          },
        },
      });

      // Cleanup test Redis keys
      let cursor = '0';
      const testKeys: string[] = [];
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'short:test*', 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length) testKeys.push(...keys);
      } while (cursor !== '0');

      if (testKeys.length > 0) {
        await redis.del(...testKeys);
      }
    } catch (e) {
      console.warn('AfterAll cleanup warning:', e);
    }
  });

  // a) POST /api/links with valid URL -> 200 + shortCode. Invalid -> 400. Duplicate alias -> 409.
  it('a) handles valid URL creation, invalid URL rejection, and duplicate customAlias conflicts', async () => {
    const alias = getUniqueCode('test-dup');
    const ip = getUniqueIp();

    // Valid link creation
    const resValid = await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({
        originalUrl: 'https://example.com/test-valid',
        customAlias: alias,
      }),
    });
    expect([200, 201]).toContain(resValid.status);
    const dataValid = await resValid.json();
    expect(dataValid.shortCode).toBe(alias);

    // Invalid URL format
    const resInvalid = await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': getUniqueIp() },
      body: JSON.stringify({
        originalUrl: 'not-a-valid-url',
      }),
    });
    expect(resInvalid.status).toBe(400);

    // Duplicate custom alias
    const resDup = await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': getUniqueIp() },
      body: JSON.stringify({
        originalUrl: 'https://example.com/another',
        customAlias: alias,
      }),
    });
    expect(resDup.status).toBe(409);
  });

  // b) GET /s/:code -> 302 redirect. Invalid code -> 404.
  it('b) redirects valid short links with 302 and returns 404 for invalid codes', async () => {
    const code = getUniqueCode('test-b');
    await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': getUniqueIp() },
      body: JSON.stringify({
        originalUrl: 'https://example.com/target-b',
        customAlias: code,
      }),
    });

    // Valid code redirect
    const resRedirect = await fetch(`${BASE_URL}/s/${code}`, {
      redirect: 'manual',
    });
    expect(resRedirect.status).toBe(302);
    expect(resRedirect.headers.get('location')).toBe('https://example.com/target-b');

    // Invalid code
    const resNotFound = await fetch(`${BASE_URL}/s/nonexistent-code-99999`, {
      redirect: 'manual',
    });
    expect(resNotFound.status).toBe(404);
  });

  // c) Test expired link (FIX 2: cache HIT check)
  it('c) blocks expired links on Cache HIT and returns 404', async () => {
    const code = getUniqueCode('test-exp');
    await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': getUniqueIp() },
      body: JSON.stringify({
        originalUrl: 'https://example.com/expired-target',
        customAlias: code,
        expiresIn: '1h',
      }),
    });

    // Hit once to populate Redis cache
    const firstHit = await fetch(`${BASE_URL}/s/${code}`, { redirect: 'manual' });
    expect(firstHit.status).toBe(302);

    // Set expiresAt to past directly in Prisma WITHOUT deleting Redis cache
    await prisma.link.update({
      where: { shortCode: code },
      data: { expiresAt: new Date(Date.now() - 3600000) },
    });

    // Also simulate cache having expired date to verify Cache HIT check
    const cacheKey = `short:${code}`;
    const cachedStr = await redis.get(cacheKey);
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      cached.expiresAt = new Date(Date.now() - 3600000).toISOString();
      await redis.set(cacheKey, JSON.stringify(cached), 'EX', 3600);
    }

    // Next request must return 404 even on Cache HIT
    const secondHit = await fetch(`${BASE_URL}/s/${code}`, { redirect: 'manual' });
    expect(secondHit.status).toBe(404);
  });

  // d) Rate limit isolation (FIX 1): 11 requests from same IP -> 11th is 429
  it('d) enforces rate limit of 10 requests per IP on POST /api/links (11th is 429)', async () => {
    const rateLimitIp = '192.168.99.1';
    // Clean key before test
    await redis.del(`ratelimit:${rateLimitIp}`);

    let lastStatus = 0;
    let lastHeaders: Headers | null = null;

    for (let i = 1; i <= 11; i++) {
      const res = await fetch(`${BASE_URL}/api/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': rateLimitIp,
        },
        body: JSON.stringify({
          originalUrl: `https://example.com/rate-test-${i}`,
          customAlias: getUniqueCode(`test-rl-${i}`),
        }),
      });

      lastStatus = res.status;
      lastHeaders = res.headers;

      if (i <= 10) {
        expect([200, 201]).toContain(res.status);
      }
    }

    expect(lastStatus).toBe(429);
    expect(lastHeaders?.get('X-RateLimit-Limit')).toBe('10');
    expect(lastHeaders?.get('Retry-After')).toBe('60');

    // Clean up key
    await redis.del(`ratelimit:${rateLimitIp}`);
  });

  // e) UTM appending logic verification in DB
  it('e) appends UTM parameters to originalUrl and persists in database', async () => {
    const code = getUniqueCode('test-utm');
    const res = await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': getUniqueIp() },
      body: JSON.stringify({
        originalUrl: 'https://example.com/landing?existing=param',
        customAlias: code,
        utmSource: 'newsletter',
        utmMedium: 'email',
        utmCampaign: 'winter_sale',
      }),
    });
    expect([200, 201]).toContain(res.status);

    const record = await prisma.link.findUnique({
      where: { shortCode: code },
    });

    expect(record).not.toBeNull();
    expect(record?.originalUrl).toContain('utm_source=newsletter');
    expect(record?.originalUrl).toContain('utm_medium=email');
    expect(record?.originalUrl).toContain('utm_campaign=winter_sale');
    expect(record?.originalUrl).toContain('existing=param');
  });

  // f) A/B Split destinations (FIX 4)
  it('f) distributes traffic across split destinations with >= 3 hits per variant over 20 hits', async () => {
    const code = getUniqueCode('test-split');
    const urlA = 'https://example.com/split-variant-a';
    const urlB = 'https://example.com/split-variant-b';

    await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': getUniqueIp() },
      body: JSON.stringify({
        originalUrl: 'https://example.com/fallback',
        customAlias: code,
        splitDestinations: [
          { url: urlA, weight: 50 },
          { url: urlB, weight: 50 },
        ],
      }),
    });

    // Run trial (allow 1 retry to safeguard against theoretical probability tail)
    let counts: Record<string, number> = { [urlA]: 0, [urlB]: 0 };
    for (let attempt = 0; attempt < 2; attempt++) {
      counts = { [urlA]: 0, [urlB]: 0 };
      for (let i = 0; i < 20; i++) {
        const res = await fetch(`${BASE_URL}/s/${code}`, { redirect: 'manual' });
        const loc = res.headers.get('location');
        if (loc && counts[loc] !== undefined) {
          counts[loc]++;
        }
      }
      if (counts[urlA] >= 3 && counts[urlB] >= 3) {
        break;
      }
    }

    expect(counts[urlA]).toBeGreaterThanOrEqual(3);
    expect(counts[urlB]).toBeGreaterThanOrEqual(3);
  });

  // g) Smart rules (device / country)
  it('g) routes traffic according to device and country rules', async () => {
    const code = getUniqueCode('test-rules');
    const mobileTarget = 'https://m.example.com/mobile-target';
    const defaultTarget = 'https://example.com/desktop-target';

    await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': getUniqueIp() },
      body: JSON.stringify({
        originalUrl: defaultTarget,
        customAlias: code,
        rules: [
          {
            type: 'device',
            value: 'mobile',
            destinationUrl: mobileTarget,
          },
        ],
      }),
    });

    // Mobile user agent
    const resMobile = await fetch(`${BASE_URL}/s/${code}`, {
      redirect: 'manual',
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    });
    expect(resMobile.status).toBe(302);
    expect(resMobile.headers.get('location')).toBe(mobileTarget);

    // Desktop user agent
    const resDesktop = await fetch(`${BASE_URL}/s/${code}`, {
      redirect: 'manual',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
      },
    });
    expect(resDesktop.status).toBe(302);
    expect(resDesktop.headers.get('location')).toBe(defaultTarget);
  });

  // h) Scoping test (FIX 4): Click link1 only -> link2 stats must be 0
  it('h) ensures stats queries are strictly scoped to linkId without leakage', async () => {
    const codeA = getUniqueCode('scA');
    const codeB = getUniqueCode('scB');

    // Create Link A
    await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': getUniqueIp() },
      body: JSON.stringify({
        originalUrl: 'https://example.com/scope-a',
        customAlias: codeA,
      }),
    });

    // Create Link B
    await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': getUniqueIp() },
      body: JSON.stringify({
        originalUrl: 'https://example.com/scope-b',
        customAlias: codeB,
      }),
    });

    // Click Link A 3 times
    for (let i = 0; i < 3; i++) {
      await fetch(`${BASE_URL}/s/${codeA}`, { redirect: 'manual' });
    }

    // Wait for Link A clicks to be recorded
    const statsA = await waitForStats(codeA, 3);
    expect(statsA.totalClicks).toBeGreaterThanOrEqual(3);

    // Verify Link B has zero stats
    const resB = await fetch(`${BASE_URL}/api/links/${codeB}/stats`);
    expect(resB.status).toBe(200);
    const statsB = await resB.json();
    expect(statsB.totalClicks).toBe(0);
    expect(statsB.clicksLast60Min).toBe(0);
    expect(statsB.recentClicks).toHaveLength(0);
  });

  // i) PATCH updates + Cache invalidation + DELETE
  it('i) PATCH updates link data and invalidates Redis cache; DELETE removes link', async () => {
    const code = getUniqueCode('test-patch');
    await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': getUniqueIp() },
      body: JSON.stringify({
        originalUrl: 'https://example.com/original-target',
        customAlias: code,
        folder: 'General',
        isFavorite: false,
      }),
    });

    // Cache it via GET
    await fetch(`${BASE_URL}/s/${code}`, { redirect: 'manual' });

    // PATCH update
    const patchRes = await fetch(`${BASE_URL}/api/links/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isFavorite: true,
        folder: 'Work',
      }),
    });
    expect(patchRes.status).toBe(200);

    // Verify Redis cache key was deleted
    const cacheAfterPatch = await redis.get(`short:${code}`);
    expect(cacheAfterPatch).toBeNull();

    // Next GET /s/:code still works
    const getRes = await fetch(`${BASE_URL}/s/${code}`, { redirect: 'manual' });
    expect(getRes.status).toBe(302);

    // Clean up via DELETE
    const delRes = await fetch(`${BASE_URL}/api/links/${code}`, {
      method: 'DELETE',
    });
    expect(delRes.status).toBe(200);

    // Deleted link returns 404
    const notFoundRes = await fetch(`${BASE_URL}/s/${code}`, { redirect: 'manual' });
    expect(notFoundRes.status).toBe(404);
  });

  // j) POST /api/ai/generate fallback and rate limiting
  it('j) generates 3 alias suggestions using fallback when GEMINI_API_KEY is not set', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': getUniqueIp() },
      body: JSON.stringify({
        type: 'alias',
        originalUrl: 'https://github.com',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.suggestions)).toBe(true);
    expect(data.suggestions).toHaveLength(3);
    data.suggestions.forEach((alias: string) => {
      expect(typeof alias).toBe('string');
      expect(alias.length).toBeGreaterThan(0);
    });
  });

  // k) GET /api/metadata SSRF Protection (FIX 5)
  it('k) fetches public metadata and safely blocks SSRF attempts to private networks', async () => {
    // Valid public URL
    const resPublic = await fetch(`${BASE_URL}/api/metadata?url=https://github.com`);
    expect(resPublic.status).toBe(200);
    const dataPublic = await resPublic.json();
    expect(dataPublic.title).toBeDefined();
    expect(dataPublic.favicon).toBeDefined();

    // SSRF attempt: localhost
    const resLocalhost = await fetch(`${BASE_URL}/api/metadata?url=http://localhost:3000`);
    expect([400, 403]).toContain(resLocalhost.status);
    const dataLocal = await resLocalhost.json();
    expect(dataLocal.error).toBeDefined();

    // SSRF attempt: cloud metadata service IP (169.254.169.254)
    const resMetadataIp = await fetch(`${BASE_URL}/api/metadata?url=http://169.254.169.254`);
    expect([400, 403]).toContain(resMetadataIp.status);
  });

  // l) Webhook lifecycle
  it('l) creates, tests, and deletes a webhook; triggerWebhook with no webhooks does not throw', async () => {
    // 1. Create webhook
    const resCreate = await fetch(`${BASE_URL}/api/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://webhook.site/test',
        event: 'milestone',
      }),
    });
    expect([200, 201]).toContain(resCreate.status);
    const dataCreate = await resCreate.json();
    const webhookId = dataCreate.webhook?.id;
    expect(webhookId).toBeDefined();

    // 2. Test webhook endpoint
    const resTest = await fetch(`${BASE_URL}/api/webhooks/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://example.com',
      }),
    });
    expect(resTest.status).toBe(200);
    const dataTest = await resTest.json();
    expect(typeof dataTest.success).toBe('boolean');

    // 3. Delete webhook
    const resDel = await fetch(`${BASE_URL}/api/webhooks/${webhookId}`, {
      method: 'DELETE',
    });
    expect(resDel.status).toBe(200);

    // 4. Verify triggerWebhook with empty / no webhooks does not throw
    await expect(triggerWebhook('nonexistent-user-1234', { test: true })).resolves.not.toThrow();
  });

  // m) Check for API keys or v1 shorten
  it('m) verifies API keys or v1 shorten endpoints return expected status or 404 if unconfigured', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/shorten`, {
      headers: { 'x-api-key': 'invalid-key-123' },
    });
    // If not implemented, 404 is expected; if implemented, 401 is expected
    expect([401, 404]).toContain(res.status);
  });

  // FIX 6 - Missing Coverage 1: Password Protection
  it('FIX 6.1: verifies password protection redirect and correct password unlock', async () => {
    const code = getUniqueCode('test-pwd');
    const secret = 'test1234';

    await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': getUniqueIp() },
      body: JSON.stringify({
        originalUrl: 'https://example.com/secret-vault',
        customAlias: code,
        password: secret,
      }),
    });

    // Direct GET redirects to /verify/:code
    const getRes = await fetch(`${BASE_URL}/s/${code}`, { redirect: 'manual' });
    expect([302, 307]).toContain(getRes.status);
    expect(getRes.headers.get('location')).toContain(`/verify/${code}`);

    // POST wrong password -> 401
    const wrongRes = await fetch(`${BASE_URL}/api/links/${code}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong-password' }),
    });
    expect(wrongRes.status).toBe(401);

    // POST correct password -> 200 + originalUrl
    const correctRes = await fetch(`${BASE_URL}/api/links/${code}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: secret }),
    });
    expect(correctRes.status).toBe(200);
    const correctData = await correctRes.json();
    expect(correctData.destinationUrl).toBe('https://example.com/secret-vault');
  });

  // FIX 6 - Missing Coverage 2: maxClicks limit
  it('FIX 6.2: enforces maxClicks limit (allows N hits, (N+1)th hit returns 404)', async () => {
    const code = getUniqueCode('test-max');
    await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': getUniqueIp() },
      body: JSON.stringify({
        originalUrl: 'https://example.com/limited',
        customAlias: code,
        maxClicks: 2,
      }),
    });

    // 1st hit -> 302
    const hit1 = await fetch(`${BASE_URL}/s/${code}`, { redirect: 'manual' });
    expect(hit1.status).toBe(302);

    // 2nd hit -> 302
    const hit2 = await fetch(`${BASE_URL}/s/${code}`, { redirect: 'manual' });
    expect(hit2.status).toBe(302);

    // 3rd hit -> 404 limit reached
    const hit3 = await fetch(`${BASE_URL}/s/${code}`, { redirect: 'manual' });
    expect(hit3.status).toBe(404);
  });

  // FIX 6 - Missing Coverage 3: isActive toggle
  it('FIX 6.3: toggling isActive blocks or allows redirection', async () => {
    const code = getUniqueCode('test-active');
    await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': getUniqueIp() },
      body: JSON.stringify({
        originalUrl: 'https://example.com/active-test',
        customAlias: code,
      }),
    });

    // Deactivate link
    const deactRes = await fetch(`${BASE_URL}/api/links/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    });
    expect(deactRes.status).toBe(200);

    const hitInactive = await fetch(`${BASE_URL}/s/${code}`, { redirect: 'manual' });
    expect(hitInactive.status).toBe(404);

    // Reactivate link
    const reactRes = await fetch(`${BASE_URL}/api/links/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true }),
    });
    expect(reactRes.status).toBe(200);

    const hitActive = await fetch(`${BASE_URL}/s/${code}`, { redirect: 'manual' });
    expect(hitActive.status).toBe(302);
  });

  // FIX 6 - Missing Coverage 4: Bio profile API
  it('FIX 6.4: creates bio profile via POST /api/bio and retrieves it via GET /api/bio/[username]', async () => {
    const username = `testu${Date.now().toString().slice(-14)}`;
    const postRes = await fetch(`${BASE_URL}/api/bio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        displayName: 'Test User',
        bio: 'Hello from automated tests',
      }),
    });
    expect(postRes.status).toBe(200);
    const postData = await postRes.json();
    expect(postData.profile.username).toBe(username);

    // Retrieve via public endpoint
    const getRes = await fetch(`${BASE_URL}/api/bio/${username}`);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.profile.displayName).toBe('Test User');
    expect(getData.profile.bio).toBe('Hello from automated tests');
  });

  // FIX 5 - XSS Prevention: javascript:alert(1) must 400
  it('FIX 5.6: rejects XSS originalUrl payloads (e.g. javascript:alert(1)) with 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': getUniqueIp() },
      body: JSON.stringify({
        originalUrl: 'javascript:alert(1)',
      }),
    });
    expect(res.status).toBe(400);
  });
});
