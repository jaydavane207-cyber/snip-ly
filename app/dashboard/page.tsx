"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Copy,
  Trash2,
  MousePointerClick,
  Search,
  ExternalLink,
  LinkIcon,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface LinkItem {
  id: string;
  originalUrl: string;
  shortCode: string;
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

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function SkeletonRow() {
  return (
    <tr>
      {[200, 120, 60, 80, 80, 80].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div
            className="h-4 bg-slate-100 animate-pulse rounded-md"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const fetchLinks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/links");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLinks(data.links ?? []);
    } catch {
      toast.error("Could not load links");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const deleteLink = async (code: string) => {
    if (!window.confirm(`Delete link /s/${code}? This cannot be undone.`)) return;
    setDeletingCode(code);
    try {
      const res = await fetch(`/api/links/${code}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setLinks((prev) => prev.filter((l) => l.shortCode !== code));
      toast.success("Link deleted");
    } catch {
      toast.error("Failed to delete link");
    } finally {
      setDeletingCode(null);
    }
  };

  const filtered = links.filter(
    (l) =>
      l.originalUrl.toLowerCase().includes(search.toLowerCase()) ||
      l.shortCode.toLowerCase().includes(search.toLowerCase())
  );

  const totalClicks = links.reduce((sum, l) => sum + l._count.clicks, 0);
  const activeLinks = links.filter((l) => !isExpired(l.expiresAt)).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Links</h1>
            <p className="text-slate-500 mt-1 text-sm">
              Manage and track all your short links
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLinks}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link href="/">
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4" />
                Create New
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats row */}
        {!isLoading && links.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Links", value: links.length },
              { label: "Total Clicks", value: totalClicks },
              { label: "Active Links", value: activeLinks },
            ].map((s) => (
              <Card key={s.label} className="py-4 px-5 text-center">
                <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </Card>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <Input
            leftIcon={<Search className="w-4 h-4" />}
            placeholder="Search by URL or alias..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {/* Empty state */}
        {!isLoading && links.length === 0 && (
          <Card className="text-center py-24">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LinkIcon className="w-7 h-7 text-slate-300" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">
              No links yet
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Create your first short link to get started
            </p>
            <Link href="/">
              <Button variant="primary">
                <Plus className="w-4 h-4" />
                Create Link
              </Button>
            </Link>
          </Card>
        )}

        {/* Table */}
        {(isLoading || links.length > 0) && (
          <Card padding={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    {[
                      "Short URL",
                      "Original",
                      "Clicks",
                      "Status",
                      "Created",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading
                    ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                    : filtered.map((link) => {
                        const shortUrl = `${baseUrl}/s/${link.shortCode}`;
                        const expired = isExpired(link.expiresAt);
                        const isDeleting = deletingCode === link.shortCode;
                        return (
                          <tr
                            key={link.id}
                            className="hover:bg-slate-50/70 transition-colors duration-100"
                          >
                            {/* Short URL */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-indigo-600 text-xs bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 whitespace-nowrap">
                                  /s/{link.shortCode}
                                </span>
                                <button
                                  onClick={() => copy(shortUrl)}
                                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="Copy"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={shortUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="Open"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </td>
                            {/* Original */}
                            <td className="px-4 py-3.5 max-w-[220px]">
                              <span
                                title={link.originalUrl}
                                className="text-slate-600 text-xs truncate block"
                              >
                                {truncate(link.originalUrl, 55)}
                              </span>
                            </td>
                            {/* Clicks */}
                            <td className="px-4 py-3.5">
                              <Badge variant="info">
                                <MousePointerClick className="w-3 h-3" />
                                {link._count.clicks}
                              </Badge>
                            </td>
                            {/* Status */}
                            <td className="px-4 py-3.5">
                              <Badge variant={expired ? "warning" : "success"}>
                                {expired ? "Expired" : "Active"}
                              </Badge>
                            </td>
                            {/* Created */}
                            <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                              {timeAgo(link.createdAt)}
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1">
                                <Link
                                  href={`/analytics/${link.shortCode}`}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="Analytics"
                                >
                                  <BarChart3 className="w-4 h-4" />
                                </Link>
                                <button
                                  onClick={() => deleteLink(link.shortCode)}
                                  disabled={isDeleting}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>

              {/* Filtered empty state */}
              {!isLoading && filtered.length === 0 && links.length > 0 && (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No links match &quot;{search}&quot;
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
