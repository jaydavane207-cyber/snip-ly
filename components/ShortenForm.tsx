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
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface ShortenResult {
  shortCode: string;
  shortUrl: string;
}

const EXPIRY_OPTIONS = [
  { value: "never", label: "Never expire" },
  { value: "1h", label: "1 Hour" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
];

export default function ShortenForm() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [expiresIn, setExpiresIn] = useState<"1h" | "24h" | "7d" | "never">("never");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ShortenResult | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [urlError, setUrlError] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);

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

    setIsLoading(true);
    setResult(null);
    setShowQr(false);

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalUrl: originalUrl.trim(),
          customAlias: customAlias.trim() || undefined,
          expiresIn,
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Long URL
            </label>
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
                  onClick={() => setShowQr((v) => !v)}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  {showQr ? "Hide QR" : "QR Code"}
                </Button>
              </div>

              {/* QR Code */}
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
                            PNG format, 180×180px
                          </p>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={downloadQr}
                            className="mt-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download QR
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
    </div>
  );
}
