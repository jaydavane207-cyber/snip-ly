import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Password Verification and Link Guard Logic', () => {
  function hashPassword(pwd: string): string {
    return crypto.createHash('sha256').update(pwd).digest('hex');
  }

  function isLinkAccessible(link: {
    isActive: boolean;
    expiresAt: Date | null;
    maxClicks: number | null;
    clickCount: number;
    passwordHash: string | null;
  }, inputPassword?: string) {
    if (!link.isActive) {
      return { status: 404, error: 'Short link is inactive' };
    }
    if (link.expiresAt && link.expiresAt < new Date()) {
      return { status: 404, error: 'Short link has expired' };
    }
    if (link.maxClicks && link.clickCount >= link.maxClicks) {
      return { status: 404, error: 'Short link click limit reached' };
    }
    if (link.passwordHash) {
      const hashed = hashPassword(inputPassword || '');
      if (hashed !== link.passwordHash) {
        return { status: 401, error: 'Incorrect password' };
      }
    }
    return { status: 200, success: true };
  }

  it('allows access to active, unexpired, unlimited link without password', () => {
    const link = {
      isActive: true,
      expiresAt: null,
      maxClicks: null,
      clickCount: 0,
      passwordHash: null,
    };
    expect(isLinkAccessible(link)).toEqual({ status: 200, success: true });
  });

  it('blocks access if link is deactivated', () => {
    const link = {
      isActive: false,
      expiresAt: null,
      maxClicks: null,
      clickCount: 0,
      passwordHash: null,
    };
    expect(isLinkAccessible(link)).toEqual({
      status: 404,
      error: 'Short link is inactive',
    });
  });

  it('blocks access if link is expired', () => {
    const link = {
      isActive: true,
      expiresAt: new Date(Date.now() - 10000), // 10s in the past
      maxClicks: null,
      clickCount: 0,
      passwordHash: null,
    };
    expect(isLinkAccessible(link)).toEqual({
      status: 404,
      error: 'Short link has expired',
    });
  });

  it('blocks access if max clicks reached', () => {
    const link = {
      isActive: true,
      expiresAt: null,
      maxClicks: 10,
      clickCount: 10,
      passwordHash: null,
    };
    expect(isLinkAccessible(link)).toEqual({
      status: 404,
      error: 'Short link click limit reached',
    });
  });

  it('requires password and checks SHA256 hash', () => {
    const secret = 'super-secret-password-123';
    const link = {
      isActive: true,
      expiresAt: null,
      maxClicks: 50,
      clickCount: 5,
      passwordHash: hashPassword(secret),
    };

    // Wrong password
    expect(isLinkAccessible(link, 'wrong')).toEqual({
      status: 401,
      error: 'Incorrect password',
    });

    // Empty password
    expect(isLinkAccessible(link, '')).toEqual({
      status: 401,
      error: 'Incorrect password',
    });

    // Correct password
    expect(isLinkAccessible(link, secret)).toEqual({
      status: 200,
      success: true,
    });
  });
});
