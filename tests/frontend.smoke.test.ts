import { describe, it, expect } from 'vitest';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

describe('Frontend Smoke Tests', () => {
  it('GET / returns 200 and contains "Snip" (case-insensitive)', async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/Snip/i);
  });

  it('GET /dashboard returns 200 or 307/308 redirect (if auth enabled)', async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
    expect([200, 302, 307, 308]).toContain(res.status);
    if (res.status === 200) {
      const html = await res.text();
      expect(html.length).toBeGreaterThan(0);
    }
  });

  it('GET /b/test-nonexistent-12345 handles missing bio profile gracefully without 500', async () => {
    const res = await fetch(`${BASE_URL}/b/test-nonexistent-12345`);
    expect([200, 404]).toContain(res.status);
    expect(res.status).not.toBe(500);

    const html = await res.text();
    if (res.status === 200) {
      expect(html).toMatch(/not found|no profile|does not exist/i);
    } else {
      expect(res.status).toBe(404);
    }
  });

  it('GET /analytics/invalidcode9999 renders analytics page gracefully without 500 crash', async () => {
    const res = await fetch(`${BASE_URL}/analytics/invalidcode9999`);
    expect(res.status).not.toBe(500);
    expect([200, 404]).toContain(res.status);
    const html = await res.text();
    expect(html.length).toBeGreaterThan(0);
  });
});
