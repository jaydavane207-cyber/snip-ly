import Link from "next/link";
import { Scissors, GitFork, ExternalLink } from "lucide-react";

const productLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
];

const connectLinks = [
  {
    href: "https://github.com/jaydavane207-cyber/url-shortener",
    label: "GitHub",
    icon: GitFork,
  },
  {
    href: "https://linkedin.com",
    label: "LinkedIn",
    icon: ExternalLink,
  },
];

export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-20">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2.5 w-fit">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200/60">
                <Scissors className="w-4 h-4 text-white" />
              </div>
              <span className="text-slate-900 font-bold text-lg tracking-tight">
                Snip<span className="text-indigo-600">.ly</span>
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              Fast, simple URL shortening with real-time analytics. Track every
              click, everywhere.
            </p>
          </div>

          {/* Col 2: Product */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">
              Product
            </h3>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-500 hover:text-indigo-600 transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Connect */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">
              Connect
            </h3>
            <ul className="space-y-2.5">
              {connectLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors duration-150"
                  >
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Snip.ly. All rights reserved.
          </p>
          <p className="text-xs text-slate-400">
            Built with Next.js, Prisma & Redis.
          </p>
        </div>
      </div>
    </footer>
  );
}
