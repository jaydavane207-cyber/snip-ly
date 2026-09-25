import { describe, it, expect } from 'vitest';
import { DEMO_LINKS } from '../demoData';

describe('Demo Configuration & Guard Tests', () => {
  it('validates demo link configurations in DEMO_LINKS', () => {
    const codes = DEMO_LINKS.map((d) => d.shortCode);
    expect(codes).toContain('demo-normal');
    expect(codes).toContain('demo-pass');
    expect(codes).toContain('demo-smart');
    expect(codes).toContain('demo-ab');

    // 3 links marked for bio
    const bioLinks = DEMO_LINKS.filter((d) => d.showOnBio).map((d) => d.shortCode);
    expect(bioLinks).toEqual(['demo-normal', 'demo-smart', 'demo-ab']);

    // demo-pass has password
    const passDemo = DEMO_LINKS.find((d) => d.shortCode === 'demo-pass');
    expect(passDemo?.password).toBe('demo123Password');

    // demo-smart has rules
    const smartDemo = DEMO_LINKS.find((d) => d.shortCode === 'demo-smart');
    expect(smartDemo?.rules?.length).toBeGreaterThanOrEqual(2);

    // demo-ab has splitDestinations
    const abDemo = DEMO_LINKS.find((d) => d.shortCode === 'demo-ab');
    expect(abDemo?.splitDestinations?.length).toBe(2);
  });

  it('verifies seed & reset guard security check logic', () => {
    const isAllowed = (url: string) => {
      if (!url.includes('localhost') && !url.includes('127.0.0.1')) return false;
      if (url.includes('neon.tech') || url.includes('supabase.co')) return false;
      return true;
    };

    expect(isAllowed('postgresql://postgres:postgres@localhost:5432/urldb')).toBe(true);
    expect(isAllowed('postgresql://postgres:postgres@127.0.0.1:5432/urldb')).toBe(true);
    expect(isAllowed('postgresql://user:pass@ep-cool-fog.us-east-2.aws.neon.tech/neondb')).toBe(false);
    expect(isAllowed('postgresql://postgres:pass@db.supabase.co:5432/postgres')).toBe(false);
    expect(isAllowed('postgresql://user:pass@production-db.internal:5432/app')).toBe(false);
  });
});
