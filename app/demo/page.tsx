'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Link2,
  Lock,
  Compass,
  FlaskConical,
  BarChart3,
  UserCheck,
  LayoutDashboard,
  Webhook,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Globe2,
  Cpu,
} from 'lucide-react';
import DemoBanner from '@/components/DemoBanner';

interface DemoCard {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  detail: string;
  href: string;
  actionText: string;
}

const DEMO_CARDS: DemoCard[] = [
  {
    id: 'demo-card-create',
    title: 'Instant URL Shortening',
    subtitle: 'Base link shortening & QR generator',
    badge: 'Core Engine',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    icon: Link2,
    description: 'Generate clean short URLs with metadata auto-fetching, custom aliases, and high-resolution downloadable QR codes.',
    detail: 'Supports custom aliases, expiration timers, and custom favicon extraction.',
    href: '/',
    actionText: 'Try Shorten Form',
  },
  {
    id: 'demo-card-pass',
    title: 'Password Protected Links',
    subtitle: 'Client-side verification gate',
    badge: 'Security',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    icon: Lock,
    description: 'Safeguard confidential links behind bcrypt-hashed password protection. Access is blocked until verified.',
    detail: 'Demo password: demo123Password',
    href: '/s/demo-pass',
    actionText: 'Test Password Gate',
  },
  {
    id: 'demo-card-smart',
    title: 'Smart Targeting Rules',
    subtitle: 'Device & Geo-aware redirection',
    badge: 'Targeting',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-100',
    icon: Compass,
    description: 'Dynamically routes visitors to specialized destination URLs based on whether they are on mobile vs. desktop, or their country.',
    detail: 'Mobile visitors route to Apple iPhone; IN/US visitors route to localized stores.',
    href: '/s/demo-smart',
    actionText: 'Test Smart Redirect',
  },
  {
    id: 'demo-card-ab',
    title: 'A/B Split Traffic Distribution',
    subtitle: 'Weighted probabilistic balancing',
    badge: 'Experimentation',
    badgeColor: 'bg-pink-50 text-pink-700 border-pink-100',
    icon: FlaskConical,
    description: 'Split inbound traffic between multiple destinations using configurable weight percentages to test landing page conversions.',
    detail: 'Configured with 60% Next.js Docs / 40% Next.js Showcase.',
    href: '/s/demo-ab',
    actionText: 'Test A/B Split',
  },
  {
    id: 'demo-card-analytics',
    title: 'Real-Time Live Analytics',
    subtitle: '50-click seeded telemetry dataset',
    badge: 'Telemetry',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-100',
    icon: BarChart3,
    description: 'Inspect comprehensive analytics with live 60-minute counts, country distributions, browser usage, and real-time click logs.',
    detail: 'Seeded with 50 clicks (including recent 5-min live activity).',
    href: '/analytics/demo-normal',
    actionText: 'View Live Analytics',
  },
  {
    id: 'demo-card-bio',
    title: 'Public Link-in-Bio Hub',
    subtitle: 'Curated profile showcase at /b/demo',
    badge: 'Social Bio',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-100',
    icon: UserCheck,
    description: 'A mobile-optimized profile page showing all links marked with showOnBio: true along with social accounts and themes.',
    detail: '3 curated links displayed for demo-user: normal, smart, and A/B.',
    href: '/b/demo',
    actionText: 'View Public Bio',
  },
  {
    id: 'demo-card-dashboard',
    title: 'Link Management Dashboard',
    subtitle: 'Search, folders, tags & status toggle',
    badge: 'Management',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    icon: LayoutDashboard,
    description: 'Full management table with instant URL search, category folder filtering, tags, favorite starring, and pause/resume switches.',
    detail: 'Pre-filtered to demo links with search query support.',
    href: '/dashboard?search=demo',
    actionText: 'Open in Dashboard',
  },
  {
    id: 'demo-card-webhook',
    title: 'Webhooks & Developer API',
    subtitle: 'Event triggers & secure tokens',
    badge: 'API & Integrations',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-100',
    icon: Webhook,
    description: 'Trigger outbound HTTP webhook deliveries when links reach click milestones, and generate SHA-256 hashed API keys for automation.',
    detail: 'Configure endpoint URLs and test payload delivery with signature headers.',
    href: '/dashboard/webhooks',
    actionText: 'Inspect Webhooks',
  },
];

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-slate-50/60 pb-24">
      {/* ── HEADER ──────────────────────────────────────────────── */}
      <section className="pt-12 pb-8 px-4 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-4">
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            Live Feature Showcase
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight mb-3">
            Interactive Product Demo
          </h1>
          <p className="text-base sm:text-lg text-slate-500 leading-relaxed">
            Experience the complete capabilities of Snip.ly with pre-seeded data, real-time analytics, and guided testing controls.
          </p>
        </div>

        {/* ── DEMO ACTIONS BANNER (FIX 4 ID) ──────────────────────── */}
        <div id="demo-actions" className="mb-12">
          <DemoBanner />
        </div>

        {/* ── 8 FEATURE CARDS (FIX 4 IDs) ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {DEMO_CARDS.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.id}
                id={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-lg shadow-slate-200/40 hover:shadow-xl hover:shadow-indigo-100/60 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${card.badgeColor}`}
                    >
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-0.5">
                    {card.title}
                  </h3>
                  <p className="text-xs text-indigo-600 font-medium mb-2.5">
                    {card.subtitle}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">
                    {card.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-2">
                  <div className="text-[11px] text-slate-400 font-mono mb-3 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    {card.detail}
                  </div>
                  <a
                    href={card.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <span>{card.actionText}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── HOW-TO TESTING GUIDE (FIX 4 ID) ───────────────────────── */}
        <section
          id="demo-howto"
          className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xl shadow-slate-200/50"
        >
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Demo Testing Guide
              </h2>
              <p className="text-xs text-slate-500">
                Recommended walkthrough sequence for evaluating all features
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                  1
                </span>
                Seed Data & Guided Tour
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Click <strong>Seed Demo Data</strong> in the action bar above. Once seeded, click <strong>Start Guided Tour</strong> for driver.js highlighting each card.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                  2
                </span>
                Password Verification
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Click <strong>Test Password Gate</strong>. You will be redirected to the secure verification view. Enter <code className="text-indigo-600 bg-white px-1 py-0.5 rounded border border-slate-200">demo123Password</code> to unlock the destination.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                  3
                </span>
                Smart Targeting & A/B Split
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Open <code className="text-indigo-600 bg-white px-1 py-0.5 rounded border border-slate-200">/s/demo-smart</code> on desktop vs. mobile. Open <code className="text-indigo-600 bg-white px-1 py-0.5 rounded border border-slate-200">/s/demo-ab</code> across refreshes to see traffic splitting.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                  4
                </span>
                Real-Time Telemetry
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Visit <code className="text-indigo-600 bg-white px-1 py-0.5 rounded border border-slate-200">/analytics/demo-normal</code> to view 50 total clicks, last 60 minutes chart, and live 5-minute active visitor indicators.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                  5
                </span>
                Public Bio Page
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Visit <code className="text-indigo-600 bg-white px-1 py-0.5 rounded border border-slate-200">/b/demo</code> to see the public link-in-bio hub with 3 curated links, social badges, and verified profile layout.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                  6
                </span>
                Dashboard Management
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Visit <code className="text-indigo-600 bg-white px-1 py-0.5 rounded border border-slate-200">/dashboard?search=demo</code> to test the table filter, star favorites, copy URLs, or toggle link activation.
              </p>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
