import { z } from 'zod';

export const linkRuleSchema = z.object({
  type: z.enum(['country', 'device']),
  value: z.string().min(1).max(10),
  destinationUrl: z.string().url('Invalid destination URL'),
});

export const createLinkSchema = z.object({
  originalUrl: z.string().url('Invalid URL format'),
  customAlias: z
    .string()
    .regex(
      /^[a-zA-Z0-9-_]{3,20}$/,
      'Custom alias must be 3-20 characters long and contain only letters, numbers, hyphens, or underscores'
    )
    .optional()
    .or(z.literal('')),
  expiresIn: z.enum(['1h', '24h', '7d', 'never']).default('never').optional(),
  title: z.string().max(100).optional().or(z.literal('')),
  faviconUrl: z.string().max(2000).optional().or(z.literal('')),
  folder: z.string().max(30).optional().default('General'),
  tags: z.array(z.string().max(30)).max(10).optional().default([]),
  isFavorite: z.boolean().optional().default(false),
  showOnBio: z.boolean().optional().default(false),
  bioTitle: z.string().max(100).optional().or(z.literal('')),
  password: z.string().min(1).max(100).optional().or(z.literal('')),
  maxClicks: z.number().int().positive().optional().nullable(),
  rules: z.array(linkRuleSchema).max(10).optional().default([]),
});

export function calculateExpiresAt(expiresIn?: '1h' | '24h' | '7d' | 'never'): Date | null {
  if (!expiresIn || expiresIn === 'never') return null;

  const now = new Date();
  switch (expiresIn) {
    case '1h':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

export const updateLinkSchema = z.object({
  title: z.string().max(100).optional().nullable(),
  originalUrl: z.string().url().optional(),
  folder: z.string().max(30).optional().nullable(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isFavorite: z.boolean().optional(),
  showOnBio: z.boolean().optional(),
  bioTitle: z.string().max(100).optional().nullable(),
  isActive: z.boolean().optional(),
  password: z.string().max(100).optional().nullable(),
  maxClicks: z.number().int().positive().optional().nullable(),
  rules: z
    .array(
      z.object({
        type: z.enum(['country', 'device']),
        value: z.string().min(1).max(10),
        destinationUrl: z.string().url(),
      })
    )
    .max(10)
    .optional(),
});

export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9_]{3,20}$/,
      'Username must be 3-20 lowercase alphanumeric characters or underscores'
    ),
  displayName: z.string().max(60).optional().nullable(),
  bio: z.string().max(300).optional().nullable(),
  avatarUrl: z.string().url().optional().or(z.literal('')).nullable(),
  socialLinks: z
    .record(z.string(), z.string().url().or(z.literal('')).optional().nullable())
    .optional()
    .nullable(),
});

export function isPrivateOrLocalhost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower === '0.0.0.0' ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower === '[::1]'
  ) {
    return true;
  }

  // IPv6 bracketed or raw local/link-local
  const cleanIpv6 = lower.replace(/^\[|\]$/g, '');
  if (
    cleanIpv6 === '::1' ||
    cleanIpv6.startsWith('fc') ||
    cleanIpv6.startsWith('fd') ||
    cleanIpv6.startsWith('fe80')
  ) {
    return true;
  }

  // Check IPv4 private and link-local ranges
  const ipv4Match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const a = Number(ipv4Match[1]);
    const b = Number(ipv4Match[2]);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 127) return true;
    if (a === 0) return true;
  }

  return false;
}

export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#x27;/gi, "'");
}
