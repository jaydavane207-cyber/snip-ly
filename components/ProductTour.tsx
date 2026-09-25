'use client';

import { driver, DriveStep } from 'driver.js';

/**
 * Start the guided tour on the Home page (/).
 * Steps: #shorten-form -> #recent-links -> #navbar -> final popover
 */
export function startHomeTour() {
  if (typeof window === 'undefined') return;

  const rawSteps: DriveStep[] = [
    {
      element: '#shorten-form',
      popover: {
        title: 'Shorten Links & Advanced Controls',
        description:
          'Paste any URL to generate an instant short link with custom alias, expiration, password protection, and UTM parameters.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#recent-links',
      popover: {
        title: 'Recent Activity Feed',
        description:
          'Monitor recently generated short links, copy URLs, and jump directly to real-time analytics dashboards.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#navbar',
      popover: {
        title: 'Unified Navigation',
        description:
          'Quickly navigate between the Link Dashboard, Bio Builder, Webhooks, API Keys, and the Interactive Demo environment.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      // Final popover without element (allowed by driver.js v1)
      popover: {
        title: 'Ready to Explore?',
        description:
          'Start shortening links right away, or explore all advanced capabilities on the Live Demo page.',
      },
    },
  ];

  const filtered = rawSteps.filter((s) => {
    if (!s.element) return true;
    if (typeof s.element === 'string') {
      return Boolean(document.querySelector(s.element));
    }
    return true;
  });

  if (filtered.length === 0) return;

  try {
    const driverObj = driver({
      showProgress: true,
      overlayOpacity: 0.6,
      allowClose: true,
      steps: filtered,
    });
    driverObj.drive();
  } catch (err) {
    console.warn('Driver.js tour encountered an error:', err);
  }
}

/**
 * Start the guided tour on the Demo page (/demo).
 * Steps: #demo-actions -> #demo-card-create -> #demo-card-analytics -> #demo-card-bio -> #demo-howto -> final popover
 */
export function startDemoTour() {
  if (typeof window === 'undefined') return;

  const rawSteps: DriveStep[] = [
    {
      element: '#demo-actions',
      popover: {
        title: 'Demo Control Center',
        description:
          'Seed pre-configured demo links with realistic 50-click analytics, or reset demo state anytime.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#demo-card-create',
      popover: {
        title: 'Instant URL Shortening',
        description:
          'Create short links with automatic favicon extraction, customizable aliases, and instant QR code generation.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#demo-card-analytics',
      popover: {
        title: 'Real-Time Live Analytics',
        description:
          'Inspect rich metrics for demo-normal including live 60-minute clicks, country maps, browser distribution, and device charts.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#demo-card-bio',
      popover: {
        title: 'Public Bio Link Page',
        description:
          'Discover how Snip.ly powers a unified link-in-bio hub with verified social profiles and custom themes at /b/demo.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '#demo-howto',
      popover: {
        title: 'Step-by-Step Testing Guide',
        description:
          'Follow guided tests for password verification (/s/demo-pass), smart targeting (/s/demo-smart), and A/B testing (/s/demo-ab).',
        side: 'top',
        align: 'center',
      },
    },
    {
      // Final popover without element (allowed by driver.js v1)
      popover: {
        title: 'Explore Hands-On!',
        description:
          'Click the "Try" buttons on each card to experience redirects, analytics, and password verification in action.',
      },
    },
  ];

  const filtered = rawSteps.filter((s) => {
    if (!s.element) return true;
    if (typeof s.element === 'string') {
      return Boolean(document.querySelector(s.element));
    }
    return true;
  });

  if (filtered.length === 0) return;

  try {
    const driverObj = driver({
      showProgress: true,
      overlayOpacity: 0.6,
      allowClose: true,
      steps: filtered,
    });
    driverObj.drive();
  } catch (err) {
    console.warn('Driver.js tour encountered an error:', err);
  }
}

/**
 * Route-aware tour launcher.
 * Automatically initiates demo tour on /demo or home tour on other paths.
 */
export function startTour() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/demo')) {
    startDemoTour();
  } else {
    startHomeTour();
  }
}
