export interface DemoRule {
  type: 'country' | 'device';
  value: string;
  destinationUrl: string;
}

export interface DemoSplitDestination {
  url: string;
  weight: number;
}

export interface DemoLinkItem {
  shortCode: string;
  originalUrl: string;
  title: string;
  folder: string;
  tags: string[];
  showOnBio: boolean;
  bioTitle?: string;
  password?: string;
  rules?: DemoRule[];
  splitDestinations?: DemoSplitDestination[];
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export const DEMO_LINKS: DemoLinkItem[] = [
  {
    shortCode: 'demo-normal',
    originalUrl: 'https://github.com/jaydavane207-cyber/url-shortener',
    title: 'Snip.ly GitHub Repository',
    folder: 'Development',
    tags: ['opensource', 'nextjs', 'prisma'],
    showOnBio: true,
    bioTitle: 'Project Source Code',
    utmSource: 'demo_platform',
    utmMedium: 'interactive_tour',
    utmCampaign: 'product_showcase_2026',
  },
  {
    shortCode: 'demo-pass',
    originalUrl: 'https://en.wikipedia.org/wiki/URL_shortening',
    title: 'Protected Documentation (Secret)',
    folder: 'Confidential',
    tags: ['security', 'password', 'protected'],
    showOnBio: false,
    bioTitle: 'Protected Docs',
    password: 'demo123Password',
  },
  {
    shortCode: 'demo-smart',
    originalUrl: 'https://apple.com',
    title: 'Apple Worldwide Store (Smart Routing)',
    folder: 'Targeting',
    tags: ['smart-redirect', 'geo', 'mobile'],
    showOnBio: true,
    bioTitle: 'Apple Store Geo-Routing',
    rules: [
      {
        type: 'device',
        value: 'mobile',
        destinationUrl: 'https://www.apple.com/iphone/',
      },
      {
        type: 'country',
        value: 'IN',
        destinationUrl: 'https://www.apple.com/in/',
      },
      {
        type: 'country',
        value: 'US',
        destinationUrl: 'https://www.apple.com/store',
      },
    ],
  },
  {
    shortCode: 'demo-ab',
    originalUrl: 'https://nextjs.org',
    title: 'Next.js Official Portal (A/B Test)',
    folder: 'Experiments',
    tags: ['ab-test', 'split-testing'],
    showOnBio: true,
    bioTitle: 'Next.js Split Experiment',
    splitDestinations: [
      {
        url: 'https://nextjs.org/docs',
        weight: 60,
      },
      {
        url: 'https://nextjs.org/showcase',
        weight: 40,
      },
    ],
  },
];
