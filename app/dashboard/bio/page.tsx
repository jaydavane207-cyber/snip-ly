"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import {
  User,
  ExternalLink,
  Copy,
  Save,
  Globe,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Link2,
} from "lucide-react";
import {
  TwitterIcon,
  GithubIcon,
  LinkedinIcon,
  InstagramIcon,
  YoutubeIcon,
} from "@/components/SocialIcons";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface LinkItem {
  id: string;
  originalUrl: string;
  shortCode: string;
  title: string | null;
  bioTitle: string | null;
  showOnBio: boolean;
  faviconUrl: string | null;
  isActive: boolean;
}

interface SocialLinks {
  twitter?: string;
  github?: string;
  linkedin?: string;
  instagram?: string;
  youtube?: string;
  website?: string;
}

export default function BioDashboardPage() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingLinkId, setUpdatingLinkId] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/bio");
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            if (data.profile) {
              setUsername(data.profile.username || "");
              setDisplayName(data.profile.displayName || "");
              setBio(data.profile.bio || "");
              setAvatarUrl(data.profile.avatarUrl || "");
              setSocialLinks(data.profile.socialLinks || {});
            }
            if (data.links) {
              setLinks(data.links);
            }
          }
        }
      } catch {
        if (!ignore) {
          toast.error("Could not load bio profile");
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = username.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      toast.error(
        "Username must be 3-20 characters and contain only lowercase letters, numbers, or underscores"
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          displayName: displayName.trim() || undefined,
          bio: bio.trim() || undefined,
          avatarUrl: avatarUrl.trim() || undefined,
          socialLinks,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error("That username is already taken by another account");
        } else {
          toast.error(data.error || "Failed to save profile");
        }
        return;
      }

      toast.success("Bio profile saved successfully!");
    } catch {
      toast.error("Network error while saving profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleShowOnBio = async (link: LinkItem) => {
    const nextShow = !link.showOnBio;
    setUpdatingLinkId(link.id);

    // Optimistic update
    setLinks((prev) =>
      prev.map((l) => (l.id === link.id ? { ...l, showOnBio: nextShow } : l))
    );

    try {
      const res = await fetch(`/api/links/${link.shortCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showOnBio: nextShow }),
      });

      if (!res.ok) throw new Error("Failed to update link");
      toast.success(nextShow ? "Link added to bio" : "Link removed from bio");
    } catch {
      // Revert optimistic update
      setLinks((prev) =>
        prev.map((l) => (l.id === link.id ? { ...l, showOnBio: !nextShow } : l))
      );
      toast.error("Failed to update link status");
    } finally {
      setUpdatingLinkId(null);
    }
  };

  const handleUpdateBioTitle = async (link: LinkItem, newBioTitle: string) => {
    try {
      const res = await fetch(`/api/links/${link.shortCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bioTitle: newBioTitle.trim() || null }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Bio link title updated");
    } catch {
      toast.error("Failed to update title");
    }
  };

  const copyBioUrl = async () => {
    if (!username) return;
    try {
      await navigator.clipboard.writeText(`${baseUrl}/b/${username}`);
      toast.success("Bio link copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const publicBioUrl = username ? `${baseUrl}/b/${username}` : "";

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        {/* Top Back & Actions */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          {username && (
            <div className="flex items-center gap-2">
              <button
                onClick={copyBioUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Bio Link
              </button>
              <a
                href={publicBioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200/50 hover:shadow-indigo-300/50 hover:scale-[1.02] transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Public Bio
              </a>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Bio Link Page</h1>
          <p className="text-slate-500 text-sm mt-1">
            Create a clean personal landing page to showcase your most important links
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Profile Settings */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-base font-semibold text-slate-900">
                      Profile Information
                    </h2>
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSaving || isLoading}
                  >
                    {!isSaving && !isLoading && <Save className="w-4 h-4 mr-1" />}
                    Save Profile
                  </Button>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Your Bio URL
                  </label>
                  <Input
                    leftText="/b/"
                    type="text"
                    placeholder="yourusername"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    maxLength={20}
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    3-20 lowercase letters, numbers, and underscores only
                  </p>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Display Name
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Alex Morgan"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={60}
                  />
                </div>

                {/* Bio text */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Bio Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Digital creator, designer, and developer. Building the future of the web."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={300}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Avatar URL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Avatar Image URL
                  </label>
                  <Input
                    type="url"
                    placeholder="https://images.unsplash.com/... or profile pic URL"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />
                </div>

                {/* Social Links */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                    Social Accounts & Profiles
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <TwitterIcon size={16} />
                      </div>
                      <input
                        type="url"
                        placeholder="https://x.com/username"
                        value={socialLinks.twitter || ""}
                        onChange={(e) =>
                          setSocialLinks({ ...socialLinks, twitter: e.target.value })
                        }
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <GithubIcon size={16} />
                      </div>
                      <input
                        type="url"
                        placeholder="https://github.com/username"
                        value={socialLinks.github || ""}
                        onChange={(e) =>
                          setSocialLinks({ ...socialLinks, github: e.target.value })
                        }
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <LinkedinIcon size={16} />
                      </div>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/username"
                        value={socialLinks.linkedin || ""}
                        onChange={(e) =>
                          setSocialLinks({ ...socialLinks, linkedin: e.target.value })
                        }
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <InstagramIcon size={16} />
                      </div>
                      <input
                        type="url"
                        placeholder="https://instagram.com/username"
                        value={socialLinks.instagram || ""}
                        onChange={(e) =>
                          setSocialLinks({ ...socialLinks, instagram: e.target.value })
                        }
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <YoutubeIcon size={16} />
                      </div>
                      <input
                        type="url"
                        placeholder="https://youtube.com/@channel"
                        value={socialLinks.youtube || ""}
                        onChange={(e) =>
                          setSocialLinks({ ...socialLinks, youtube: e.target.value })
                        }
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <input
                        type="url"
                        placeholder="https://yourwebsite.com"
                        value={socialLinks.website || ""}
                        onChange={(e) =>
                          setSocialLinks({ ...socialLinks, website: e.target.value })
                        }
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </Card>

            {/* Manage Links shown on Bio */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-base font-semibold text-slate-900">
                    Links on your Bio Page
                  </h2>
                </div>
                <span className="text-xs text-slate-500">
                  {links.filter((l) => l.showOnBio).length} active link(s)
                </span>
              </div>

              {links.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No links created yet. Create links from the dashboard first.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {links.map((link) => {
                    const isBusy = updatingLinkId === link.id;
                    return (
                      <div
                        key={link.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <label className="relative flex items-center cursor-pointer mt-1">
                            <input
                              type="checkbox"
                              checked={link.showOnBio}
                              disabled={isBusy}
                              onChange={() => handleToggleShowOnBio(link)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                            />
                          </label>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs text-slate-900 truncate">
                                {link.title || `/s/${link.shortCode}`}
                              </span>
                              <span className="font-mono text-[11px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                /s/{link.shortCode}
                              </span>
                            </div>

                            {/* Editable Bio Title */}
                            <div className="mt-1.5 flex items-center gap-2 max-w-sm">
                              <input
                                type="text"
                                defaultValue={link.bioTitle || link.title || ""}
                                onBlur={(e) =>
                                  handleUpdateBioTitle(link, e.target.value)
                                }
                                placeholder="Custom label on bio..."
                                className="w-full text-xs rounded-lg border border-slate-200 px-2 py-1 text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {link.showOnBio ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              <CheckCircle2 className="w-3 h-3" />
                              Visible
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              Hidden
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Live Mockup Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Live Preview
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {username ? `/b/${username}` : "/b/..."}
                </span>
              </div>

              {/* Phone-like Container */}
              <div className="bg-white rounded-3xl border-4 border-slate-800 p-4 shadow-xl max-w-xs mx-auto">
                <div className="w-16 h-3.5 bg-slate-800 rounded-full mx-auto mb-4" />

                {/* Bio preview content */}
                <div className="text-center py-2">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 mx-auto overflow-hidden flex items-center justify-center shadow-md mb-3 border-2 border-white">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt="Avatar"
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <User className="w-8 h-8 text-white" />
                    )}
                  </div>

                  {/* Name & Username */}
                  <h3 className="font-bold text-slate-900 text-sm">
                    {displayName || "Your Name"}
                  </h3>
                  <p className="text-xs text-indigo-600 font-mono mt-0.5">
                    @{username || "username"}
                  </p>

                  {/* Bio */}
                  <p className="text-[11px] text-slate-500 mt-2 px-2 line-clamp-3">
                    {bio || "Your bio description will appear right here."}
                  </p>

                  {/* Social buttons preview */}
                  <div className="flex items-center justify-center gap-1.5 mt-3 text-slate-400">
                    {socialLinks.twitter && <TwitterIcon size={14} />}
                    {socialLinks.github && <GithubIcon size={14} />}
                    {socialLinks.linkedin && <LinkedinIcon size={14} />}
                    {socialLinks.instagram && <InstagramIcon size={14} />}
                    {socialLinks.youtube && <YoutubeIcon size={14} />}
                    {socialLinks.website && <Globe className="w-3.5 h-3.5" />}
                  </div>

                  {/* Links preview list */}
                  <div className="mt-4 space-y-2">
                    {links
                      .filter((l) => l.showOnBio)
                      .slice(0, 5)
                      .map((l) => (
                        <div
                          key={l.id}
                          className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 text-center shadow-sm truncate"
                        >
                          {l.bioTitle || l.title || `/s/${l.shortCode}`}
                        </div>
                      ))}
                    {links.filter((l) => l.showOnBio).length === 0 && (
                      <div className="py-4 text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        No links added to bio yet
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 font-medium inline-flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                    Powered by Snip.ly
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
