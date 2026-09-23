"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Webhook,
  Plus,
  Trash2,
  Copy,
  Send,
  Power,
  ShieldCheck,
  Link2,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface WebhookItem {
  id: string;
  url: string;
  event: string;
  secret: string | null;
  isActive: boolean;
  createdAt: string;
}

const SLACK_EXAMPLE = `{
  "event": "milestone",
  "shortCode": "abc123",
  "clickCount": 100,
  "recentClick": {
    "country": "US",
    "device": "mobile",
    "browser": "Chrome",
    "createdAt": "2026-09-23T12:00:00.000Z"
  }
}`;

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newEvent, setNewEvent] = useState("milestone");
  const [isCreating, setIsCreating] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/webhooks");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWebhooks(data.webhooks ?? []);
    } catch {
      toast.error("Could not load webhooks");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/webhooks");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (!ignore) {
          setWebhooks(data.webhooks ?? []);
        }
      } catch {
        if (!ignore) {
          toast.error("Could not load webhooks");
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

  const createWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) {
      toast.error("Please enter a webhook URL");
      return;
    }
    try { new URL(newUrl); } catch {
      toast.error("Please enter a valid URL (include https://)");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl.trim(), event: newEvent }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create webhook");
        return;
      }
      setWebhooks((prev) => [data.webhook, ...prev]);
      setNewUrl("");
      toast.success("Webhook created!");
    } catch {
      toast.error("Network error");
    } finally {
      setIsCreating(false);
    }
  };

  const testWebhook = async (url: string, id: string) => {
    setTestingId(id);
    try {
      const res = await fetch("/api/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Test delivered! Status: ${data.status ?? "ok"}`);
      } else {
        toast.error(`Test failed: ${data.error || "Unknown error"}`);
      }
    } catch {
      toast.error("Could not send test");
    } finally {
      setTestingId(null);
    }
  };

  const toggleWebhook = async (webhook: WebhookItem) => {
    setTogglingId(webhook.id);
    const next = !webhook.isActive;
    setWebhooks((prev) =>
      prev.map((w) => (w.id === webhook.id ? { ...w, isActive: next } : w))
    );
    try {
      const res = await fetch(`/api/webhooks/${webhook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(next ? "Webhook enabled" : "Webhook disabled");
    } catch {
      // Revert
      setWebhooks((prev) =>
        prev.map((w) => (w.id === webhook.id ? { ...w, isActive: !next } : w))
      );
      toast.error("Failed to update webhook");
    } finally {
      setTogglingId(null);
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!window.confirm("Delete this webhook? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      toast.success("Webhook deleted");
    } catch {
      toast.error("Failed to delete webhook");
    } finally {
      setDeletingId(null);
    }
  };

  const copySecret = async (secret: string | null) => {
    if (!secret) { toast.error("No secret available"); return; }
    try {
      await navigator.clipboard.writeText(secret);
      toast.success("Secret copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const copyExample = async () => {
    try {
      await navigator.clipboard.writeText(SLACK_EXAMPLE);
      toast.success("Payload copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200/60">
              <Webhook className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Webhooks</h1>
              <p className="text-sm text-slate-500">
                Get notified when your links hit click milestones
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsLoading(true);
              fetchWebhooks();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Add Webhook Form */}
        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Add Webhook</h2>
          <form onSubmit={createWebhook} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Endpoint URL
                </label>
                <Input
                  leftIcon={<Link2 className="w-4 h-4" />}
                  type="url"
                  placeholder="https://hooks.slack.com/services/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Event
                </label>
                <select
                  value={newEvent}
                  onChange={(e) => setNewEvent(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="milestone">milestone</option>
                  <option value="any_click">any_click</option>
                </select>
              </div>
            </div>
            <Button type="submit" variant="primary" size="sm" isLoading={isCreating}>
              <Plus className="w-4 h-4" />
              Create Webhook
            </Button>
          </form>
        </Card>

        {/* Webhooks List */}
        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">
            Your Webhooks{" "}
            {!isLoading && (
              <span className="text-slate-400 font-normal">({webhooks.length})</span>
            )}
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-12">
              <Webhook className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No webhooks yet</p>
              <p className="text-xs text-slate-300 mt-1">
                Add a webhook above to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-all ${
                    wh.isActive
                      ? "bg-white border-slate-200"
                      : "bg-slate-50 border-slate-100 opacity-60"
                  }`}
                >
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${wh.isActive ? "bg-emerald-400" : "bg-slate-300"}`} />

                  {/* URL + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-slate-800 truncate">{wh.url}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="info" className="text-[10px]">{wh.event}</Badge>
                      {wh.secret && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <ShieldCheck className="w-3 h-3" />
                          Secret set
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => testWebhook(wh.url, wh.id)}
                      disabled={testingId === wh.id}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Send test payload"
                    >
                      <Send className={`w-4 h-4 ${testingId === wh.id ? "animate-pulse" : ""}`} />
                    </button>
                    {wh.secret && (
                      <button
                        onClick={() => copySecret(wh.secret)}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Copy secret"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => toggleWebhook(wh)}
                      disabled={togglingId === wh.id}
                      className={`p-2 rounded-lg transition-colors ${
                        wh.isActive
                          ? "text-emerald-600 hover:bg-emerald-50"
                          : "text-slate-400 hover:bg-slate-100"
                      }`}
                      title={wh.isActive ? "Disable" : "Enable"}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteWebhook(wh.id)}
                      disabled={deletingId === wh.id}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Slack payload example */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">
              Example Milestone Payload
            </h2>
            <button
              onClick={copyExample}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            This JSON payload is sent to your endpoint when a link reaches a milestone
            (10, 50, 100, 500, 1000, 5000 clicks). The{" "}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">x-webhook-secret</code>{" "}
            header is included for verification.
          </p>
          <pre className="text-xs bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto font-mono leading-relaxed">
            {SLACK_EXAMPLE}
          </pre>

          <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-xs font-semibold text-indigo-700 mb-1">
              Slack Integration
            </p>
            <p className="text-xs text-indigo-600">
              Create an{" "}
              <a
                href="https://api.slack.com/messaging/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Incoming Webhook in Slack
              </a>{" "}
              and paste the URL above. Use a Slack app to format the payload for
              your channel notifications.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
