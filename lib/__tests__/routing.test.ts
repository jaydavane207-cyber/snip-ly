import { describe, it, expect } from 'vitest';
import {
  parseDevice,
  parseBrowser,
  resolveDestination,
  RouteRule,
} from '../routing';

describe('Routing Helper Functions', () => {
  describe('parseDevice', () => {
    it('correctly identifies mobile devices', () => {
      expect(
        parseDevice(
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15'
        )
      ).toBe('mobile');

      expect(
        parseDevice(
          'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 Chrome/112.0.0.0 Mobile Safari/537.36'
        )
      ).toBe('mobile');

      expect(
        parseDevice(
          'Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15'
        )
      ).toBe('mobile');
    });

    it('correctly identifies desktop devices', () => {
      expect(
        parseDevice(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
      ).toBe('desktop');

      expect(
        parseDevice(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
        )
      ).toBe('desktop');

      expect(
        parseDevice(
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
      ).toBe('desktop');
    });
  });

  describe('parseBrowser', () => {
    it('identifies Chrome', () => {
      expect(
        parseBrowser(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
      ).toBe('Chrome');
    });

    it('identifies Firefox', () => {
      expect(
        parseBrowser(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0'
        )
      ).toBe('Firefox');
    });

    it('identifies Safari', () => {
      expect(
        parseBrowser(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
        )
      ).toBe('Safari');
    });

    it('identifies Edge', () => {
      expect(
        parseBrowser(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
        )
      ).toBe('Edge');
    });

    it('identifies Opera', () => {
      expect(
        parseBrowser(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0'
        )
      ).toBe('Opera');
    });

    it('returns Other for unknown UA', () => {
      expect(parseBrowser('curl/7.68.0')).toBe('Other');
    });
  });

  describe('resolveDestination', () => {
    const defaultUrl = 'https://example.com/default';

    it('returns default URL when no rules exist', () => {
      expect(resolveDestination(defaultUrl, [], 'US', 'desktop')).toBe(defaultUrl);
      expect(resolveDestination(defaultUrl, null, 'US', 'desktop')).toBe(defaultUrl);
    });

    it('matches country rule with case-insensitivity', () => {
      const rules: RouteRule[] = [
        { type: 'country', value: 'US', destinationUrl: 'https://example.com/us' },
        { type: 'country', value: 'IN', destinationUrl: 'https://example.com/in' },
      ];

      expect(resolveDestination(defaultUrl, rules, 'US', 'desktop')).toBe(
        'https://example.com/us'
      );
      expect(resolveDestination(defaultUrl, rules, 'in', 'desktop')).toBe(
        'https://example.com/in'
      );
    });

    it('matches device rule when country does not match', () => {
      const rules: RouteRule[] = [
        { type: 'country', value: 'GB', destinationUrl: 'https://example.com/gb' },
        { type: 'device', value: 'mobile', destinationUrl: 'https://example.com/mobile-app' },
      ];

      expect(resolveDestination(defaultUrl, rules, 'US', 'mobile')).toBe(
        'https://example.com/mobile-app'
      );
    });

    it('prioritizes country match over device match', () => {
      const rules: RouteRule[] = [
        { type: 'country', value: 'US', destinationUrl: 'https://example.com/us-exclusive' },
        { type: 'device', value: 'mobile', destinationUrl: 'https://example.com/mobile' },
      ];

      // Even though user is on mobile, country rule for US takes precedence
      expect(resolveDestination(defaultUrl, rules, 'US', 'mobile')).toBe(
        'https://example.com/us-exclusive'
      );
    });

    it('falls back to default URL when no rules match', () => {
      const rules: RouteRule[] = [
        { type: 'country', value: 'DE', destinationUrl: 'https://example.com/de' },
        { type: 'device', value: 'mobile', destinationUrl: 'https://example.com/mobile' },
      ];

      expect(resolveDestination(defaultUrl, rules, 'FR', 'desktop')).toBe(defaultUrl);
    });
  });
});
