"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Key, Plus, Trash2, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function handleCreate() {
    if (!newKeyName.trim()) {
      toast.error("Enter a name for the API key");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.key) {
        setRevealedKey(data.key);
        setShowKey(true);
        setNewKeyName("");
        toast.success("API key created. Copy it now — it won't be shown again.");
        await fetchKeys();
      } else {
        toast.error(data.error || "Failed to create API key");
      }
    } catch {
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
        toast.success("API key revoked");
      } else {
        toast.error("Failed to revoke key");
      }
    } catch {
      toast.error("Failed to revoke key");
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).then(() => toast.success("Copied to clipboard!"));
  }

  const curlExample = revealedKey
    ? `curl -X POST ${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/v1/shorten \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${revealedKey}" \\
  -d '{"originalUrl":"https://example.com"}'`
    : `curl -X POST http://localhost:3000/api/v1/shorten \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: snip_YOUR_KEY_HERE" \\
  -d '{"originalUrl":"https://example.com"}'`;

  return (
    <div className="min-h-screen bg-slate-50 grid-bg py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-100">
            <Key className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
            <p className="text-sm text-slate-500">
              Generate keys to integrate with the Snip.ly REST API
            </p>
          </div>
        </div>

        {/* Create Key */}
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Generate New Key</h2>
          <div className="flex gap-3">
            <Input
              placeholder="Key name (e.g. My App)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1"
            />
            <Button
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim()}
              className="flex items-center gap-2"
            >
              {creating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Generate
            </Button>
          </div>

          {/* Revealed key */}
          {revealedKey && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
              <p className="text-sm font-medium text-amber-800">
                Copy your API key now. It will not be shown again.
              </p>
              <div className="flex items-center gap-2 font-mono text-sm bg-white border border-amber-200 rounded-lg p-3">
                <span className="flex-1 truncate">
                  {showKey ? revealedKey : "snip_" + "•".repeat(32)}
                </span>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="text-amber-700 hover:text-amber-900"
                  title={showKey ? "Hide" : "Show"}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => copyKey(revealedKey)}
                  className="text-amber-700 hover:text-amber-900"
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Existing Keys */}
        <Card className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading keys...</div>
          ) : keys.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Key className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-slate-500 text-sm">No API keys yet. Generate one above.</p>
            </div>
          ) : (
            keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between px-6 py-4 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                    <Key className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{k.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{k.keyPrefix}••••••••••••••••••••</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <Badge variant="secondary" className="text-xs">
                      {k.lastUsedAt ? `Used ${timeAgo(k.lastUsedAt)}` : "Never used"}
                    </Badge>
                    <p className="text-xs text-slate-400 mt-1">
                      Created {timeAgo(k.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(k.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Revoke"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </Card>

        {/* cURL Example */}
        <Card className="p-6 space-y-3">
          <h2 className="font-semibold text-slate-800">REST API Usage</h2>
          <p className="text-sm text-slate-500">
            Use your API key with the{" "}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">x-api-key</code>{" "}
            header to shorten URLs programmatically.
          </p>
          <div className="relative">
            <pre className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs overflow-x-auto font-mono leading-relaxed">
              {curlExample}
            </pre>
            <button
              onClick={() => copyKey(curlExample)}
              className="absolute top-3 right-3 p-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              title="Copy example"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
