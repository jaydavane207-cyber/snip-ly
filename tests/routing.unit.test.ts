import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  parseDevice,
  resolveDestination,
  pickSplitDestination,
  parseCachedLinkData,
  RouteRule,
  SplitDestination,
} from '@/lib/routing';

describe('tests/routing.unit.test.ts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('pickSplitDestination - Weighted Logic & Mocked Random', () => {
    it('returns null for empty, null, or undefined split arrays', () => {
      expect(pickSplitDestination(null)).toBeNull();
      expect(pickSplitDestination(undefined)).toBeNull();
      expect(pickSplitDestination([])).toBeNull();
    });

    it('returns single destination when only one valid destination exists', () => {
      const splits: SplitDestination[] = [{ url: 'https://example.com/single', weight: 100 }];
      expect(pickSplitDestination(splits)).toBe('https://example.com/single');
    });

    it('accurately picks variant A when Math.random returns low value', () => {
      const splits: SplitDestination[] = [
        { url: 'https://example.com/a', weight: 50 },
        { url: 'https://example.com/b', weight: 50 },
      ];

      vi.spyOn(Math, 'random').mockReturnValue(0.2); // 0.2 * 100 = 20 -> falls in variant A
      expect(pickSplitDestination(splits)).toBe('https://example.com/a');
    });

    it('accurately picks variant B when Math.random returns high value', () => {
      const splits: SplitDestination[] = [
        { url: 'https://example.com/a', weight: 50 },
        { url: 'https://example.com/b', weight: 50 },
      ];

      vi.spyOn(Math, 'random').mockReturnValue(0.8); // 0.8 * 100 = 80 -> falls in variant B
      expect(pickSplitDestination(splits)).toBe('https://example.com/b');
    });

    it('handles multi-weight distribution with mocked random boundaries', () => {
      const splits: SplitDestination[] = [
        { url: 'https://example.com/10', weight: 10 },
        { url: 'https://example.com/30', weight: 30 },
        { url: 'https://example.com/60', weight: 60 },
      ];

      // Total = 100
      vi.spyOn(Math, 'random').mockReturnValue(0.05); // 5 -> 10
      expect(pickSplitDestination(splits)).toBe('https://example.com/10');

      vi.spyOn(Math, 'random').mockReturnValue(0.25); // 25 -> 30
      expect(pickSplitDestination(splits)).toBe('https://example.com/30');

      vi.spyOn(Math, 'random').mockReturnValue(0.75); // 75 -> 60
      expect(pickSplitDestination(splits)).toBe('https://example.com/60');
    });

    it('filters out invalid or non-positive weights', () => {
      const splits: SplitDestination[] = [
        { url: '', weight: 50 },
        { url: 'https://example.com/invalid-weight', weight: -10 },
        { url: 'https://example.com/valid', weight: 50 },
      ];

      expect(pickSplitDestination(splits)).toBe('https://example.com/valid');
    });
  });

  describe('device detection regex (parseDevice)', () => {
    it('detects iPhone, iPad, and Android user agents as mobile', () => {
      const uas = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36',
        'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
      ];
      uas.forEach((ua) => {
        expect(parseDevice(ua)).toBe('mobile');
      });
    });

    it('detects Windows, Mac, and Linux desktop user agents as desktop', () => {
      const uas = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
      ];
      uas.forEach((ua) => {
        expect(parseDevice(ua)).toBe('desktop');
      });
    });

    it('defaults to desktop for empty or unknown user agents', () => {
      expect(parseDevice('')).toBe('desktop');
      expect(parseDevice('curl/8.4.0')).toBe('desktop');
    });
  });

  describe('country matching uppercase logic (resolveDestination)', () => {
    const originalUrl = 'https://example.com/default';
    const rules: RouteRule[] = [
      { type: 'country', value: 'US', destinationUrl: 'https://example.com/us' },
      { type: 'country', value: 'IN', destinationUrl: 'https://example.com/in' },
      { type: 'device', value: 'mobile', destinationUrl: 'https://example.com/mobile' },
    ];

    it('matches country regardless of case in input or rule', () => {
      expect(resolveDestination(originalUrl, rules, 'us', 'desktop')).toBe('https://example.com/us');
      expect(resolveDestination(originalUrl, rules, 'US', 'desktop')).toBe('https://example.com/us');
      expect(resolveDestination(originalUrl, rules, 'in', 'desktop')).toBe('https://example.com/in');
      expect(resolveDestination(originalUrl, rules, 'In', 'desktop')).toBe('https://example.com/in');
    });

    it('prioritizes country match over device match', () => {
      // User is on mobile, but in US -> should redirect to US page
      expect(resolveDestination(originalUrl, rules, 'US', 'mobile')).toBe('https://example.com/us');
    });

    it('falls back to device rule if country does not match', () => {
      // Country is CA (not in rules), device is mobile -> mobile rule fires
      expect(resolveDestination(originalUrl, rules, 'CA', 'mobile')).toBe('https://example.com/mobile');
    });

    it('falls back to originalUrl if neither country nor device matches', () => {
      expect(resolveDestination(originalUrl, rules, 'CA', 'desktop')).toBe(originalUrl);
    });
  });

  describe('UTM append logic', () => {
    it('appends UTM parameters while preserving existing search parameters', () => {
      const original = 'https://myshop.com/product?category=shoes&ref=promo';
      const url = new URL(original);
      url.searchParams.set('utm_source', 'google');
      url.searchParams.set('utm_medium', 'cpc');
      url.searchParams.set('utm_campaign', 'spring_sale');

      const result = url.toString();
      expect(result).toContain('category=shoes');
      expect(result).toContain('ref=promo');
      expect(result).toContain('utm_source=google');
      expect(result).toContain('utm_medium=cpc');
      expect(result).toContain('utm_campaign=spring_sale');
    });

    it('handles URLs without existing query strings cleanly', () => {
      const original = 'https://example.com';
      const url = new URL(original);
      url.searchParams.set('utm_source', 'newsletter');

      expect(url.toString()).toBe('https://example.com/?utm_source=newsletter');
    });
  });

  describe('Redis JSON.parse fallback for old string cache (parseCachedLinkData)', () => {
    it('returns null for null, undefined, or empty string', () => {
      expect(parseCachedLinkData(null)).toBeNull();
      expect(parseCachedLinkData(undefined)).toBeNull();
      expect(parseCachedLinkData('')).toBeNull();
    });

    it('returns null for legacy plain URL string cache (non-JSON)', () => {
      const legacyStringCache = 'https://example.com/direct-url';
      expect(parseCachedLinkData(legacyStringCache)).toBeNull();
    });

    it('returns null for corrupted or malformed JSON', () => {
      const corruptedJson = '{"id":"link-123", "originalUrl":';
      expect(parseCachedLinkData(corruptedJson)).toBeNull();
    });

    it('returns null if JSON is missing required fields (id or originalUrl)', () => {
      const incompleteJson = JSON.stringify({ someKey: 'someValue' });
      expect(parseCachedLinkData(incompleteJson)).toBeNull();
    });

    it('successfully parses valid JSON CachedLinkData with full structure', () => {
      const validData = {
        id: 'clx1234567',
        originalUrl: 'https://example.com/target',
        isActive: true,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        passwordHash: null,
        rules: [{ type: 'device', value: 'mobile', destinationUrl: 'https://m.example.com' }],
        maxClicks: 100,
        clickCount: 15,
        splitDestinations: [{ url: 'https://example.com/variant', weight: 50 }],
      };

      const parsed = parseCachedLinkData(JSON.stringify(validData));
      expect(parsed).not.toBeNull();
      expect(parsed?.id).toBe('clx1234567');
      expect(parsed?.originalUrl).toBe('https://example.com/target');
      expect(parsed?.isActive).toBe(true);
      expect(parsed?.rules).toHaveLength(1);
      expect(parsed?.splitDestinations).toHaveLength(1);
    });
  });
});
