"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
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
  Star,
  QrCode,
  Folder,
  Tag,
  Globe,
  UserCheck,
  Power,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import QrModal from "@/components/QrModal";

interface LinkRule {
  id: string;
  type: string;
  value: string;
  destinationUrl: string;
}

interface LinkItem {
  id: string;
  originalUrl: string;
  shortCode: string;
  title: string | null;
  faviconUrl: string | null;
  folder: string | null;
  tags: string[];
  isFavorite: boolean;
  showOnBio: boolean;
  bioTitle: string | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  clickCount: number;
  utmCampaign?: string | null;
  rules?: LinkRule[];
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
      {[220, 160, 60, 80, 80, 100].map((w, i) => (
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
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [qrModalData, setQrModalData] = useState<{
    isOpen: boolean;
    url: string;
    shortCode: string;
    title?: string;
  }>({
    isOpen: false,
    url: "",
    shortCode: "",
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const fetchLinks = useCallback(async () => {
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
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/links");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (!ignore) {
          setLinks(data.links ?? []);
        }
      } catch {
        if (!ignore) {
          toast.error("Could not load links");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const toggleFavorite = async (link: LinkItem) => {
    const nextFavorite = !link.isFavorite;
    // Optimistic update
    setLinks((prev) =>
      prev.map((l) => (l.id === link.id ? { ...l, isFavorite: nextFavorite } : l))
    );

    try {
      const res = await fetch(`/api/links/${link.shortCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: nextFavorite }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(nextFavorite ? "Added to favorites" : "Removed from favorites");
    } catch {
      // Revert optimistic update
      setLinks((prev) =>
        prev.map((l) => (l.id === link.id ? { ...l, isFavorite: !nextFavorite } : l))
      );
      toast.error("Failed to update favorite status");
    }
  };

  const toggleActive = async (link: LinkItem) => {
    const nextActive = !link.isActive;
    setLinks((prev) =>
      prev.map((l) => (l.id === link.id ? { ...l, isActive: nextActive } : l))
    );

    try {
      const res = await fetch(`/api/links/${link.shortCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(nextActive ? "Link activated" : "Link paused");
    } catch {
      setLinks((prev) =>
        prev.map((l) => (l.id === link.id ? { ...l, isActive: !nextActive } : l))
      );
      toast.error("Failed to update status");
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

  // Collect unique folders and tags
  const folders = useMemo(() => {
    const list = new Set<string>();
    links.forEach((l) => {
      if (l.folder) list.add(l.folder);
    });
    return Array.from(list);
  }, [links]);

  const allTags = useMemo(() => {
    const list = new Set<string>();
    links.forEach((l) => {
      l.tags?.forEach((t) => list.add(t));
    });
    return Array.from(list);
  }, [links]);

  const filtered = useMemo(() => {
    return links.filter((l) => {
      const matchesSearch =
        search === "" ||
        l.originalUrl.toLowerCase().includes(search.toLowerCase()) ||
        l.shortCode.toLowerCase().includes(search.toLowerCase()) ||
        (l.title && l.title.toLowerCase().includes(search.toLowerCase())) ||
        l.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
        (l.utmCampaign && l.utmCampaign.toLowerCase().includes(search.toLowerCase()));

      const matchesFolder =
        selectedFolder === "all" || (l.folder || "General") === selectedFolder;

      const matchesTag = !selectedTag || l.tags?.includes(selectedTag);

      const matchesCampaign =
        !selectedCampaign || l.utmCampaign === selectedCampaign;

      const matchesFavorite = !onlyFavorites || l.isFavorite;

      return matchesSearch && matchesFolder && matchesTag && matchesCampaign && matchesFavorite;
    });
  }, [links, search, selectedFolder, selectedTag, selectedCampaign, onlyFavorites]);

  const totalClicks = links.reduce(
    (sum, l) => sum + (l._count?.clicks || l.clickCount || 0),
    0
  );
  const activeLinks = links.filter((l) => l.isActive && !isExpired(l.expiresAt)).length;
  const favoriteCount = links.filter((l) => l.isFavorite).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Links</h1>
            <p className="text-slate-500 mt-1 text-sm">
              Manage, organize, and analyze all your short URLs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/bio">
              <Button variant="secondary" size="sm">
                <UserCheck className="w-4 h-4 mr-1 text-indigo-600" />
                Bio Page
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsLoading(true);
                fetchLinks();
              }}
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

        {/* Stats Row */}
        {!isLoading && links.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Links", value: links.length },
              { label: "Total Clicks", value: totalClicks },
              { label: "Active Links", value: activeLinks },
              { label: "Favorites", value: favoriteCount },
            ].map((s) => (
              <Card key={s.label} className="py-4 px-5 text-center">
                <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </Card>
            ))}
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <Input
              leftIcon={<Search className="w-4 h-4" />}
              placeholder="Search title, URL, alias, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72"
            />

            {/* Folder Filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Folder className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="bg-transparent text-slate-700 text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">All Folders</option>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Favorites Filter */}
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                onlyFavorites
                  ? "bg-amber-50 border-amber-300 text-amber-700 shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  onlyFavorites ? "text-amber-500 fill-amber-500" : "text-slate-400"
                }`}
              />
              Favorites
            </button>
          </div>

          {/* Active Tag Filter indicator */}
          {selectedTag && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Filtered by tag:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
                #{selectedTag}
                <button
                  onClick={() => setSelectedTag(null)}
                  className="text-indigo-400 hover:text-indigo-700"
                >
                  &times;
                </button>
              </span>
            </div>
          )}
          {/* Active Campaign Filter indicator */}
          {selectedCampaign && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Campaign:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100 font-medium">
                📣 {selectedCampaign}
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="text-violet-400 hover:text-violet-700"
                >
                  &times;
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Tags bar if tags exist */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none text-xs">
            <span className="text-slate-400 text-xs shrink-0 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Tags:
            </span>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-medium border transition-colors ${
                  selectedTag === t
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}

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

        {/* Links Table */}
        {(isLoading || links.length > 0) && (
          <Card padding={false} className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="w-8 px-3 py-3 text-center"></th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Link / Title
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Folder / Tags
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Clicks
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Created
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading
                    ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                    : filtered.map((link) => {
                        const shortUrl = `${baseUrl}/s/${link.shortCode}`;
                        const expired = isExpired(link.expiresAt);
                        const isDeleting = deletingCode === link.shortCode;
                        const clickCount = link._count?.clicks || link.clickCount || 0;

                        return (
                          <tr
                            key={link.id}
                            className={`hover:bg-slate-50/70 transition-colors duration-100 ${
                              !link.isActive ? "opacity-60 bg-slate-50/30" : ""
                            }`}
                          >
                            {/* Star / Favorite */}
                            <td className="px-3 py-3.5 text-center">
                              <button
                                onClick={() => toggleFavorite(link)}
                                className="p-1 rounded text-slate-300 hover:text-amber-400 transition-colors"
                                title={link.isFavorite ? "Unstar" : "Star"}
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    link.isFavorite
                                      ? "text-amber-400 fill-amber-400"
                                      : "text-slate-300"
                                  }`}
                                />
                              </button>
                            </td>

                            {/* Title & Short URL & Original */}
                            <td className="px-4 py-3.5 max-w-[280px]">
                              <div className="flex items-start gap-2.5">
                                {/* Favicon */}
                                <div className="w-5 h-5 rounded overflow-hidden shrink-0 mt-0.5 bg-slate-100 flex items-center justify-center">
                                  {link.faviconUrl ? (
                                    <Image
                                      src={link.faviconUrl}
                                      alt=""
                                      width={16}
                                      height={16}
                                      className="w-4 h-4 object-contain"
                                      unoptimized
                                    />
                                  ) : (
                                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </div>

                                <div className="space-y-1 min-w-0">
                                   {/* Title */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className="font-medium text-slate-900 text-xs truncate max-w-[200px]"
                                      title={link.title || link.shortCode}
                                    >
                                      {link.title || `/s/${link.shortCode}`}
                                    </span>
                                    {link.showOnBio && (
                                      <span
                                        className="inline-flex items-center text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5"
                                        title="Visible on your Bio page"
                                      >
                                        Bio
                                      </span>
                                    )}
                                    {link.rules && link.rules.length > 0 && (
                                      <span
                                        className="inline-flex items-center text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5"
                                        title={`${link.rules.length} smart redirect rule(s)`}
                                      >
                                        {link.rules.length} Rules
                                      </span>
                                    )}
                                    {link.utmCampaign && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSelectedCampaign(
                                            selectedCampaign === link.utmCampaign
                                              ? null
                                              : link.utmCampaign!
                                          )
                                        }
                                        className={`inline-flex items-center text-[10px] font-semibold rounded px-1.5 py-0.5 border transition-colors ${
                                          selectedCampaign === link.utmCampaign
                                            ? "text-violet-700 bg-violet-100 border-violet-200"
                                            : "text-violet-600 bg-violet-50 border-violet-100 hover:bg-violet-100"
                                        }`}
                                        title={`Filter by campaign: ${link.utmCampaign}`}
                                      >
                                        📣 {link.utmCampaign}
                                      </button>
                                    )}
                                  </div>

                                  {/* Short code & copy */}
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-indigo-600 text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 whitespace-nowrap">
                                      /s/{link.shortCode}
                                    </span>
                                    <button
                                      onClick={() => copy(shortUrl)}
                                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                      title="Copy short URL"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    <a
                                      href={shortUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                      title="Open link"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>

                                  {/* Original URL */}
                                  <span
                                    title={link.originalUrl}
                                    className="text-slate-400 text-[11px] truncate block"
                                  >
                                    {truncate(link.originalUrl, 45)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Folder & Tags */}
                            <td className="px-4 py-3.5">
                              <div className="space-y-1">
                                {link.folder && (
                                  <div className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                                    <Folder className="w-3 h-3 text-slate-400" />
                                    {link.folder}
                                  </div>
                                )}
                                {link.tags && link.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {link.tags.map((t) => (
                                      <span
                                        key={t}
                                        onClick={() => setSelectedTag(t)}
                                        className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer transition-colors"
                                      >
                                        #{t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Clicks */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <Badge variant="info">
                                <MousePointerClick className="w-3 h-3" />
                                {clickCount}
                              </Badge>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {!link.isActive ? (
                                <Badge variant="default">Paused</Badge>
                              ) : expired ? (
                                <Badge variant="warning">Expired</Badge>
                              ) : (
                                <Badge variant="success">Active</Badge>
                              )}
                            </td>

                            {/* Created */}
                            <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                              {timeAgo(link.createdAt)}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                {/* QR Code modal trigger */}
                                <button
                                  onClick={() =>
                                    setQrModalData({
                                      isOpen: true,
                                      url: shortUrl,
                                      shortCode: link.shortCode,
                                      title: link.title || undefined,
                                    })
                                  }
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="QR Code"
                                >
                                  <QrCode className="w-4 h-4" />
                                </button>

                                {/* Toggle Active/Pause */}
                                <button
                                  onClick={() => toggleActive(link)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    link.isActive
                                      ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                      : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                  }`}
                                  title={link.isActive ? "Pause Link" : "Activate Link"}
                                >
                                  <Power className="w-4 h-4" />
                                </button>

                                {/* Analytics */}
                                <Link
                                  href={`/analytics/${link.shortCode}`}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="Analytics"
                                >
                                  <BarChart3 className="w-4 h-4" />
                                </Link>

                                {/* Delete */}
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
                  No links match the selected filter criteria
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* QR Code Modal */}
      <QrModal
        isOpen={qrModalData.isOpen}
        onClose={() => setQrModalData((prev) => ({ ...prev, isOpen: false }))}
        url={qrModalData.url}
        shortCode={qrModalData.shortCode}
        title={qrModalData.title}
      />
    </div>
  );
}
