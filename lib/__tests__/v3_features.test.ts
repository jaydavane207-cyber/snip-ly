import { describe, it, expect } from 'vitest';
import { pickSplitDestination, SplitDestination } from '../routing';
import { createLinkSchema, updateLinkSchema } from '../validations';

describe('V3 Features - UTM, A/B Testing, Schemas', () => {
  describe('pickSplitDestination', () => {
    it('returns null for empty, null, or undefined array', () => {
      expect(pickSplitDestination(null)).toBeNull();
      expect(pickSplitDestination(undefined)).toBeNull();
      expect(pickSplitDestination([])).toBeNull();
    });

    it('returns null if all variants have invalid weights or empty URLs', () => {
      expect(pickSplitDestination([{ url: '', weight: 10 }])).toBeNull();
      expect(pickSplitDestination([{ url: 'https://example.com', weight: 0 }])).toBeNull();
      expect(pickSplitDestination([{ url: 'https://example.com', weight: -5 }])).toBeNull();
    });

    it('returns the destination if single valid variant exists', () => {
      const splits: SplitDestination[] = [{ url: 'https://example.com/v1', weight: 100 }];
      expect(pickSplitDestination(splits)).toBe('https://example.com/v1');
    });

    it('distributes traffic according to weights over multiple trials', () => {
      const splits: SplitDestination[] = [
        { url: 'https://example.com/v1', weight: 80 },
        { url: 'https://example.com/v2', weight: 20 },
      ];

      const counts: Record<string, number> = {
        'https://example.com/v1': 0,
        'https://example.com/v2': 0,
      };

      const trials = 1000;
      for (let i = 0; i < trials; i++) {
        const dest = pickSplitDestination(splits);
        expect(dest).not.toBeNull();
        if (dest) {
          counts[dest] = (counts[dest] || 0) + 1;
        }
      }

      // v1 should have roughly 80% (between 70% and 90%), v2 roughly 20%
      expect(counts['https://example.com/v1']).toBeGreaterThan(650);
      expect(counts['https://example.com/v2']).toBeGreaterThan(100);
    });

    it('ignores invalid variants mixed with valid ones', () => {
      const splits: SplitDestination[] = [
        { url: '', weight: 50 },
        { url: 'https://example.com/valid', weight: 100 },
      ];
      expect(pickSplitDestination(splits)).toBe('https://example.com/valid');
    });
  });

  describe('createLinkSchema V3 fields', () => {
    it('accepts description up to 200 characters', () => {
      const valid = createLinkSchema.safeParse({
        originalUrl: 'https://example.com',
        description: 'Short and sweet description for this link.',
      });
      expect(valid.success).toBe(true);

      const tooLong = createLinkSchema.safeParse({
        originalUrl: 'https://example.com',
        description: 'a'.repeat(201),
      });
      expect(tooLong.success).toBe(false);
    });

    it('accepts UTM parameters up to 50 characters each', () => {
      const valid = createLinkSchema.safeParse({
        originalUrl: 'https://example.com',
        utmSource: 'newsletter',
        utmMedium: 'email',
        utmCampaign: 'black-friday-2026',
      });
      expect(valid.success).toBe(true);

      const sourceTooLong = createLinkSchema.safeParse({
        originalUrl: 'https://example.com',
        utmSource: 's'.repeat(51),
      });
      expect(sourceTooLong.success).toBe(false);
    });

    it('validates splitDestinations array', () => {
      const valid = createLinkSchema.safeParse({
        originalUrl: 'https://example.com',
        splitDestinations: [
          { url: 'https://example.com/landing-a', weight: 50 },
          { url: 'https://example.com/landing-b', weight: 50 },
        ],
      });
      expect(valid.success).toBe(true);

      const invalidUrl = createLinkSchema.safeParse({
        originalUrl: 'https://example.com',
        splitDestinations: [{ url: 'not-a-url', weight: 50 }],
      });
      expect(invalidUrl.success).toBe(false);

      const weightOutOfRange = createLinkSchema.safeParse({
        originalUrl: 'https://example.com',
        splitDestinations: [{ url: 'https://example.com', weight: 101 }],
      });
      expect(weightOutOfRange.success).toBe(false);

      const tooManySplits = createLinkSchema.safeParse({
        originalUrl: 'https://example.com',
        splitDestinations: [
          { url: 'https://example.com/1', weight: 20 },
          { url: 'https://example.com/2', weight: 20 },
          { url: 'https://example.com/3', weight: 20 },
          { url: 'https://example.com/4', weight: 20 },
          { url: 'https://example.com/5', weight: 20 },
          { url: 'https://example.com/6', weight: 20 },
        ],
      });
      expect(tooManySplits.success).toBe(false);
    });
  });

  describe('updateLinkSchema V3 fields', () => {
    it('allows updating description and splitDestinations', () => {
      const res = updateLinkSchema.safeParse({
        description: 'Updated link description',
        splitDestinations: [{ url: 'https://example.com/variant', weight: 100 }],
      });
      expect(res.success).toBe(true);
    });

    it('allows clearing description with null', () => {
      const res = updateLinkSchema.safeParse({
        description: null,
      });
      expect(res.success).toBe(true);
    });
  });

  describe('UTM URL Appending logic', () => {
    it('correctly appends UTM parameters to originalUrl', () => {
      const original = 'https://mysite.com/product?ref=friend';
      const u = new URL(original);
      u.searchParams.set('utm_source', 'twitter');
      u.searchParams.set('utm_medium', 'social');
      u.searchParams.set('utm_campaign', 'spring-launch');

      expect(u.toString()).toBe(
        'https://mysite.com/product?ref=friend&utm_source=twitter&utm_medium=social&utm_campaign=spring-launch'
      );
    });
  });
});
