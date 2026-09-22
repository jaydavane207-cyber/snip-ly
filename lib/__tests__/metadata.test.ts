import { describe, it, expect } from 'vitest';
import { isPrivateOrLocalhost, decodeHtmlEntities } from '../validations';

describe('Metadata Helper Functions', () => {
  describe('isPrivateOrLocalhost', () => {
    it('blocks localhost variants', () => {
      expect(isPrivateOrLocalhost('localhost')).toBe(true);
      expect(isPrivateOrLocalhost('test.localhost')).toBe(true);
      expect(isPrivateOrLocalhost('myapp.local')).toBe(true);
      expect(isPrivateOrLocalhost('service.internal')).toBe(true);
    });

    it('blocks loopback and zero addresses', () => {
      expect(isPrivateOrLocalhost('127.0.0.1')).toBe(true);
      expect(isPrivateOrLocalhost('127.1.2.3')).toBe(true);
      expect(isPrivateOrLocalhost('0.0.0.0')).toBe(true);
      expect(isPrivateOrLocalhost('::1')).toBe(true);
      expect(isPrivateOrLocalhost('[::1]')).toBe(true);
    });

    it('blocks private IPv4 ranges (RFC 1918 and RFC 3927)', () => {
      expect(isPrivateOrLocalhost('10.0.0.1')).toBe(true);
      expect(isPrivateOrLocalhost('10.255.255.255')).toBe(true);
      expect(isPrivateOrLocalhost('172.16.0.1')).toBe(true);
      expect(isPrivateOrLocalhost('172.31.255.255')).toBe(true);
      expect(isPrivateOrLocalhost('192.168.1.1')).toBe(true);
      expect(isPrivateOrLocalhost('192.168.0.254')).toBe(true);
      expect(isPrivateOrLocalhost('169.254.169.254')).toBe(true); // AWS/cloud metadata IP
    });

    it('blocks private IPv6 ranges', () => {
      expect(isPrivateOrLocalhost('fc00::1')).toBe(true);
      expect(isPrivateOrLocalhost('fd12:3456:789a::1')).toBe(true);
      expect(isPrivateOrLocalhost('fe80::1')).toBe(true);
      expect(isPrivateOrLocalhost('[fe80::1]')).toBe(true);
    });

    it('allows valid public hostnames', () => {
      expect(isPrivateOrLocalhost('google.com')).toBe(false);
      expect(isPrivateOrLocalhost('github.com')).toBe(false);
      expect(isPrivateOrLocalhost('subdomain.example.org')).toBe(false);
      expect(isPrivateOrLocalhost('8.8.8.8')).toBe(false);
      expect(isPrivateOrLocalhost('1.1.1.1')).toBe(false);
    });
  });

  describe('decodeHtmlEntities', () => {
    it('decodes common HTML entities in titles', () => {
      expect(decodeHtmlEntities('Fast &amp; Secure')).toBe('Fast & Secure');
      expect(decodeHtmlEntities('A &lt; B &gt; C')).toBe('A < B > C');
      expect(decodeHtmlEntities('&quot;Hello World&quot;')).toBe('"Hello World"');
      expect(decodeHtmlEntities("It&#39;s an agent&#x27;s world")).toBe("It's an agent's world");
    });
  });
});
