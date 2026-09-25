"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  Copy,
  BarChart3,
  MousePointerClick,
  LinkIcon,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface LinkItem {
  id: string;
  originalUrl: string;
  shortCode: string;
  title?: string | null;
  faviconUrl?: string | null;
  expiresAt: string | null;
  createdAt: string;
  _count: { clicks: number };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function SkeletonRow() {
  return (
    <tr>
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-100 animate-pulse rounded-md" />
        </td>
      ))}
    </tr>
  );
}

export default function RecentLinks() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const res = await fetch("/api/links");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setLinks(data.links ?? []);
      } catch {
        toast.error("Could not load recent links");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLinks();
  }, []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (!isLoading && links.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <LinkIcon className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-slate-500 text-sm">No links created yet.</p>
        <p className="text-slate-400 text-xs mt-1">
          Start by shortening your first URL above.
        </p>
      </div>
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  return (
    <div id="recent-links" className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Recent Links</h2>
        <Link
          href="/dashboard"
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 transition-colors"
        >
          View all
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Original URL
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Short URL
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Clicks
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                  Created
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading
                ? [...Array(3)].map((_, i) => <SkeletonRow key={i} />)
                : links.slice(0, 8).map((link) => {
                    const shortUrl = `${baseUrl}/s/${link.shortCode}`;
                    const expired = isExpired(link.expiresAt);
                    return (
                      <tr
                        key={link.id}
                        className="hover:bg-slate-50/60 transition-colors duration-100"
                      >
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="space-y-0.5">
                            {link.title && (
                              <span className="text-slate-900 font-medium text-xs truncate block" title={link.title}>
                                {link.title}
                              </span>
                            )}
                            <span
                              title={link.originalUrl}
                              className="text-slate-500 text-[11px] truncate block"
                            >
                              {truncate(link.originalUrl, 35)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-indigo-600 text-xs bg-indigo-50 px-2 py-0.5 rounded-lg">
                              /s/{link.shortCode}
                            </span>
                            <button
                              onClick={() => copy(shortUrl)}
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Copy short URL"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="info">
                            <MousePointerClick className="w-3 h-3" />
                            {link._count.clicks}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span
                            className={cn(
                              "text-xs",
                              expired ? "text-red-400" : "text-slate-400"
                            )}
                          >
                            {expired ? "Expired" : timeAgo(link.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/analytics/${link.shortCode}`}
                            className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors inline-flex"
                            title="View analytics"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
