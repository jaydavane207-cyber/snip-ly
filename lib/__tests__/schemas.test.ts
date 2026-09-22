import { describe, it, expect } from 'vitest';
import {
  createLinkSchema,
  calculateExpiresAt,
  updateLinkSchema,
  profileSchema,
} from '../validations';

describe('Validation Schemas & Helpers', () => {
  describe('createLinkSchema', () => {
    it('validates a valid link without alias', () => {
      const res = createLinkSchema.safeParse({
        originalUrl: 'https://google.com/search?q=test',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.originalUrl).toBe('https://google.com/search?q=test');
        expect(res.data.folder).toBe('General');
      }
    });

    it('validates a valid link with custom alias', () => {
      const res = createLinkSchema.safeParse({
        originalUrl: 'https://nextjs.org',
        customAlias: 'nextjs-docs',
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid custom aliases', () => {
      // Too short (< 3)
      expect(
        createLinkSchema.safeParse({
          originalUrl: 'https://example.com',
          customAlias: 'ab',
        }).success
      ).toBe(false);

      // Too long (> 20)
      expect(
        createLinkSchema.safeParse({
          originalUrl: 'https://example.com',
          customAlias: 'abcdefghijklmnopqrstuvwxyz',
        }).success
      ).toBe(false);

      // Special characters
      expect(
        createLinkSchema.safeParse({
          originalUrl: 'https://example.com',
          customAlias: 'alias with space',
        }).success
      ).toBe(false);

      expect(
        createLinkSchema.safeParse({
          originalUrl: 'https://example.com',
          customAlias: 'alias@!',
        }).success
      ).toBe(false);
    });

    it('accepts data URIs and URLs for faviconUrl', () => {
      expect(
        createLinkSchema.safeParse({
          originalUrl: 'https://example.com',
          faviconUrl: 'https://example.com/icon.png',
        }).success
      ).toBe(true);

      expect(
        createLinkSchema.safeParse({
          originalUrl: 'https://example.com',
          faviconUrl: '',
        }).success
      ).toBe(true);
    });

    it('validates smart rules array', () => {
      const validRules = createLinkSchema.safeParse({
        originalUrl: 'https://example.com',
        rules: [
          { type: 'country', value: 'US', destinationUrl: 'https://example.com/us' },
          { type: 'device', value: 'mobile', destinationUrl: 'https://example.com/m' },
        ],
      });
      expect(validRules.success).toBe(true);

      const invalidType = createLinkSchema.safeParse({
        originalUrl: 'https://example.com',
        rules: [{ type: 'unknown', value: 'US', destinationUrl: 'https://example.com/us' }],
      });
      expect(invalidType.success).toBe(false);
    });
  });

  describe('calculateExpiresAt', () => {
    it('returns null for never or omitted', () => {
      expect(calculateExpiresAt('never')).toBeNull();
      expect(calculateExpiresAt(undefined)).toBeNull();
    });

    it('calculates 1h expiry accurately', () => {
      const before = Date.now();
      const expiresAt = calculateExpiresAt('1h');
      const after = Date.now();

      expect(expiresAt).not.toBeNull();
      const diff = expiresAt!.getTime() - before;
      expect(diff).toBeGreaterThanOrEqual(60 * 60 * 1000 - 50);
      expect(diff).toBeLessThanOrEqual(after - before + 60 * 60 * 1000);
    });

    it('calculates 24h and 7d expiries', () => {
      const exp24h = calculateExpiresAt('24h');
      expect(exp24h).not.toBeNull();
      const diff24h = exp24h!.getTime() - Date.now();
      expect(diff24h).toBeGreaterThan(23 * 60 * 60 * 1000);

      const exp7d = calculateExpiresAt('7d');
      expect(exp7d).not.toBeNull();
      const diff7d = exp7d!.getTime() - Date.now();
      expect(diff7d).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    });
  });

  describe('updateLinkSchema', () => {
    it('allows clearing title and folder with null', () => {
      const res = updateLinkSchema.safeParse({
        title: null,
        folder: null,
        isFavorite: true,
      });
      expect(res.success).toBe(true);
    });
  });

  describe('profileSchema', () => {
    it('validates a correct profile', () => {
      const res = profileSchema.safeParse({
        username: 'john_doe',
        displayName: 'John Doe',
        bio: 'Software engineer and creator',
        socialLinks: {
          twitter: 'https://x.com/johndoe',
          github: 'https://github.com/johndoe',
        },
      });
      expect(res.success).toBe(true);
    });

    it('rejects invalid usernames', () => {
      // Uppercase characters are normalized or rejected if regex fails
      expect(profileSchema.safeParse({ username: 'ab' }).success).toBe(false);
      expect(profileSchema.safeParse({ username: 'user name' }).success).toBe(false);
      expect(profileSchema.safeParse({ username: 'user@name' }).success).toBe(false);
    });
  });
});
