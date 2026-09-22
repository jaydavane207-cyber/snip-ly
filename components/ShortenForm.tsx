"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Link2,
  Scissors,
  Copy,
  ExternalLink,
  QrCode,
  Download,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Folder,
  Tag,
  Star,
  UserCheck,
  Lock,
  MousePointerClick,
  Sparkles,
  Plus,
  Trash2,
  Globe2,
  Smartphone,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import QrModal from "@/components/QrModal";

interface ShortenResult {
  shortCode: string;
  shortUrl: string;
  originalUrl?: string;
  title?: string;
}

interface SmartRule {
  type: "country" | "device";
  value: string;
  destinationUrl: string;
}

const EXPIRY_OPTIONS = [
  { value: "never", label: "Never expire" },
  { value: "1h", label: "1 Hour" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
];

const POPULAR_FOLDERS = ["General", "Social", "Marketing", "Personal", "Work"];

export default function ShortenForm() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [expiresIn, setExpiresIn] = useState<"1h" | "24h" | "7d" | "never">("never");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ShortenResult | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [urlError, setUrlError] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);

  // Advanced Options state
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [folder, setFolder] = useState("General");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showOnBio, setShowOnBio] = useState(false);
  const [bioTitle, setBioTitle] = useState("");
  const [password, setPassword] = useState("");
  const [maxClicks, setMaxClicks] = useState<string>("");
  const [rules, setRules] = useState<SmartRule[]>([]);

  const handleFetchMetadata = async () => {
    if (!originalUrl.trim()) {
      toast.error("Please enter a URL first");
      return;
    }
    try {
      new URL(originalUrl);
    } catch {
      toast.error("Please enter a valid URL (including https://)");
      return;
    }

    setIsFetchingMetadata(true);
    try {
      const res = await fetch(`/api/metadata?url=${encodeURIComponent(originalUrl.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title && !title) {
          setTitle(data.title);
        }
        if (data.favicon) {
          setFaviconUrl(data.favicon);
        }
        toast.success("Page metadata retrieved");
      }
    } catch {
      toast.error("Could not fetch metadata");
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^,+|,+$/g, "");
      if (val && !tags.includes(val)) {
        if (tags.length >= 10) {
          toast.error("Maximum 10 tags allowed");
          return;
        }
        setTags([...tags, val]);
        setTagInput("");
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const addRule = () => {
    if (rules.length >= 10) {
      toast.error("Maximum 10 rules allowed");
      return;
    }
    setRules([...rules, { type: "country", value: "US", destinationUrl: "" }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: keyof SmartRule, val: string) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: val };
    setRules(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError("");

    if (!originalUrl.trim()) {
      setUrlError("Please enter a URL");
      return;
    }

    try {
      new URL(originalUrl);
    } catch {
      setUrlError("Please enter a valid URL (include https://)");
      return;
    }

    // Validate smart rules URLs
    for (const rule of rules) {
      if (rule.destinationUrl.trim()) {
        try {
          new URL(rule.destinationUrl.trim());
        } catch {
          toast.error(`Invalid URL in targeting rule for ${rule.value}`);
          return;
        }
      }
    }

    setIsLoading(true);
    setResult(null);
    setShowQr(false);

    try {
      const filteredRules = rules.filter(
        (r) => r.destinationUrl && r.destinationUrl.trim() !== ""
      );

      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalUrl: originalUrl.trim(),
          customAlias: customAlias.trim() || undefined,
          expiresIn,
          title: title.trim() || undefined,
          faviconUrl: faviconUrl.trim() || undefined,
          folder: folder.trim() || "General",
          tags,
          isFavorite,
          showOnBio,
          bioTitle: bioTitle.trim() || undefined,
          password: password.trim() || undefined,
          maxClicks: maxClicks ? parseInt(maxClicks, 10) : undefined,
          rules: filteredRules,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error("That alias is already taken. Try another.");
        } else if (data?.details) {
          const messages = Object.values(data.details)
            .flat()
            .filter((m): m is { _errors: string[] } => typeof m === "object" && m !== null && "_errors" in m)
            .flatMap((m) => m._errors);
          toast.error(messages[0] || "Validation failed");
        } else {
          toast.error(data?.error || "Something went wrong");
        }
        return;
      }

      setResult(data);
      toast.success("Short link created!");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  }, []);

  const downloadQr = useCallback(() => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${result?.shortCode || "link"}.png`;
    a.click();
    toast.success("QR code downloaded!");
  }, [result]);

  return (
    <div className="w-full space-y-4">
      <Card className="shadow-2xl shadow-indigo-100/60">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Destination URL
              </label>
              {originalUrl && (
                <button
                  type="button"
                  onClick={handleFetchMetadata}
                  disabled={isFetchingMetadata}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isFetchingMetadata ? "animate-spin" : ""}`} />
                  Auto-fill Title
                </button>
              )}
            </div>
            <Input
              leftIcon={<Link2 className="w-4 h-4" />}
              type="url"
              placeholder="https://your-very-long-url.com/with/lots/of/params"
              value={originalUrl}
              onChange={(e) => {
                setOriginalUrl(e.target.value);
                setUrlError("");
              }}
              error={urlError}
              required
            />
          </div>

          {/* Row: Alias + Expiry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Custom Alias{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <Input
                leftText="/s/"
                type="text"
                placeholder="my-brand-link"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                maxLength={20}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <Clock className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                Expires In
              </label>
              <select
                value={expiresIn}
                onChange={(e) =>
                  setExpiresIn(e.target.value as typeof expiresIn)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 cursor-pointer"
              >
                {EXPIRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Advanced Options Accordion Toggle */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="flex items-center justify-between w-full py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                Advanced Settings (Targeting, Security, Organization)
              </span>
              {isAdvancedOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            <AnimatePresence>
              {isAdvancedOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden space-y-4 pt-3 border-t border-slate-100"
                >
                  {/* Title & Folder */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Link Title / Description
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Summer Campaign Landing Page"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        <Folder className="w-3 h-3 inline mr-1 text-slate-400" />
                        Folder / Category
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="General"
                          value={folder}
                          onChange={(e) => setFolder(e.target.value)}
                          maxLength={30}
                        />
                      </div>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {POPULAR_FOLDERS.map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setFolder(f)}
                            className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                              folder === f
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-medium"
                                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      <Tag className="w-3 h-3 inline mr-1 text-slate-400" />
                      Tags (press Enter to add, up to 10)
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. promo, twitter, 2026"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={addTag}
                    />
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            #{t}
                            <button
                              type="button"
                              onClick={() => removeTag(t)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Password & Max Clicks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        <Lock className="w-3 h-3 inline mr-1 text-slate-400" />
                        Password Protection
                      </label>
                      <Input
                        type="password"
                        placeholder="Leave blank for public link"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        <MousePointerClick className="w-3 h-3 inline mr-1 text-slate-400" />
                        Click Limit (Max Clicks)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Unlimited"
                        value={maxClicks}
                        onChange={(e) => setMaxClicks(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Bio & Favorite Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showOnBio}
                        onChange={(e) => setShowOnBio(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                        Show on Bio Link Page
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isFavorite}
                        onChange={(e) => setIsFavorite(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                      />
                      <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500" />
                        Star as Favorite
                      </span>
                    </label>
                  </div>

                  {showOnBio && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Custom Title for Bio Page
                      </label>
                      <Input
                        type="text"
                        placeholder="Display text for your bio page link"
                        value={bioTitle}
                        onChange={(e) => setBioTitle(e.target.value)}
                        maxLength={100}
                      />
                    </div>
                  )}

                  {/* Smart Redirect Rules */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                          Smart Geo & Device Targeting
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Route visitors to custom destinations based on their country or device
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={addRule}
                        disabled={rules.length >= 10}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Add Rule
                      </Button>
                    </div>

                    {rules.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {rules.map((rule, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <select
                                value={rule.type}
                                onChange={(e) =>
                                  updateRule(idx, "type", e.target.value as "country" | "device")
                                }
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800"
                              >
                                <option value="country">Country</option>
                                <option value="device">Device</option>
                              </select>

                              {rule.type === "country" ? (
                                <div className="flex items-center gap-1">
                                  <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                                  <input
                                    type="text"
                                    maxLength={2}
                                    placeholder="US"
                                    value={rule.value}
                                    onChange={(e) =>
                                      updateRule(idx, "value", e.target.value.toUpperCase())
                                    }
                                    className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-mono uppercase text-slate-800"
                                    title="2-letter ISO country code, e.g. US, IN, GB"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                                  <select
                                    value={rule.value}
                                    onChange={(e) =>
                                      updateRule(idx, "value", e.target.value)
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800"
                                  >
                                    <option value="mobile">mobile</option>
                                    <option value="desktop">desktop</option>
                                  </select>
                                </div>
                              )}
                            </div>

                            <input
                              type="url"
                              placeholder="https://example.com/target-page"
                              value={rule.destinationUrl}
                              onChange={(e) =>
                                updateRule(idx, "destinationUrl", e.target.value)
                              }
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                              required
                            />

                            <button
                              type="button"
                              onClick={() => removeRule(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors self-end sm:self-auto"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full text-base py-3.5"
          >
            {!isLoading && <Scissors className="w-5 h-5" />}
            {isLoading ? "Shortening..." : "Shorten URL"}
          </Button>
        </form>
      </Card>

      {/* Result Box */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Card className="border-indigo-100 shadow-2xl shadow-indigo-100/60">
              {/* Success header */}
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="text-sm font-medium text-emerald-700">
                  Link created successfully!
                </span>
              </div>

              {/* Short URL display */}
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4">
                <Link2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="flex-1 text-sm font-mono text-indigo-700 truncate">
                  {result.shortUrl}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => copyToClipboard(result.shortUrl)}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Link
                </Button>
                <a
                  href={result.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors duration-150"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </a>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowQrModal(true)}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  QR Code (PNG/SVG)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQr((v) => !v)}
                >
                  {showQr ? "Hide Preview" : "Quick QR"}
                </Button>
              </div>

              {/* Quick inline QR */}
              <AnimatePresence>
                {showQr && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex flex-col sm:flex-row items-center gap-5">
                        <div
                          ref={qrRef}
                          className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm"
                        >
                          <QRCodeCanvas
                            value={result.shortUrl}
                            size={180}
                            fgColor="#6366f1"
                            bgColor="#ffffff"
                            level="H"
                          />
                        </div>
                        <div className="flex flex-col gap-2 text-center sm:text-left">
                          <p className="text-sm font-medium text-slate-700">
                            Scan to open link
                          </p>
                          <p className="text-xs text-slate-400">
                            High resolution QR code
                          </p>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={downloadQr}
                            className="mt-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download PNG
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Modal for PNG / SVG export */}
      {result && (
        <QrModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          url={result.shortUrl}
          shortCode={result.shortCode}
          title={result.title}
        />
      )}
    </div>
  );
}
