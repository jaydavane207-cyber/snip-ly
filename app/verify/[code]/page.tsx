"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function VerifyPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string) || "";
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("Please enter the password");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/links/${code}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Incorrect password");
        return;
      }

      toast.success("Access granted! Redirecting...");
      if (data.destinationUrl) {
        window.location.href = data.destinationUrl;
      } else {
        router.push(`/s/${code}`);
      }
    } catch {
      toast.error("Failed to verify password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md shadow-2xl shadow-indigo-100/60 p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Password Protected Link</h1>
          <p className="text-xs text-slate-500 mt-1">
            This short link requires a password to access
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Enter Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full justify-center"
            isLoading={isLoading}
          >
            {!isLoading && <ArrowRight className="w-4 h-4 mr-1.5" />}
            Unlock Link
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Protected by Snip.ly security
        </div>
      </Card>
    </div>
  );
}
