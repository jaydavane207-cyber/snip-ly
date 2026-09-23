"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scissors, GitFork, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/bio", label: "Bio Link" },
  { href: "/dashboard/webhooks", label: "Webhooks" },
  { href: "/#features", label: "Features" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 border-b border-slate-100 transition-all">
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200/60 group-hover:scale-105 transition-transform duration-200">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <span className="text-slate-900 font-bold text-lg tracking-tight">
            Snip<span className="text-indigo-600">.ly</span>
          </span>
        </Link>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150",
                pathname === link.href
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="https://github.com/jaydavane207-cyber/url-shortener"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150"
            aria-label="GitHub"
          >
            <GitFork className="w-5 h-5" />
          </a>
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-300/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </nav>
    </header>
  );
}
